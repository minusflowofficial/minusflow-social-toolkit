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
    .replace(/\\u0026/g, "&")
    .replace(/\\u002F/g, "/");
}

function jsonRes(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ── Proxy GET ──
async function handleProxy(req: Request) {
  const qp = new URL(req.url).searchParams;
  const rawUrl = qp.get("url");
  const filename = qp.get("filename") || "MinusFlow.net_media";
  if (!rawUrl) return jsonRes({ error: "Missing url param" }, 400);

  const mediaUrl = decodeHtml(rawUrl);

  for (const hdrs of [
    { "User-Agent": UA, Referer: "https://www.instagram.com/", Origin: "https://www.instagram.com" },
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
  const m = url.match(/\/(p|reel|reels|tv)\/([A-Za-z0-9_-]+)/);
  return m?.[2] || null;
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

// ── Scrape embed page (extract data from JS in <script> tags) ──
async function fetchViaEmbed(shortcode: string, isReel: boolean) {
  // Try both /p/ and /reel/ embed paths
  const paths = isReel
    ? [`https://www.instagram.com/reel/${shortcode}/embed/captioned/`, `https://www.instagram.com/p/${shortcode}/embed/captioned/`]
    : [`https://www.instagram.com/p/${shortcode}/embed/captioned/`];

  for (const embedUrl of paths) {
    const res = await fetch(embedUrl, {
      headers: { "User-Agent": UA, Accept: "text/html", "Accept-Language": "en-US,en;q=0.9" },
    });
    if (!res.ok) { await res.text(); continue; }
    const html = await res.text();

    const items: Array<{ type: string; url: string; thumbnail: string }> = [];
    let author = "";
    let caption = "";

    // Strategy 1: Find JSON in script tags containing media data
    // Instagram embeds sometimes include "gql_data" or "shortcode_media" in script blocks
    const scriptBlocks = [...html.matchAll(/<script[^>]*>([\s\S]*?)<\/script>/gi)].map(m => m[1]);

    for (const script of scriptBlocks) {
      // Look for embedded JSON with video/image data
      if (script.includes("video_url") || script.includes("display_url") || script.includes("shortcode_media")) {
        // Try to extract video_url
        const vids = [...script.matchAll(/"video_url"\s*:\s*"([^"]+)"/g)];
        const imgs = [...script.matchAll(/"display_url"\s*:\s*"([^"]+)"/g)];

        for (const v of vids) items.push({ type: "video", url: decodeHtml(v[1]), thumbnail: "" });
        for (const img of imgs) {
          const u = decodeHtml(img[1]);
          if (!items.some(i => i.url === u)) {
            // If we already found videos, this is a thumbnail; otherwise it's an image
            if (items.length > 0 && items[0].type === "video" && !items[0].thumbnail) {
              items[0].thumbnail = u;
            } else if (!items.some(i => i.type === "video")) {
              items.push({ type: "image", url: u, thumbnail: u });
            }
          }
        }

        const am = script.match(/"username"\s*:\s*"([^"]+)"/);
        if (am) author = am[1];
        const cm = script.match(/"text"\s*:\s*"([^"]{0,200})"/);
        if (cm) caption = cm[1];
      }
    }

    // Strategy 2: Look for video/image in the embed HTML structure
    if (items.length === 0) {
      const vidSrc = html.match(/<video[^>]+src="([^"]+)"/);
      if (vidSrc) items.push({ type: "video", url: decodeHtml(vidSrc[1]), thumbnail: "" });

      const imgSrc = html.match(/<img[^>]+src="(https:\/\/[^"]*(?:cdninstagram|scontent)[^"]+)"/);
      if (imgSrc && items.length === 0) {
        items.push({ type: isReel ? "video" : "image", url: decodeHtml(imgSrc[1]), thumbnail: decodeHtml(imgSrc[1]) });
      } else if (imgSrc && items.length > 0 && !items[0].thumbnail) {
        items[0].thumbnail = decodeHtml(imgSrc[1]);
      }
    }

    // Strategy 3: Search for any cdninstagram/scontent URLs in the whole page
    if (items.length === 0) {
      const allMedia = [...html.matchAll(/(https?:\/\/(?:scontent|video)[^"'\s\\]*(?:cdninstagram|fbcdn)[^"'\s\\]*\.(?:mp4|jpg|png|webp)[^"'\s\\]*)/g)];
      const seen = new Set<string>();
      for (const m of allMedia) {
        const u = decodeHtml(m[1]);
        if (!seen.has(u)) {
          seen.add(u);
          const isVid = u.includes(".mp4") || u.includes("video");
          items.push({ type: isVid ? "video" : "image", url: u, thumbnail: isVid ? "" : u });
        }
      }
    }

    if (!author) {
      const am = html.match(/"username"\s*:\s*"([^"]+)"/) || html.match(/@([A-Za-z0-9_.]+)/);
      if (am) author = am[1];
    }

    if (items.length > 0) {
      return { success: true, media_count: items.length, items, author, caption };
    }
  }

  return null;
}

// ── Scrape main page og: tags (fallback) ──
async function fetchViaOgTags(shortcode: string, isReel: boolean) {
  // Always try /p/ first since it has og:tags even for reels
  const urlsToTry = [
    `https://www.instagram.com/p/${shortcode}/`,
    ...(isReel ? [`https://www.instagram.com/reel/${shortcode}/`] : []),
  ];

  for (const pageUrl of urlsToTry) {
    const res = await fetch(pageUrl, {
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
        "Sec-Fetch-Mode": "navigate",
        "Sec-Fetch-Site": "none",
      },
    });
    if (!res.ok) { await res.text(); continue; }
    const html = await res.text();

    const items: Array<{ type: string; url: string; thumbnail: string }> = [];

    const ogVideo = html.match(/property="og:video(?::secure_url)?"\s+content="([^"]+)"/);
    const ogImage = html.match(/property="og:image"\s+content="([^"]+)"/);
    const ogType = html.match(/property="og:type"\s+content="([^"]+)"/)?.[1] || "";

    const typeIsVideo = isReel || ogType.includes("video") || !!ogVideo?.[1];

    if (ogVideo?.[1]) {
      items.push({ type: "video", url: decodeHtml(ogVideo[1]), thumbnail: ogImage?.[1] ? decodeHtml(ogImage[1]) : "" });
    } else if (ogImage?.[1]) {
      items.push({ type: typeIsVideo ? "video" : "image", url: decodeHtml(ogImage[1]), thumbnail: decodeHtml(ogImage[1]) });
    }

    if (items.length === 0) continue;

    const authorMatch = html.match(/property="og:description"\s+content="[^"]*@([A-Za-z0-9_.]+)/);
    return {
      success: true,
      media_count: items.length,
      items,
      author: authorMatch?.[1] || "",
      caption: "",
    };
  }
  return null;
}

// ── oEmbed (last resort) ──
async function fetchViaOEmbed(url: string) {
  try {
    const res = await fetch(`https://api.instagram.com/oembed/?url=${encodeURIComponent(url)}`, { headers: { "User-Agent": UA } });
    if (!res.ok) { await res.text(); return null; }
    const d = await res.json();
    if (d.thumbnail_url) {
      return {
        success: true,
        media_count: 1,
        items: [{ type: "image", url: d.thumbnail_url, thumbnail: d.thumbnail_url }],
        author: d.author_name || "",
        caption: d.title || "",
      };
    }
  } catch {}
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

    let result = await fetchViaEmbed(shortcode, reel);
    if (!result) result = await fetchViaOgTags(shortcode, reel);
    if (!result) result = await fetchViaOEmbed(resolved);

    if (!result)
      return jsonRes({ error: "Could not extract media. The post may be private or login-required." }, 404);

    return jsonRes(result);
  } catch (err) {
    return jsonRes({ error: (err as Error).message || "Internal server error" }, 500);
  }
});
