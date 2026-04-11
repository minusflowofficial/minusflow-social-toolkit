import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

/** Primary: fbdown.to API */
async function fetchViaFbdown(videoUrl: string) {
  // Step 1: Get tokens from homepage
  const pageRes = await fetch("https://fbdown.to/", {
    headers: { "User-Agent": UA, Accept: "text/html" },
  });
  const pageHtml = await pageRes.text();

  const expMatch = pageHtml.match(/k_exp\s*=\s*["']?(\d+)["']?/);
  const tokenMatch = pageHtml.match(/k_token\s*=\s*["']([a-f0-9]+)["']/);

  if (!expMatch?.[1] || !tokenMatch?.[1]) {
    return null;
  }

  const k_exp = expMatch[1];
  const k_token = tokenMatch[1];

  // Step 2: Call the download API
  const body = new URLSearchParams({
    k_exp,
    k_token,
    p: "home",
    q: videoUrl,
    lang: "en",
    v: "v2",
    w: "",
  });

  const res = await fetch("https://fbdown.to/api/ajaxSearch", {
    method: "POST",
    headers: {
      "User-Agent": UA,
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "X-Requested-With": "XMLHttpRequest",
      Origin: "https://fbdown.to",
      Referer: "https://fbdown.to/",
    },
    body: body.toString(),
  });

  const json = await res.json();
  if (json.status !== "ok" || !json.data) return null;

  const html = json.data as string;
  const links: { quality: string; url: string }[] = [];

  // Parse table rows for download links
  const rows = [...html.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)];
  for (const row of rows) {
    const rowHtml = row[1];
    const qualityMatch = rowHtml.match(/<td[^>]*class="[^"]*video-quality[^"]*"[^>]*>(.*?)<\/td>/si)
      || rowHtml.match(/<td[^>]*>(.*?)<\/td>/si);
    const linkMatch = rowHtml.match(/href="(https?:\/\/[^"]+)"[^>]*class="[^"]*download-link[^"]*"/si)
      || rowHtml.match(/href="(https?:\/\/[^"]+)"/si);

    if (qualityMatch?.[1] && linkMatch?.[1]) {
      const quality = qualityMatch[1].replace(/<[^>]+>/g, "").trim();
      const url = linkMatch[1];
      if (url.includes("fbcdn") || url.includes("video") || url.includes("mp4") || url.startsWith("https://")) {
        links.push({ quality: quality || (links.length === 0 ? "HD" : "SD"), url });
      }
    }
  }

  // Fallback: extract any download links from buttons/anchors
  if (links.length === 0) {
    const allAnchors = [...html.matchAll(/href="(https?:\/\/[^"]*(?:fbcdn|video|\.mp4)[^"]*)"/gi)];
    const seen = new Set<string>();
    for (const m of allAnchors) {
      if (!seen.has(m[1]) && !m[1].includes("fbdown.to")) {
        seen.add(m[1]);
        links.push({ quality: links.length === 0 ? "HD" : "SD", url: m[1] });
      }
      if (links.length >= 3) break;
    }
  }

  // Extract thumbnail
  const thumbMatch = html.match(/<img[^>]*src="(https?:\/\/[^"]+)"/i);
  const thumbnail = json.thumbnail || thumbMatch?.[1] || "";

  // Extract title
  const titleMatch = html.match(/<h3[^>]*>(.*?)<\/h3>/si)
    || html.match(/<p[^>]*class="[^"]*title[^"]*"[^>]*>(.*?)<\/p>/si);
  const title = (json.title || titleMatch?.[1] || "Facebook Video")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);

  return { title, thumbnail, links };
}

/** Fallback 1: getfvid.com */
async function fetchViaGetfvid(videoUrl: string) {
  const pageRes = await fetch("https://www.getfvid.com/", {
    headers: { "User-Agent": UA, Accept: "text/html" },
  });
  const pageHtml = await pageRes.text();
  const tokenMatch = pageHtml.match(/name="_token"\s+value="([^"]+)"/);
  const token = tokenMatch?.[1] || "";
  const cookies = pageRes.headers
    .getSetCookie?.()
    ?.map((c: string) => c.split(";")[0])
    .join("; ") || "";

  const res = await fetch("https://www.getfvid.com/downloader", {
    method: "POST",
    headers: {
      "User-Agent": UA,
      "Content-Type": "application/x-www-form-urlencoded",
      Origin: "https://www.getfvid.com",
      Referer: "https://www.getfvid.com/",
      Cookie: cookies,
    },
    body: new URLSearchParams({ _token: token, url: videoUrl }).toString(),
    redirect: "follow",
  });

  const html = await res.text();
  const links: { quality: string; url: string }[] = [];

  const hdMatch = html.match(/href="(https?:\/\/[^"]+)"[^>]*>.*?Download in HD/si);
  if (hdMatch?.[1]) links.push({ quality: "HD", url: hdMatch[1] });

  const sdMatch = html.match(/href="(https?:\/\/[^"]+)"[^>]*>.*?Download in (?:Normal|SD)/si);
  if (sdMatch?.[1] && sdMatch[1] !== hdMatch?.[1]) links.push({ quality: "SD", url: sdMatch[1] });

  if (links.length === 0) {
    const allLinks = [...html.matchAll(/href="(https?:\/\/[^"]*(?:video|\.mp4|fbcdn)[^"]*)"/gi)];
    const seen = new Set<string>();
    for (const m of allLinks) {
      if (!seen.has(m[1]) && !m[1].includes("getfvid.com")) {
        seen.add(m[1]);
        links.push({ quality: links.length === 0 ? "HD" : "SD", url: m[1] });
      }
      if (links.length >= 2) break;
    }
  }

  const titleMatch = html.match(/<h5[^>]*class="[^"]*card-title[^"]*"[^>]*>(.*?)<\/h5>/si);
  const title = titleMatch?.[1]?.replace(/<[^>]+>/g, "").trim().slice(0, 200) || "Facebook Video";
  const thumbMatch = html.match(/<img[^>]*class="[^"]*card-img[^"]*"[^>]*src="(https?:\/\/[^"]+)"/si);
  const thumbnail = thumbMatch?.[1] || "";

  return { title, thumbnail, links };
}

/** Fallback 2: snapsave.app */
async function fetchViaSnapsave(videoUrl: string) {
  try {
    const res = await fetch("https://www.snapsave.app/action.php?lang=en", {
      method: "POST",
      headers: {
        "User-Agent": UA,
        "Content-Type": "application/x-www-form-urlencoded",
        Origin: "https://www.snapsave.app",
        Referer: "https://www.snapsave.app/",
      },
      body: new URLSearchParams({ url: videoUrl }).toString(),
    });
    const html = await res.text();
    const links: { quality: string; url: string }[] = [];
    const matches = [...html.matchAll(/href="(https?:\/\/[^"]*(?:\.mp4|video|fbcdn)[^"]*)"/gi)];
    const seen = new Set<string>();
    for (const m of matches) {
      if (!seen.has(m[1])) {
        seen.add(m[1]);
        links.push({ quality: links.length === 0 ? "HD" : "SD", url: m[1] });
      }
      if (links.length >= 2) break;
    }
    const titleMatch = html.match(/<span[^>]*class="[^"]*title[^"]*"[^>]*>(.*?)<\/span>/si);
    const title = titleMatch?.[1]?.replace(/<[^>]+>/g, "").trim() || "Facebook Video";
    return { title, thumbnail: "", links };
  } catch {
    return null;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const reqUrl = new URL(req.url);

  // GET → proxy media with branded filename
  if (req.method === "GET" || req.method === "HEAD") {
    const mediaUrl = reqUrl.searchParams.get("url");
    const filename = reqUrl.searchParams.get("filename") || "MinusFlow.net_facebook_video.mp4";
    if (!mediaUrl) {
      return new Response(JSON.stringify({ error: "Missing url param" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    try {
      const upstream = await fetch(mediaUrl, { headers: { "User-Agent": UA } });
      if (!upstream.ok) {
        return new Response(JSON.stringify({ error: "Upstream fetch failed" }), {
          status: upstream.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const ct = upstream.headers.get("content-type") || "application/octet-stream";
      return new Response(upstream.body, {
        headers: {
          ...corsHeaders,
          "Content-Type": ct,
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    } catch (e) {
      return new Response(JSON.stringify({ error: e.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  }

  // POST → fetch video info
  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ error: "Missing or invalid URL" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const isFacebook = url.includes("facebook.com") || url.includes("fb.com") || url.includes("fb.watch") || url.includes("fbwat.ch");
    if (!isFacebook) {
      return new Response(JSON.stringify({ error: "Please provide a valid Facebook video URL" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Try fbdown.to first (primary)
    let result = await fetchViaFbdown(url).catch(() => null);

    // Fallback to getfvid
    if (!result || !result.links.length) {
      result = await fetchViaGetfvid(url).catch(() => ({ title: "Facebook Video", thumbnail: "", links: [] }));
    }

    // Fallback to snapsave
    if (!result || !result.links.length) {
      const snap = await fetchViaSnapsave(url);
      if (snap && snap.links.length) result = snap;
    }

    if (!result || !result.links.length) {
      return new Response(
        JSON.stringify({ error: "Could not extract download links. The video may be private, deleted, or region-locked." }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        title: result.title,
        thumbnail: result.thumbnail,
        download_links: result.links.map((l) => ({ quality: l.quality, url: l.url, format: "mp4" })),
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message || "Internal server error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
