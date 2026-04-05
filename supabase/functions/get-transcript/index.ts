const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
};

function extractVideoId(input: string): string | null {
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  try {
    const parsed = new URL(trimmed);
    const hostname = parsed.hostname.replace(/^www\./, "");
    if (["youtube.com", "m.youtube.com"].includes(hostname)) {
      const watchId = parsed.searchParams.get("v");
      if (watchId && /^[a-zA-Z0-9_-]{11}$/.test(watchId)) return watchId;
      const pathParts = parsed.pathname.split("/").filter(Boolean);
      if (["shorts", "embed"].includes(pathParts[0] || "") && pathParts[1] && /^[a-zA-Z0-9_-]{11}$/.test(pathParts[1]))
        return pathParts[1];
    }
    if (hostname === "youtu.be") {
      const candidate = parsed.pathname.split("/").filter(Boolean)[0];
      if (candidate && /^[a-zA-Z0-9_-]{11}$/.test(candidate)) return candidate;
    }
  } catch { return null; }
  return null;
}

function decodeHtmlEntities(text: string): string {
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/<[^>]+>/g, "")
    .trim();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const { videoId: rawVideoId, video_url } = await req.json();
    const input = rawVideoId || video_url;

    if (!input || typeof input !== "string") {
      return new Response(
        JSON.stringify({ success: false, error: "Please enter a valid YouTube URL or video ID" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const videoId = extractVideoId(input);
    if (!videoId) {
      return new Response(
        JSON.stringify({ success: false, error: "Please enter a valid YouTube URL or video ID" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Fetching transcript for:", videoId);

    // Step 1: Fetch YouTube page
    const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: HEADERS,
    });
    const html = await pageRes.text();

    // Extract video title
    const titleMatch = html.match(/<title>([^<]+)<\/title>/);
    const title = titleMatch
      ? titleMatch[1].replace(" - YouTube", "").trim()
      : videoId;

    // Extract author
    const authorMatch = html.match(/"author":"([^"]+)"/);
    const author = authorMatch ? authorMatch[1] : "";

    // Extract video duration
    const durationMatch = html.match(/"lengthSeconds":"(\d+)"/);
    const duration = durationMatch ? parseInt(durationMatch[1], 10) : 0;

    // Step 2: Extract captionTracks
    const captionMatch = html.match(/"captionTracks":(\[.*?\])/);
    if (!captionMatch) {
      console.log("No captionTracks found in HTML");
      return new Response(
        JSON.stringify({ success: false, error: "This video doesn't have captions or subtitles enabled" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let captionTracks: any[];
    try {
      captionTracks = JSON.parse(captionMatch[1]);
    } catch {
      return new Response(
        JSON.stringify({ success: false, error: "Could not parse caption data" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!captionTracks.length) {
      return new Response(
        JSON.stringify({ success: false, error: "This video doesn't have captions or subtitles enabled" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Caption tracks found:", captionTracks.length);

    // Prefer English, fallback to first available
    const track =
      captionTracks.find((t: any) => t.languageCode === "en") ||
      captionTracks.find((t: any) => t.languageCode?.startsWith("en")) ||
      captionTracks[0];

    const baseUrl = track.baseUrl.replace(/\\u0026/g, "&");
    const language = track.name?.simpleText || track.languageCode;

    console.log("Using track:", language, "baseUrl prefix:", baseUrl.substring(0, 80));

    // Step 3: Fetch transcript XML
    const xmlRes = await fetch(baseUrl, { headers: HEADERS });
    const xml = await xmlRes.text();

    console.log("XML response length:", xml.length);

    // Step 4: Parse XML
    const lines: { start: number; duration: number; text: string }[] = [];
    const regex = /<text start="([^"]+)" dur="([^"]+)"[^>]*>([\s\S]*?)<\/text>/g;
    let match;
    while ((match = regex.exec(xml)) !== null) {
      const text = decodeHtmlEntities(match[3]);
      if (text) {
        lines.push({
          start: parseFloat(match[1]),
          duration: parseFloat(match[2]),
          text,
        });
      }
    }

    // If XML parsing returned nothing, try json3 format as fallback
    if (lines.length === 0 && xml.length === 0) {
      console.log("XML empty, trying json3 format...");
      const json3Url = `${baseUrl}&fmt=json3`;
      const json3Res = await fetch(json3Url, { headers: HEADERS });
      const json3Text = await json3Res.text();
      
      if (json3Text.length > 0) {
        try {
          const json3Data = JSON.parse(json3Text);
          for (const event of json3Data.events || []) {
            if (event.segs) {
              const text = event.segs.map((s: any) => s.utf8 || "").join("").trim();
              if (text && text !== "\n") {
                lines.push({
                  start: event.tStartMs / 1000,
                  duration: (event.dDurationMs || 0) / 1000,
                  text,
                });
              }
            }
          }
        } catch {
          console.log("json3 parse failed");
        }
      }
    }

    console.log("Transcript lines parsed:", lines.length);

    return new Response(
      JSON.stringify({
        success: true,
        videoId,
        title,
        author,
        duration,
        language,
        thumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        availableTracks: captionTracks.map((t: any) => ({
          languageCode: t.languageCode,
          name: t.name?.simpleText || t.languageCode,
        })),
        transcript: lines,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unhandled error:", err);
    return new Response(
      JSON.stringify({ success: false, error: "Could not fetch transcript. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
