const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const YOUTUBE_HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36",
  "Accept-Language": "en-US,en;q=0.9",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-Dest": "document",
  "Sec-Ch-Ua": '"Chromium";v="125", "Not.A/Brand";v="24"',
  "Sec-Ch-Ua-Mobile": "?0",
  "Sec-Ch-Ua-Platform": '"Windows"',
  Cookie: "CONSENT=PENDING+987; SOCS=CAESEwgDEgk2MTkxMzgxMjAaAmVuIAEaBgiA_LyaBg",
};

type CaptionTrack = {
  baseUrl: string;
  languageCode?: string;
  name?: { simpleText?: string; runs?: { text?: string }[] };
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
      const candidate = pathParts[1];
      if (
        ["shorts", "embed"].includes(pathParts[0] || "") &&
        candidate &&
        /^[a-zA-Z0-9_-]{11}$/.test(candidate)
      )
        return candidate;
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

function extractJsonObjectAfterMarker(html: string, marker: string): string | null {
  const markerIndex = html.indexOf(marker);
  if (markerIndex === -1) return null;

  const jsonStart = html.indexOf("{", markerIndex);
  if (jsonStart === -1) return null;

  let depth = 0;
  let inString = false;
  let escaped = false;

  for (let i = jsonStart; i < html.length; i++) {
    const char = html[i];
    if (inString) {
      if (escaped) { escaped = false; }
      else if (char === "\\") { escaped = true; }
      else if (char === '"') { inString = false; }
      continue;
    }
    if (char === '"') { inString = true; continue; }
    if (char === "{") depth++;
    if (char === "}") depth--;
    if (depth === 0) return html.slice(jsonStart, i + 1);
  }
  return null;
}

function parsePlayerResponse(pageHtml: string) {
  const rawJson = extractJsonObjectAfterMarker(pageHtml, "ytInitialPlayerResponse");
  if (!rawJson) return null;
  try { return JSON.parse(rawJson); } catch { return null; }
}

function extractCaptionTracksFromHtml(pageHtml: string): CaptionTrack[] {
  const patterns = [
    /"captionTracks":(\[[\s\S]*?\]),"audioTracks"/,
    /"captionTracks":(\[[\s\S]*?\])/,
  ];
  for (const pattern of patterns) {
    const match = pageHtml.match(pattern);
    if (!match) continue;
    try {
      const parsed = JSON.parse(match[1]);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch { continue; }
  }
  return [];
}

function resolveTrackName(track: CaptionTrack): string {
  if (track.name?.simpleText) return track.name.simpleText;
  if (Array.isArray(track.name?.runs)) {
    const joined = track.name.runs.map((item) => item.text || "").join("").trim();
    if (joined) return joined;
  }
  return track.languageCode || "Unknown";
}

async function fetchTranscriptJson3(track: CaptionTrack) {
  const url = `${track.baseUrl}&fmt=json3&xorb=2&xobt=3&xovt=3`;
  const res = await fetch(url, { headers: YOUTUBE_HEADERS });
  if (!res.ok) throw new Error("json3 fetch failed");
  const data = await res.json();

  return (data.events || [])
    .filter((e: any) => e.segs)
    .map((e: any) => ({
      text: e.segs.map((s: any) => s.utf8).join("").trim(),
      start: e.tStartMs / 1000,
      duration: (e.dDurationMs || 0) / 1000,
    }))
    .filter((item: any) => item.text && item.text !== "\n");
}

async function fetchTranscriptXml(track: CaptionTrack) {
  const res = await fetch(track.baseUrl, { headers: YOUTUBE_HEADERS });
  if (!res.ok) throw new Error("XML fetch failed");
  const xml = await res.text();

  const lines: { text: string; start: number; duration: number }[] = [];
  const regex = /<text start="([^"]*)" dur="([^"]*)"[^>]*>([\s\S]*?)<\/text>/g;
  let m;
  while ((m = regex.exec(xml)) !== null) {
    const text = m[3]
      .replace(/&amp;/g, "&")
      .replace(/&lt;/g, "<")
      .replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/<[^>]+>/g, "")
      .trim();
    if (text) {
      lines.push({
        text,
        start: parseFloat(m[1]),
        duration: parseFloat(m[2]),
      });
    }
  }
  return lines;
}

async function fetchTranscriptFromTrack(track: CaptionTrack) {
  try {
    return await fetchTranscriptJson3(track);
  } catch {
    return await fetchTranscriptXml(track);
  }
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
    const { video_url, lang } = await req.json();

    if (!video_url || typeof video_url !== "string") {
      return new Response(JSON.stringify({ error: "Missing video_url field" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const videoId = extractVideoId(video_url);
    if (!videoId) {
      return new Response(JSON.stringify({ error: "Invalid YouTube URL" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}&hl=en`, {
      headers: YOUTUBE_HEADERS,
    });
    const pageHtml = await pageRes.text();

    const playerResponse = parsePlayerResponse(pageHtml);
    if (!playerResponse) {
      return new Response(JSON.stringify({ error: "Could not parse video data" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const videoDetails = playerResponse?.videoDetails || {};
    const title = videoDetails?.title || "";
    const author = videoDetails?.author || "";
    const lengthSeconds = parseInt(videoDetails?.lengthSeconds || "0", 10);
    const thumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

    const captionTracksFromPlayer =
      playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
    const captionTracks =
      Array.isArray(captionTracksFromPlayer) && captionTracksFromPlayer.length > 0
        ? captionTracksFromPlayer
        : extractCaptionTracksFromHtml(pageHtml);

    if (!captionTracks || captionTracks.length === 0) {
      return new Response(
        JSON.stringify({
          error: "No transcript available for this video. The video may not have captions.",
        }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const targetLang = lang || "en";
    const track =
      captionTracks.find((t: CaptionTrack) => t.languageCode === targetLang) ||
      captionTracks.find((t: CaptionTrack) => t.languageCode?.startsWith("en")) ||
      captionTracks[0];

    const transcript = await fetchTranscriptFromTrack(track);

    return new Response(
      JSON.stringify({
        video_id: videoId,
        title,
        author,
        thumbnail,
        duration: lengthSeconds,
        language: track.languageCode || "unknown",
        available_languages: captionTracks.map((item: CaptionTrack) => ({
          code: item.languageCode || "unknown",
          name: resolveTrackName(item),
        })),
        transcript,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch {
    return new Response(
      JSON.stringify({ error: "Something went wrong. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
