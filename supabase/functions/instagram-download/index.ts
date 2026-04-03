import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function decodeHtml(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/\\u0026/g, "&");
}

function jsonRes(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ── Proxy GET (branded download) ──
async function handleProxy(req: Request) {
  const qp = new URL(req.url).searchParams;
  const rawUrl = qp.get("url");
  const filename = qp.get("filename") || "MinusFlow.net_media";
  if (!rawUrl) return jsonRes({ error: "Missing url param" }, 400);

  const mediaUrl = decodeHtml(rawUrl);

  // Try with multiple header combos to avoid 403
  for (const headers of [
    { "User-Agent": UA, Referer: "https://www.instagram.com/", Origin: "https://www.instagram.com" },
    { "User-Agent": UA },
    {},
  ]) {
    try {
      const upstream = await fetch(mediaUrl, { headers, redirect: "follow" });
      if (upstream.ok) {
        const ct = upstream.headers.get("content-type") || "application/octet-stream";
        return new Response(upstream.body, {
          headers: {
            ...corsHeaders,
            "Content-Type": ct,
            "Content-Disposition": `attachment; filename="${filename}"`,
          },
        });
      }
      // consume body to avoid leak
      await upstream.text();
    } catch {
      continue;
    }
  }
  return jsonRes({ error: "Could not fetch media from Instagram CDN" }, 502);
}

// ── Shortcode extraction ──
function getShortcode(url: string): string | null {
  const m = url.match(/\/(p|reel|reels|tv)\/([A-Za-z0-9_-]+)/);
  return m?.[2] || null;
}

function getMediaType(url: string): "reel" | "post" {
  return url.includes("/reel") || url.includes("/reels") || url.includes("/tv/")
    ? "reel"
    : "post";
}

// ── Resolve shortened URLs ──
async function resolveUrl(url: string): Promise<string> {
  if (url.includes("/p/") || url.includes("/reel") || url.includes("/tv/"))
    return url;
  try {
    const r = await fetch(url, { method: "HEAD", headers: { "User-Agent": UA }, redirect: "follow" });
    return r.url || url;
  } catch {
    return url;
  }
}

// ── Method 1: Instagram embed endpoint ──
async function fetchViaEmbed(shortcode: string) {
  // The embed page often contains the video URL in a script tag
  const embedUrl = `https://www.instagram.com/p/${shortcode}/embed/captioned/`;
  const res = await fetch(embedUrl, {
    headers: {
      "User-Agent": UA,
      Accept: "text/html,application/xhtml+xml",
      "Accept-Language": "en-US,en;q=0.9",
    },
  });
  if (!res.ok) { console.log("Embed failed:", res.status); await res.text(); return null; }
  const html = await res.text();
  console.log("Embed HTML length:", html.length, "has video_url:", html.includes("video_url"), "has display_url:", html.includes("display_url"), "first 500:", html.substring(0, 500));

  const items: Array<{ type: string; url: string; thumbnail: string }> = [];

  // Extract video URL from embed
  const videoMatch =
    html.match(/"video_url"\s*:\s*"([^"]+)"/) ||
    html.match(/class="[^"]*EmbeddedMediaVideo[^"]*"[^>]*src="([^"]+)"/) ||
    html.match(/<source[^>]+src="([^"]+)"[^>]*type="video/);

  // Extract image/thumbnail
  const imgMatch =
    html.match(/"display_url"\s*:\s*"([^"]+)"/) ||
    html.match(/class="[^"]*EmbeddedMediaImage[^"]*"[^>]*src="([^"]+)"/) ||
    html.match(/<img[^>]+class="[^"]*"[^>]+src="(https:\/\/[^"]*cdninstagram[^"]+)"/);

  if (videoMatch?.[1]) {
    items.push({
      type: "video",
      url: decodeHtml(videoMatch[1]),
      thumbnail: imgMatch?.[1] ? decodeHtml(imgMatch[1]) : "",
    });
  } else if (imgMatch?.[1]) {
    items.push({
      type: "image",
      url: decodeHtml(imgMatch[1]),
      thumbnail: decodeHtml(imgMatch[1]),
    });
  }

  // Try to find multiple images (carousel)
  const allImages = [...html.matchAll(/"display_url"\s*:\s*"([^"]+)"/g)];
  const allVideos = [...html.matchAll(/"video_url"\s*:\s*"([^"]+)"/g)];

  if (allImages.length > 1 || allVideos.length > 1) {
    items.length = 0; // reset
    const seen = new Set<string>();
    for (const v of allVideos) {
      const u = decodeHtml(v[1]);
      if (!seen.has(u)) { seen.add(u); items.push({ type: "video", url: u, thumbnail: "" }); }
    }
    // Add images that don't have a corresponding video
    for (const img of allImages) {
      const u = decodeHtml(img[1]);
      if (!seen.has(u)) { seen.add(u); items.push({ type: "image", url: u, thumbnail: u }); }
    }
  }

  // Extract author
  const authorMatch =
    html.match(/"username"\s*:\s*"([^"]+)"/) ||
    html.match(/data-author="([^"]+)"/) ||
    html.match(/@([A-Za-z0-9_.]+)/);

  // Extract caption
  const captionMatch = html.match(/"caption"\s*:\s*\{[^}]*"text"\s*:\s*"([^"]{0,200})"/);

  if (items.length > 0) {
    return {
      success: true,
      media_count: items.length,
      items,
      author: authorMatch?.[1] || "",
      caption: captionMatch?.[1] || "",
    };
  }
  return null;
}

// ── Method 2: Page HTML og: tags ──
async function fetchViaPageHTML(shortcode: string, urlHint: string) {
  const pageUrl = `https://www.instagram.com/p/${shortcode}/`;
  const res = await fetch(pageUrl, {
    headers: {
      "User-Agent": UA,
      Accept: "text/html",
      "Accept-Language": "en-US,en;q=0.5",
    },
  });
  if (!res.ok) { await res.text(); return null; }
  const html = await res.text();

  const items: Array<{ type: string; url: string; thumbnail: string }> = [];

  // Check og:video first
  const ogVideo = html.match(/property="og:video(?::secure_url)?"\s+content="([^"]+)"/);
  const ogImage = html.match(/property="og:image"\s+content="([^"]+)"/);

  // Determine type from URL pattern or og:type
  const ogType = html.match(/property="og:type"\s+content="([^"]+)"/)?.[1] || "";
  const isVideoType =
    ogType.includes("video") ||
    urlHint.includes("/reel") ||
    urlHint.includes("/tv/") ||
    !!ogVideo?.[1];

  if (ogVideo?.[1]) {
    items.push({
      type: "video",
      url: decodeHtml(ogVideo[1]),
      thumbnail: ogImage?.[1] ? decodeHtml(ogImage[1]) : "",
    });
  } else if (ogImage?.[1]) {
    items.push({
      type: isVideoType ? "video" : "image",
      url: decodeHtml(ogImage[1]),
      thumbnail: decodeHtml(ogImage[1]),
    });
  }

  if (items.length === 0) return null;

  const authorMatch = html.match(/property="og:description"\s+content="[^"]*@([A-Za-z0-9_.]+)/);
  return {
    success: true,
    media_count: items.length,
    items,
    author: authorMatch?.[1] || "",
    caption: "",
  };
}

// ── Method 3: oEmbed ──
async function fetchViaOEmbed(url: string) {
  try {
    const res = await fetch(
      `https://api.instagram.com/oembed/?url=${encodeURIComponent(url)}`,
      { headers: { "User-Agent": UA } }
    );
    if (!res.ok) { await res.text(); return null; }
    const data = await res.json();
    if (data.thumbnail_url) {
      return {
        success: true,
        media_count: 1,
        items: [{ type: "image", url: data.thumbnail_url, thumbnail: data.thumbnail_url }],
        author: data.author_name || "",
        caption: data.title || "",
      };
    }
  } catch {}
  return null;
}

// ── Main ──
Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  if (req.method === "GET" || req.method === "HEAD") return handleProxy(req);

  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string")
      return jsonRes({ error: "Missing or invalid URL" }, 400);
    if (!url.includes("instagram.com") && !url.includes("instagr.am"))
      return jsonRes({ error: "Please provide a valid Instagram URL" }, 400);

    const resolved = await resolveUrl(url);
    const shortcode = getShortcode(resolved);
    if (!shortcode)
      return jsonRes({ error: "Could not extract post ID. Use a direct post/reel link." }, 400);

    // Try embed first (best for video extraction)
    let result = await fetchViaEmbed(shortcode);
    if (!result) result = await fetchViaPageHTML(shortcode, resolved);
    if (!result) result = await fetchViaOEmbed(resolved);

    if (!result)
      return jsonRes({ error: "Could not extract media. The post may be private or login-required." }, 404);

    return jsonRes(result);
  } catch (err) {
    return jsonRes({ error: (err as Error).message || "Internal server error" }, 500);
  }
});
