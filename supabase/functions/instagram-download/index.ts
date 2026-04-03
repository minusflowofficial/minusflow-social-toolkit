import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// --------------- Proxy GET (branded download) ---------------
async function handleProxy(req: Request) {
  const url = new URL(req.url);
  const mediaUrl = url.searchParams.get("url");
  const filename = url.searchParams.get("filename") || "MinusFlow.net_media";

  if (!mediaUrl) return jsonResponse({ error: "Missing url param" }, 400);

  try {
    const upstream = await fetch(mediaUrl, {
      headers: { "User-Agent": UA },
    });
    if (!upstream.ok)
      return jsonResponse({ error: "Upstream fetch failed" }, upstream.status);

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
    return jsonResponse({ error: (e as Error).message }, 500);
  }
}

// --------------- Scrape via saveig.app ---------------
async function fetchFromSaveig(igUrl: string) {
  // Step 1 — load homepage to get any tokens/cookies
  const homeRes = await fetch("https://saveig.app/en", {
    headers: { "User-Agent": UA, Accept: "text/html" },
  });
  const homeCookies = homeRes.headers.get("set-cookie") || "";
  const homeHtml = await homeRes.text();

  // extract token if present
  const tokenMatch = homeHtml.match(
    /name="token"\s+value="([^"]+)"/
  );
  const token = tokenMatch?.[1] || "";

  // Step 2 — submit URL
  const formBody = new URLSearchParams({
    url: igUrl,
    token,
  });

  const apiRes = await fetch("https://saveig.app/api/ajaxSearch", {
    method: "POST",
    headers: {
      "User-Agent": UA,
      "Content-Type": "application/x-www-form-urlencoded",
      Origin: "https://saveig.app",
      Referer: "https://saveig.app/en",
      Cookie: homeCookies.split(",").map((c) => c.split(";")[0]).join("; "),
    },
    body: formBody,
  });

  const json = await apiRes.json();
  return json;
}

function parseItems(json: any) {
  // saveig returns { status: "ok", data: "<html>" }
  if (!json || json.status !== "ok" || !json.data) return null;

  const html: string = json.data;
  const items: Array<{
    type: string;
    url: string;
    thumbnail: string;
  }> = [];

  // Parse download items from HTML
  // Pattern: download-items with img thumbnails and download links
  const blocks = html.split(/class="download-items__btn/);

  // Extract all download links
  const linkMatches = [
    ...html.matchAll(
      /href="(https?:\/\/[^"]+)"[^>]*>\s*(?:<[^>]*>)*\s*Download\s*(Video|Photo|Image|Reel)?/gi
    ),
  ];

  // Extract thumbnails
  const thumbMatches = [
    ...html.matchAll(/<img[^>]+src="(https?:\/\/[^"]+)"/g),
  ];

  if (linkMatches.length > 0) {
    linkMatches.forEach((m, i) => {
      const url = m[1];
      const typeHint = (m[2] || "").toLowerCase();
      const isVideo =
        typeHint.includes("video") ||
        typeHint.includes("reel") ||
        url.includes(".mp4") ||
        url.includes("video");
      items.push({
        type: isVideo ? "video" : "image",
        url,
        thumbnail: thumbMatches[i]?.[1] || "",
      });
    });
  }

  // Fallback: try to get any links that look like media
  if (items.length === 0) {
    const allLinks = [
      ...html.matchAll(/href="(https?:\/\/[^"]*(?:\.mp4|\.jpg|\.png|cdninstagram|scontent)[^"]*)"/g),
    ];
    allLinks.forEach((m) => {
      const url = m[1];
      const isVideo = url.includes(".mp4") || url.includes("video");
      items.push({
        type: isVideo ? "video" : "image",
        url,
        thumbnail: "",
      });
    });
  }

  return items.length > 0 ? items : null;
}

// --------------- Main handler ---------------
Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  // Proxy GET
  if (req.method === "GET" || req.method === "HEAD") return handleProxy(req);

  // POST — extract media info
  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string")
      return jsonResponse({ error: "Missing or invalid URL" }, 400);

    if (!url.includes("instagram.com") && !url.includes("instagr.am"))
      return jsonResponse(
        { error: "Please provide a valid Instagram URL" },
        400
      );

    const raw = await fetchFromSaveig(url);
    const items = parseItems(raw);

    if (!items)
      return jsonResponse(
        {
          error:
            "Could not extract media. The post may be private or the URL is invalid.",
        },
        404
      );

    return jsonResponse({
      success: true,
      media_count: items.length,
      items,
    });
  } catch (err) {
    return jsonResponse(
      { error: (err as Error).message || "Internal server error" },
      500
    );
  }
});
