import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

/** Scrape getfvid.com to extract Facebook video download links */
async function fetchFacebookVideo(videoUrl: string) {
  // Step 1: Get the page to extract any tokens
  const pageRes = await fetch("https://www.getfvid.com/", {
    headers: { "User-Agent": UA, Accept: "text/html" },
  });
  const pageHtml = await pageRes.text();

  // Extract CSRF token
  const tokenMatch = pageHtml.match(
    /name="_token"\s+value="([^"]+)"/
  );
  const token = tokenMatch?.[1] || "";

  // Extract cookies
  const cookies = pageRes.headers
    .getSetCookie?.()
    ?.map((c: string) => c.split(";")[0])
    .join("; ") || "";

  // Step 2: Submit the form
  const formData = new URLSearchParams({
    _token: token,
    url: videoUrl,
  });

  const res = await fetch("https://www.getfvid.com/downloader", {
    method: "POST",
    headers: {
      "User-Agent": UA,
      "Content-Type": "application/x-www-form-urlencoded",
      Origin: "https://www.getfvid.com",
      Referer: "https://www.getfvid.com/",
      Cookie: cookies,
      Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    },
    body: formData.toString(),
    redirect: "follow",
  });

  const html = await res.text();
  return parseGetfvidResponse(html);
}

function parseGetfvidResponse(html: string) {
  const links: { quality: string; url: string }[] = [];

  // Extract HD link
  const hdMatch = html.match(
    /href="(https?:\/\/[^"]+)"[^>]*>.*?Download in HD/si
  ) || html.match(
    /class="[^"]*btn-download[^"]*"[^>]*href="(https?:\/\/[^"]+)"[^>]*>.*?HD/si
  );
  if (hdMatch?.[1]) {
    links.push({ quality: "HD", url: hdMatch[1] });
  }

  // Extract SD / Normal link
  const sdMatch = html.match(
    /href="(https?:\/\/[^"]+)"[^>]*>.*?Download in (?:Normal|SD)/si
  ) || html.match(
    /class="[^"]*btn-download[^"]*"[^>]*href="(https?:\/\/[^"]+)"[^>]*>.*?(?:Normal|SD)/si
  );
  if (sdMatch?.[1] && sdMatch[1] !== hdMatch?.[1]) {
    links.push({ quality: "SD", url: sdMatch[1] });
  }

  // Fallback: grab all download-looking links
  if (links.length === 0) {
    const allLinks = [
      ...html.matchAll(/href="(https?:\/\/[^"]*(?:video|\.mp4|fbcdn)[^"]*)"/gi),
    ];
    const seen = new Set<string>();
    for (const m of allLinks) {
      const url = m[1];
      if (!seen.has(url) && !url.includes("getfvid.com")) {
        seen.add(url);
        links.push({ quality: links.length === 0 ? "HD" : "SD", url });
      }
      if (links.length >= 2) break;
    }
  }

  // Extract title
  const titleMatch = html.match(
    /<h5[^>]*class="[^"]*card-title[^"]*"[^>]*>(.*?)<\/h5>/si
  ) || html.match(/<title[^>]*>(.*?)<\/title>/si);
  const title = titleMatch?.[1]
    ?.replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200) || "Facebook Video";

  // Extract thumbnail
  const thumbMatch = html.match(
    /<img[^>]*class="[^"]*card-img[^"]*"[^>]*src="(https?:\/\/[^"]+)"/si
  ) || html.match(
    /og:image[^>]*content="(https?:\/\/[^"]+)"/si
  );
  const thumbnail = thumbMatch?.[1] || "";

  return { title, thumbnail, links };
}

/** Alternative: try snapsave.app as fallback */
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
    const filename =
      reqUrl.searchParams.get("filename") || "MinusFlow.net_facebook_video.mp4";
    if (!mediaUrl) {
      return new Response(JSON.stringify({ error: "Missing url param" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    try {
      const upstream = await fetch(mediaUrl, {
        headers: { "User-Agent": UA },
      });
      if (!upstream.ok) {
        return new Response(
          JSON.stringify({ error: "Upstream fetch failed" }),
          {
            status: upstream.status,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const ct =
        upstream.headers.get("content-type") || "application/octet-stream";
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
      return new Response(
        JSON.stringify({ error: "Missing or invalid URL" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Validate Facebook URL
    const isFacebook =
      url.includes("facebook.com") ||
      url.includes("fb.com") ||
      url.includes("fb.watch") ||
      url.includes("fbwat.ch");

    if (!isFacebook) {
      return new Response(
        JSON.stringify({ error: "Please provide a valid Facebook video URL" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    // Try primary method
    let result = await fetchFacebookVideo(url);

    // Fallback to snapsave if no links found
    if (!result.links.length) {
      const fallback = await fetchViaSnapsave(url);
      if (fallback && fallback.links.length) {
        result = fallback;
      }
    }

    if (!result.links.length) {
      return new Response(
        JSON.stringify({
          error:
            "Could not extract download links. The video may be private, deleted, or region-locked.",
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        title: result.title,
        thumbnail: result.thumbnail,
        download_links: result.links.map((l) => ({
          quality: l.quality,
          url: l.url,
          format: "mp4",
        })),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
