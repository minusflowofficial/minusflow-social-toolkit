import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/144.0.0.0 Safari/537.36";

const BASE = "https://snapdownloader.com/tools/instagram-reels-downloader";

// Simple in-memory rate limiter: 5 req/min per IP
const ipHits = new Map<string, number[]>();
function rateLimited(ip: string): boolean {
  const now = Date.now();
  const window = 60_000;
  let hits = ipHits.get(ip) || [];
  hits = hits.filter((t) => now - t < window);
  if (hits.length >= 5) {
    ipHits.set(ip, hits);
    return true;
  }
  hits.push(now);
  ipHits.set(ip, hits);
  return false;
}

function jsonRes(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function extractCookies(headers: Headers): string {
  const cookies: string[] = [];
  for (const val of headers.getSetCookie?.() || []) {
    const pair = val.split(";")[0];
    if (pair) cookies.push(pair);
  }
  return cookies.join("; ");
}

function parseDlSection(html: string) {
  // Check for error
  const errMatch = html.match(
    /<div[^>]*class="[^"]*search-error[^"]*"[^>]*>([\s\S]*?)<\/div>/i
  );
  if (errMatch) {
    const errText = errMatch[1].replace(/<[^>]+>/g, "").trim();
    return { success: false, error: errText || "Unknown error from provider" };
  }

  // Find dlsection
  const dlMatch = html.match(
    /<div[^>]*id="dlsection"[^>]*>([\s\S]*?)<\/div>\s*(?:<\/div>|$)/i
  );
  if (!dlMatch) {
    // Try broader match
    const broadMatch = html.match(/id="dlsection"([\s\S]*?)(?:<div class="footer|<footer|$)/i);
    if (!broadMatch) {
      return { success: false, error: "No download section found. The reel may be private." };
    }
    return parseLinks(broadMatch[1], html);
  }
  return parseLinks(dlMatch[1], html);
}

function parseLinks(section: string, fullHtml: string) {
  const links: { quality: string; url: string; format: string }[] = [];

  // Match all anchor tags with CDN URLs
  const anchorRegex = /<a[^>]*href="([^"]*(?:cdninstagram|fbcdn|scontent)[^"]*)"[^>]*>([\s\S]*?)<\/a>/gi;
  let m;
  while ((m = anchorRegex.exec(section)) !== null) {
    const url = m[1].replace(/&amp;/g, "&");
    const text = m[2].replace(/<[^>]+>/g, "").trim();
    // Try to find quality info
    const qualMatch = text.match(/(\d{3,4}p)/i);
    const quality = qualMatch ? qualMatch[1] : "HD";
    links.push({ quality, url, format: "mp4" });
  }

  // Fallback: find any CDN URLs in the section
  if (links.length === 0) {
    const urlRegex = /https?:\/\/[^\s"'<>]*(?:cdninstagram|fbcdn|scontent)[^\s"'<>]*/gi;
    let u;
    while ((u = urlRegex.exec(section)) !== null) {
      const url = u[0].replace(/&amp;/g, "&");
      links.push({ quality: "HD", url, format: "mp4" });
    }
  }

  // Extract thumbnail
  let thumbnail = "";
  const thumbMatch = fullHtml.match(
    /<img[^>]*src="([^"]*(?:cdninstagram|fbcdn|scontent)[^"]*)"[^>]*>/i
  );
  if (thumbMatch) thumbnail = thumbMatch[1].replace(/&amp;/g, "&");

  if (links.length === 0) {
    return { success: false, error: "Could not extract download links. The reel may be private or removed." };
  }

  // Deduplicate by URL
  const seen = new Set<string>();
  const unique = links.filter((l) => {
    if (seen.has(l.url)) return false;
    seen.add(l.url);
    return true;
  });

  return { success: true, download_links: unique, thumbnail, error: null };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method === "GET") {
    // Proxy download: stream CDN media with branded filename
    const qp = new URL(req.url).searchParams;
    const mediaUrl = qp.get("url");
    const filename = qp.get("filename") || "MinusFlow.net_reel.mp4";
    if (!mediaUrl) return jsonRes({ error: "Missing url param" }, 400);

    try {
      const up = await fetch(mediaUrl.replace(/&amp;/g, "&"), {
        headers: { "User-Agent": UA },
        redirect: "follow",
      });
      if (!up.ok) {
        await up.text();
        return jsonRes({ error: "Could not fetch media" }, 502);
      }
      const ct = up.headers.get("content-type") || "video/mp4";
      return new Response(up.body, {
        headers: {
          ...corsHeaders,
          "Content-Type": ct,
          "Content-Disposition": `attachment; filename="${filename}"`,
        },
      });
    } catch {
      return jsonRes({ error: "Proxy fetch failed" }, 502);
    }
  }

  if (req.method !== "POST") {
    return jsonRes({ error: "Method not allowed" }, 405);
  }

  // Rate limit
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  if (rateLimited(ip)) {
    return jsonRes({ success: false, error: "Rate limited. Please wait a moment." }, 429);
  }

  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return jsonRes({ success: false, error: "Missing URL" }, 400);
    }

    // Validate Instagram reel URL
    const normalized = url.trim().toLowerCase();
    if (
      !normalized.includes("instagram.com") &&
      !normalized.includes("instagr.am")
    ) {
      return jsonRes({
        success: false,
        error: "Please enter a valid Instagram Reel URL",
      }, 400);
    }

    // Step 1: Get session cookies
    const pageRes = await fetch(BASE, {
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      redirect: "follow",
    });
    const cookies = extractCookies(pageRes.headers);
    await pageRes.text(); // consume body

    if (!cookies) {
      return jsonRes({ success: false, error: "Failed to establish session" }, 502);
    }

    // Step 2: Fetch download page
    const dlUrl = `${BASE}/download?url=${encodeURIComponent(url.trim())}`;
    const dlRes = await fetch(dlUrl, {
      headers: {
        "User-Agent": UA,
        Referer: BASE,
        Cookie: cookies,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      redirect: "manual",
    });

    let finalHtml = "";

    if (dlRes.status >= 300 && dlRes.status < 400) {
      // Follow redirect manually with cookies
      const location = dlRes.headers.get("location");
      await dlRes.text(); // consume body
      const newCookies = extractCookies(dlRes.headers);
      const allCookies = newCookies ? `${cookies}; ${newCookies}` : cookies;

      const redirectUrl = location?.startsWith("http")
        ? location
        : `https://snapdownloader.com${location}`;

      const followRes = await fetch(redirectUrl, {
        headers: {
          "User-Agent": UA,
          Referer: BASE,
          Cookie: allCookies,
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
        redirect: "follow",
      });
      finalHtml = await followRes.text();
    } else {
      finalHtml = await dlRes.text();
    }

    // Step 3: Parse result
    const result = parseDlSection(finalHtml);

    // Map error codes
    if (!result.success && result.error?.includes("3013")) {
      return jsonRes({
        success: false,
        error: "Reel not found. Make sure it's public and the URL is correct.",
      });
    }

    return jsonRes(result);
  } catch (err) {
    return jsonRes(
      { success: false, error: (err as Error).message || "Internal server error" },
      500
    );
  }
});
