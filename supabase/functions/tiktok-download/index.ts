import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const FALLBACK_TOKENS = ["SGFkckxk", "ZWFQNGd2", "SGplSmw", "dGtUa3Q"];

async function getTtToken(): Promise<string> {
  try {
    const res = await fetch("https://ssstik.io/", {
      headers: {
        "User-Agent": UA,
        Accept:
          "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.5",
      },
    });
    const html = await res.text();

    let match = html.match(/"tt"\s*:\s*"([^"]+)"/);
    if (match?.[1]) return match[1];

    match = html.match(
      /hx-vals[^>]*tt[^>]*:\s*["']([A-Za-z0-9+\/=]{4,})["']/
    );
    if (match?.[1]) return match[1];
  } catch {
    // fall through to fallback
  }

  return FALLBACK_TOKENS[
    Math.floor(Date.now() / 300000) % FALLBACK_TOKENS.length
  ];
}

function parseResponse(html: string) {
  const title = html
    .match(/<p[^>]*class="[^"]*maintext[^"]*"[^>]*>(.*?)<\/p>/s)?.[1]
    ?.replace(/<[^>]+>/g, "")
    .trim();

  const author = html
    .match(/<h2[^>]*>(.*?)<\/h2>/s)?.[1]
    ?.replace(/<[^>]+>/g, "")
    .trim();

  const thumbnail = html.match(
    /background-image:\s*url\((https:\/\/tikcdn[^)]+)\)/
  )?.[1];

  // No watermark link
  const noWatermarkUrl =
    (
      html.match(
        /class="[^"]*without_watermark[^"]*"[^>]*href="([^"]+)"/
      ) ||
      html.match(
        /href="([^"]+)"[^>]*class="[^"]*without_watermark[^"]*"/
      )
    )?.[1] ||
    html.match(/href="(https:\/\/tikcdn\.io\/ssstik\/\d+[^"]+)"/)?.[1];

  // All tikcdn links
  const allLinks = [
    ...html.matchAll(/href="(https:\/\/tikcdn\.io\/ssstik\/[^"]+)"/g),
  ].map((m) => m[1]);

  // Watermark = any link that isn't the noWatermark one and isn't /m/ (music)
  const watermarkUrl = allLinks.find(
    (l) => l !== noWatermarkUrl && !l.includes("/ssstik/m/")
  );

  // MP3
  const mp3Url =
    (
      html.match(
        /class="[^"]*\bmusic\b[^"]*"[^>]*href="([^"]+)"/
      ) ||
      html.match(
        /href="([^"]+)"[^>]*class="[^"]*\bmusic\b[^"]*"/
      )
    )?.[1] ||
    html.match(/href="(https:\/\/tikcdn\.io\/ssstik\/m\/[^"]+)"/)?.[1];

  return {
    title: title || "TikTok Video",
    author: author || "",
    thumbnail: thumbnail || "",
    download_url_no_watermark: noWatermarkUrl || "",
    download_url_watermark: watermarkUrl || "",
    download_url_mp3: mp3Url || "",
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  const reqUrl = new URL(req.url);

  // GET /tiktok-download?url=...&filename=... → proxy the media with branded filename
  if (req.method === "GET" || req.method === "HEAD") {
    const mediaUrl = reqUrl.searchParams.get("url");
    const filename = reqUrl.searchParams.get("filename") || "MinusFlow.net_video.mp4";
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

  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing or invalid URL" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Basic TikTok URL validation
    if (
      !url.includes("tiktok.com") &&
      !url.includes("vm.tiktok.com")
    ) {
      return new Response(
        JSON.stringify({ error: "Please provide a valid TikTok URL" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const tt = await getTtToken();

    const apiRes = await fetch("https://ssstik.io/abc?url=dl", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "HX-Request": "true",
        "HX-Target": "target",
        "HX-Trigger": "_gcaptcha_pt",
        "HX-Current-URL": "https://ssstik.io/",
        Origin: "https://ssstik.io",
        Referer: "https://ssstik.io/",
        "User-Agent": UA,
      },
      body: new URLSearchParams({ id: url, locale: "en", tt }),
    });

    const html = await apiRes.text();

    if (
      html.includes("Error code") ||
      html.includes("3001") ||
      html.length < 100
    ) {
      return new Response(
        JSON.stringify({
          error: "Video not found or is private. Use a direct TikTok video link.",
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = parseResponse(html);

    if (!result.download_url_no_watermark) {
      return new Response(
        JSON.stringify({
          error: "Could not extract download links. The video may be private or region-locked.",
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
