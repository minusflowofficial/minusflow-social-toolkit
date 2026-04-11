import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

/** Fetch video info from savetik.co */
async function fetchViaSavetik(videoUrl: string) {
  const res = await fetch("https://savetik.co/api/ajaxSearch", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded; charset=UTF-8",
      "X-Requested-With": "XMLHttpRequest",
      Referer: "https://savetik.co/en/douyin-downloader",
      Origin: "https://savetik.co",
      "User-Agent": UA,
    },
    body: new URLSearchParams({ q: videoUrl, lang: "en", cftoken: "" }).toString(),
  });

  const json = await res.json();
  if (json.status !== "ok" || !json.data) {
    return null;
  }

  const html = json.data as string;

  // Extract title
  const titleMatch =
    html.match(/<h3[^>]*>(.*?)<\/h3>/si) ||
    html.match(/<p[^>]*class="[^"]*title[^"]*"[^>]*>(.*?)<\/p>/si) ||
    html.match(/<span[^>]*class="[^"]*name[^"]*"[^>]*>(.*?)<\/span>/si);
  const title = (titleMatch?.[1] || "Douyin Video")
    .replace(/<[^>]+>/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 200);

  // Extract thumbnail
  const thumbMatch = html.match(/<img[^>]*src="(https?:\/\/[^"]+)"/i);
  const thumbnail = thumbMatch?.[1] || "";

  // Extract download links — only CDN links, not savetik.co itself
  const links: { quality: string; url: string }[] = [];
  const anchorMatches = [...html.matchAll(/<a[^>]*href="(https?:\/\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/gi)];

  for (const m of anchorMatches) {
    const href = m[1];
    // Clean label: strip HTML, decode &nbsp; entities, collapse whitespace
    const label = m[2]
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/gi, " ")
      .replace(/\s+/g, " ")
      .trim();

    // Skip savetik.co links, empty hrefs, and irrelevant links
    if (href.includes("savetik.co") || href === "#" || href === "") continue;

    const lowerLabel = label.toLowerCase();

    // Skip non-download links (profile links, social links, etc.)
    if (lowerLabel.includes("profile") || lowerLabel.includes("tiktok profile")) continue;
    if (!lowerLabel.includes("download") && !lowerLabel.includes("mp4") && !lowerLabel.includes("mp3")) continue;

    // Accept CDN links
    if (
      href.includes("snapcdn") ||
      href.includes("tikcdn") ||
      href.includes(".mp4") ||
      href.includes(".mp3") ||
      href.includes("cdn") ||
      href.startsWith("https://")
    ) {
      // Assign clean quality labels
      let quality = "SD";
      if (lowerLabel.includes("hd")) quality = "HD";
      else if (lowerLabel.includes("mp3")) quality = "MP3";
      else if (lowerLabel.includes("mp4") && lowerLabel.includes("[1]")) quality = "MP4";
      else if (lowerLabel.includes("mp4")) quality = links.length === 0 ? "MP4 HD" : "MP4 SD";

      links.push({ quality, url: href });
    }
  }

  // Fallback: grab any CDN-like URLs via regex
  if (links.length === 0) {
    const cdnMatches = [
      ...html.matchAll(/href="(https?:\/\/(?:dl\.snapcdn\.app|tikcdn\.io)[^"]*)"/gi),
    ];
    const seen = new Set<string>();
    for (const m of cdnMatches) {
      if (!seen.has(m[1])) {
        seen.add(m[1]);
        links.push({ quality: links.length === 0 ? "HD" : "SD", url: m[1] });
      }
    }
  }

  return { title, thumbnail, links };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const reqUrl = new URL(req.url);

  // GET → proxy media with branded filename
  if (req.method === "GET" || req.method === "HEAD") {
    const mediaUrl = reqUrl.searchParams.get("url");
    const filename = reqUrl.searchParams.get("filename") || "MinusFlow.net_douyin_video.mp4";
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

    const isDouyin =
      url.includes("douyin.com") ||
      url.includes("iesdouyin.com") ||
      url.includes("tiktok.com");
    if (!isDouyin) {
      return new Response(
        JSON.stringify({ error: "Please provide a valid Douyin or TikTok video URL" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await fetchViaSavetik(url).catch(() => null);

    if (!result || !result.links.length) {
      return new Response(
        JSON.stringify({
          error: "Could not extract download links. The video may be private, deleted, or region-locked.",
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
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
          format: l.quality.toLowerCase().includes("mp3") ? "mp3" : "mp4",
        })),
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
