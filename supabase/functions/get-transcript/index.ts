const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

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
      if (
        ["shorts", "embed"].includes(pathParts[0] || "") &&
        pathParts[1] &&
        /^[a-zA-Z0-9_-]{11}$/.test(pathParts[1])
      )
        return pathParts[1];
    }
    if (hostname === "youtu.be") {
      const candidate = parsed.pathname.split("/").filter(Boolean)[0];
      if (candidate && /^[a-zA-Z0-9_-]{11}$/.test(candidate)) return candidate;
    }
  } catch {
    return null;
  }
  return null;
}

/** Parse "HH:MM:SS" or "MM:SS" string to seconds */
function timeToSeconds(t: string): number {
  const parts = t.split(":").map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ error: "Method not allowed" }),
      { status: 405, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const { videoId: rawVideoId, video_url, language } = await req.json();
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

    console.log("Fetching transcript via NoteGPT for:", videoId);

    // Step 1: Get sbox-guid session cookie
    const userInfoRes = await fetch("https://notegpt.io/user/v2/userinfo", {
      headers: { "User-Agent": UA },
    });

    if (!userInfoRes.ok) {
      console.error("Failed to get NoteGPT session:", userInfoRes.status);
      throw new Error("Session init failed");
    }

    const setCookie = userInfoRes.headers.get("set-cookie") || "";
    const sboxMatch = setCookie.match(/sbox-guid=([^;]+)/);
    const sboxGuid = sboxMatch?.[1] || "";
    const anonymousUserId = crypto.randomUUID();

    console.log("Got sbox-guid:", sboxGuid ? "yes" : "no");

    // Step 2: Fetch transcript from NoteGPT
    const transcriptUrl = new URL("https://notegpt.io/api/v2/video-transcript");
    transcriptUrl.searchParams.set("platform", "youtube");
    transcriptUrl.searchParams.set("video_id", videoId);

    const transcriptRes = await fetch(transcriptUrl.toString(), {
      headers: {
        "User-Agent": UA,
        Cookie: `sbox-guid=${sboxGuid}; anonymous_user_id=${anonymousUserId}`,
      },
    });

    if (!transcriptRes.ok) {
      console.error("NoteGPT API error:", transcriptRes.status);
      throw new Error("Transcript API returned " + transcriptRes.status);
    }

    const apiData = await transcriptRes.json();
    console.log("NoteGPT response code:", apiData.code);

    if (apiData.code !== 100000 || !apiData.data) {
      return new Response(
        JSON.stringify({
          success: false,
          error: apiData.message || "Could not fetch transcript",
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { videoInfo, language_code, transcripts } = apiData.data;

    // Build available tracks list
    const availableTracks = (language_code || []).map((l: any) => ({
      languageCode: l.code,
      name: l.name,
    }));

    // Pick requested language or default
    const selectedLang =
      language ||
      (availableTracks.find((t: any) => t.languageCode === "en")
        ? "en"
        : availableTracks[0]?.languageCode || "en");

    const langTranscripts = transcripts?.[selectedLang];
    const rawLines = langTranscripts?.custom || langTranscripts?.auto || [];

    // Parse lines
    const lines = rawLines
      .map((seg: any) => {
        const startSec = timeToSeconds(seg.start || "0:00");
        const endSec = timeToSeconds(seg.end || seg.start || "0:00");
        const text = (seg.text || "").trim();
        if (!text) return null;
        return {
          start: startSec,
          duration: Math.max(0, endSec - startSec),
          text,
        };
      })
      .filter(Boolean);

    console.log("Transcript lines:", lines.length);

    const title = videoInfo?.name || videoId;
    const author = videoInfo?.author || "";
    const duration = parseInt(videoInfo?.duration || "0", 10);
    const thumbnail =
      videoInfo?.thumbnailUrl?.hqdefault ||
      videoInfo?.thumbnailUrl?.maxresdefault ||
      `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

    const selectedTrack = availableTracks.find(
      (t: any) => t.languageCode === selectedLang
    );

    return new Response(
      JSON.stringify({
        success: true,
        videoId,
        title,
        author,
        duration,
        language: selectedTrack?.name || selectedLang,
        thumbnail,
        availableTracks,
        transcript: lines,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    console.error("Unhandled error:", err);
    return new Response(
      JSON.stringify({
        success: false,
        error: "Could not fetch transcript. Please try again.",
      }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
