import "jsr:@supabase/functions-js/edge-runtime.d.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

function decodeHtmlEntities(s: string): string {
  return s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"');
}

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// ── Proxy GET (branded download) ──
async function handleProxy(req: Request) {
  const url = new URL(req.url);
  const mediaUrl = url.searchParams.get("url");
  const filename = url.searchParams.get("filename") || "MinusFlow.net_media";

  if (!mediaUrl) return jsonResponse({ error: "Missing url param" }, 400);

  try {
    const upstream = await fetch(mediaUrl, {
      headers: {
        "User-Agent": UA,
        Referer: "https://www.instagram.com/",
      },
      redirect: "follow",
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

// ── Resolve short URL ──
async function resolveUrl(url: string): Promise<string> {
  if (url.includes("/p/") || url.includes("/reel/") || url.includes("/tv/")) {
    return url;
  }
  try {
    const res = await fetch(url, {
      method: "HEAD",
      headers: { "User-Agent": UA },
      redirect: "follow",
    });
    return res.url || url;
  } catch {
    return url;
  }
}

// ── Extract shortcode from URL ──
function getShortcode(url: string): string | null {
  const m = url.match(/\/(p|reel|tv)\/([A-Za-z0-9_-]+)/);
  return m?.[2] || null;
}

// ── Method 1: Instagram GraphQL query ──
async function fetchViaGraphQL(shortcode: string) {
  const graphqlUrl = `https://www.instagram.com/graphql/query/?query_hash=b3055c01b4b222b8a47dc12b090e4e64&variables=${encodeURIComponent(
    JSON.stringify({ shortcode, child_comment_count: 0, fetch_comment_count: 0, parent_comment_count: 0, has_threaded_comments: false })
  )}`;

  const res = await fetch(graphqlUrl, {
    headers: {
      "User-Agent": UA,
      Accept: "*/*",
      "X-IG-App-ID": "936619743392459",
      "X-Requested-With": "XMLHttpRequest",
      Referer: `https://www.instagram.com/p/${shortcode}/`,
    },
  });

  if (!res.ok) return null;
  const json = await res.json();
  const media = json?.data?.shortcode_media;
  if (!media) return null;

  return parseGraphQLMedia(media);
}

function parseGraphQLMedia(media: any) {
  const items: Array<{ type: string; url: string; thumbnail: string }> = [];

  if (media.edge_sidecar_to_children?.edges) {
    // Carousel
    for (const edge of media.edge_sidecar_to_children.edges) {
      const node = edge.node;
      items.push({
        type: node.is_video ? "video" : "image",
        url: node.is_video ? node.video_url : node.display_url,
        thumbnail: node.display_url,
      });
    }
  } else {
    items.push({
      type: media.is_video ? "video" : "image",
      url: media.is_video ? media.video_url : media.display_url,
      thumbnail: media.display_url,
    });
  }

  return {
    success: true,
    media_count: items.length,
    items,
    author: media.owner?.username || "",
    caption:
      media.edge_media_to_caption?.edges?.[0]?.node?.text?.slice(0, 200) || "",
  };
}

// ── Method 2: Fetch page HTML and extract embedded JSON ──
async function fetchViaPageHTML(url: string, shortcode: string) {
  const pageUrl = `https://www.instagram.com/p/${shortcode}/`;
  const res = await fetch(pageUrl, {
    headers: {
      "User-Agent": UA,
      Accept:
        "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      "Accept-Language": "en-US,en;q=0.5",
      "Sec-Fetch-Mode": "navigate",
    },
  });

  if (!res.ok) return null;
  const html = await res.text();

  // Try to find JSON data in the page
  // Pattern 1: window.__additionalDataLoaded
  let match = html.match(
    /window\.__additionalDataLoaded\([^,]+,\s*({.+?})\s*\);/s
  );
  if (match?.[1]) {
    try {
      const data = JSON.parse(match[1]);
      const media =
        data.graphql?.shortcode_media ||
        data.items?.[0];
      if (media) return parseGraphQLMedia(media);
    } catch {}
  }

  // Pattern 2: window._sharedData
  match = html.match(/window\._sharedData\s*=\s*({.+?});<\/script>/s);
  if (match?.[1]) {
    try {
      const data = JSON.parse(match[1]);
      const media =
        data.entry_data?.PostPage?.[0]?.graphql?.shortcode_media;
      if (media) return parseGraphQLMedia(media);
    } catch {}
  }

  // Pattern 3: extract og:video or og:image meta tags
  const items: Array<{ type: string; url: string; thumbnail: string }> = [];

  const videoMatch = html.match(
    /property="og:video(?::secure_url)?"\s+content="([^"]+)"/
  );
  const imageMatch = html.match(
    /property="og:image"\s+content="([^"]+)"/
  );

  if (videoMatch?.[1]) {
    items.push({
      type: "video",
      url: videoMatch[1],
      thumbnail: imageMatch?.[1] || "",
    });
  } else if (imageMatch?.[1]) {
    items.push({
      type: "image",
      url: imageMatch[1],
      thumbnail: imageMatch[1],
    });
  }

  if (items.length > 0) {
    const authorMatch = html.match(
      /property="og:description"\s+content="[^"]*@([A-Za-z0-9_.]+)/
    );
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

// ── Method 3: Instagram oEmbed API (image only fallback) ──
async function fetchViaOEmbed(url: string) {
  const oembedUrl = `https://graph.facebook.com/v18.0/instagram_oembed?url=${encodeURIComponent(
    url
  )}&access_token=IGQWRPZA`;

  // oEmbed doesn't need auth for basic info. Try the public endpoint.
  const res = await fetch(
    `https://api.instagram.com/oembed/?url=${encodeURIComponent(url)}`,
    { headers: { "User-Agent": UA } }
  );

  if (!res.ok) return null;
  const data = await res.json();

  if (data.thumbnail_url) {
    return {
      success: true,
      media_count: 1,
      items: [
        {
          type: "image",
          url: data.thumbnail_url,
          thumbnail: data.thumbnail_url,
        },
      ],
      author: data.author_name || "",
      caption: data.title || "",
    };
  }
  return null;
}

// ── Main handler ──
Deno.serve(async (req) => {
  if (req.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });

  if (req.method === "GET" || req.method === "HEAD") return handleProxy(req);

  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string")
      return jsonResponse({ error: "Missing or invalid URL" }, 400);

    if (!url.includes("instagram.com") && !url.includes("instagr.am"))
      return jsonResponse(
        { error: "Please provide a valid Instagram URL" },
        400
      );

    const resolved = await resolveUrl(url);
    const shortcode = getShortcode(resolved);

    if (!shortcode)
      return jsonResponse(
        { error: "Could not extract post ID from URL. Use a direct post/reel link." },
        400
      );

    // Try methods in order
    let result = await fetchViaGraphQL(shortcode);
    if (!result) result = await fetchViaPageHTML(resolved, shortcode);
    if (!result) result = await fetchViaOEmbed(resolved);

    if (!result)
      return jsonResponse(
        {
          error:
            "Could not extract media. The post may be private or login-required.",
        },
        404
      );

    return jsonResponse(result);
  } catch (err) {
    return jsonResponse(
      { error: (err as Error).message || "Internal server error" },
      500
    );
  }
});
