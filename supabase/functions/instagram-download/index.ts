import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function decodeHtml(s: string): string {
  return s.replace(/&amp;/g, "&").replace(/\\u0026/g, "&").replace(/\\u002F/g, "/");
}

function jsonRes(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status, headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ── Proxy GET (branded download) ──
async function handleProxy(req: Request) {
  const qp = new URL(req.url).searchParams;
  const rawUrl = qp.get("url");
  const filename = qp.get("filename") || "MinusFlow.net_media";
  if (!rawUrl) return jsonRes({ error: "Missing url param" }, 400);
  const mediaUrl = decodeHtml(rawUrl);

  for (const hdrs of [
    { "User-Agent": UA, Referer: "https://www.instagram.com/" },
    { "User-Agent": UA },
  ]) {
    try {
      const up = await fetch(mediaUrl, { headers: hdrs, redirect: "follow" });
      if (up.ok) {
        const ct = up.headers.get("content-type") || "application/octet-stream";
        return new Response(up.body, {
          headers: { ...corsHeaders, "Content-Type": ct, "Content-Disposition": `attachment; filename="${filename}"` },
        });
      }
      await up.text();
    } catch { continue; }
  }
  return jsonRes({ error: "Could not fetch media from CDN" }, 502);
}

// ── URL helpers ──
function getShortcode(url: string): string | null {
  return url.match(/\/(p|reel|reels|tv)\/([A-Za-z0-9_-]+)/)?.[2] || null;
}

function isReelUrl(url: string): boolean {
  return /\/(reel|reels|tv)\//.test(url);
}

async function resolveUrl(url: string): Promise<string> {
  if (/\/(p|reel|reels|tv)\//.test(url)) return url;
  try {
    const r = await fetch(url, { method: "HEAD", headers: { "User-Agent": UA }, redirect: "follow" });
    return r.url || url;
  } catch { return url; }
}

// ── Primary: i.instagram.com oEmbed (reliable, returns thumbnail + metadata) ──
async function fetchViaOEmbed(url: string, isReel: boolean) {
  const canonicalUrl = url.replace(/\?.*$/, "");
  const oembedUrl = `https://i.instagram.com/api/v1/oembed/?url=${encodeURIComponent(canonicalUrl)}`;

  const res = await fetch(oembedUrl, { headers: { "User-Agent": UA } });
  if (!res.ok) { await res.text(); return null; }
  const d = await res.json();

  if (!d.thumbnail_url) return null;

  // Determine type from URL pattern and oEmbed html content
  const htmlContent = d.html || "";
  const isVideo = isReel || htmlContent.includes("/reel/") || htmlContent.includes("video");

  return {
    success: true,
    media_count: 1,
    items: [{
      type: isVideo ? "video" : "image",
      url: d.thumbnail_url,
      thumbnail: d.thumbnail_url,
    }],
    author: d.author_name || "",
    caption: d.title || "",
  };
}

// ── Fallback: og:image from main page ──
async function fetchViaOgTags(shortcode: string, isReel: boolean) {
  const urls = [`https://www.instagram.com/p/${shortcode}/`];
  if (isReel) urls.push(`https://www.instagram.com/reel/${shortcode}/`);

  for (const pageUrl of urls) {
    const res = await fetch(pageUrl, {
      headers: { "User-Agent": UA, Accept: "text/html", "Sec-Fetch-Mode": "navigate" },
    });
    if (!res.ok) { await res.text(); continue; }
    const html = await res.text();

    const ogVideo = html.match(/property="og:video(?::secure_url)?"\s+content="([^"]+)"/);
    const ogImage = html.match(/property="og:image"\s+content="([^"]+)"/);
    if (!ogVideo && !ogImage) continue;

    const typeIsVideo = isReel || !!ogVideo;
    const items = [];
    if (ogVideo?.[1]) {
      items.push({ type: "video", url: decodeHtml(ogVideo[1]), thumbnail: ogImage?.[1] ? decodeHtml(ogImage[1]) : "" });
    } else if (ogImage?.[1]) {
      items.push({ type: typeIsVideo ? "video" : "image", url: decodeHtml(ogImage[1]), thumbnail: decodeHtml(ogImage[1]) });
    }
    if (items.length === 0) continue;

    const authorMatch = html.match(/@([A-Za-z0-9_.]+)/);
    return { success: true, media_count: items.length, items, author: authorMatch?.[1] || "", caption: "" };
  }
  return null;
}

// ── Main ──
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method === "GET" || req.method === "HEAD") return handleProxy(req);

  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") return jsonRes({ error: "Missing or invalid URL" }, 400);
    if (!url.includes("instagram.com") && !url.includes("instagr.am"))
      return jsonRes({ error: "Please provide a valid Instagram URL" }, 400);

    const resolved = await resolveUrl(url);
    const shortcode = getShortcode(resolved);
    if (!shortcode)
      return jsonRes({ error: "Could not extract post ID. Use a direct post/reel link." }, 400);

    const reel = isReelUrl(resolved);

    let result = await fetchViaOEmbed(resolved, reel);
    if (!result) result = await fetchViaOgTags(shortcode, reel);

    if (!result)
      return jsonRes({ error: "Could not extract media. The post may be private or login-required." }, 404);

    return jsonRes(result);
  } catch (err) {
    return jsonRes({ error: (err as Error).message || "Internal server error" }, 500);
  }
});
