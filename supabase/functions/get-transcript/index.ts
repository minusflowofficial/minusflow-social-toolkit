const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function extractVideoId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match) return match[1];
  }
  return null;
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
    const { video_url } = await req.json();

    if (!video_url || typeof video_url !== "string") {
      return new Response(
        JSON.stringify({ error: "Missing video_url field" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const videoId = extractVideoId(video_url.trim());
    if (!videoId) {
      return new Response(
        JSON.stringify({ error: "Invalid YouTube URL" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Step 1: Fetch YouTube page
    const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
      headers: {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
    });
    const pageHtml = await pageRes.text();

    // Step 2: Extract ytInitialPlayerResponse
    const match = pageHtml.match(
      /ytInitialPlayerResponse\s*=\s*(\{.+?\})\s*;\s*(?:var\s|const\s|let\s|<\/script>)/s,
    );
    if (!match) {
      return new Response(
        JSON.stringify({ error: "Could not parse video data" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let playerResponse: any;
    try {
      playerResponse = JSON.parse(match[1]);
    } catch {
      return new Response(
        JSON.stringify({ error: "Failed to parse video metadata" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Step 3: Video metadata
    const videoDetails = playerResponse?.videoDetails || {};
    const title = videoDetails?.title || "";
    const author = videoDetails?.author || "";
    const thumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

    // Step 4: Caption tracks
    const captionTracks =
      playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

    if (!captionTracks || captionTracks.length === 0) {
      return new Response(
        JSON.stringify({
          error:
            "No transcript available for this video. The video may not have captions.",
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Prefer English, fallback to first
    const track =
      captionTracks.find((t: any) => t.languageCode === "en") ||
      captionTracks.find((t: any) => t.languageCode?.startsWith("en")) ||
      captionTracks[0];

    const captionUrl = track.baseUrl + "&fmt=json3";

    // Step 5: Fetch transcript
    const captionRes = await fetch(captionUrl);
    const captionData = await captionRes.json();

    // Step 6: Parse transcript
    const transcript = (captionData.events || [])
      .filter((event: any) => event.segs)
      .map((event: any) => ({
        text: event.segs
          .map((s: any) => s.utf8)
          .join("")
          .trim(),
        start: event.tStartMs / 1000,
        duration: (event.dDurationMs || 0) / 1000,
      }))
      .filter((item: any) => item.text && item.text !== "\n");

    return new Response(
      JSON.stringify({
        video_id: videoId,
        title,
        author,
        thumbnail,
        language: track.languageCode,
        available_languages: captionTracks.map((t: any) => ({
          code: t.languageCode,
          name: t.name?.simpleText || t.languageCode,
        })),
        transcript,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: "Something went wrong. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
