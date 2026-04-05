const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const INNERTUBE_API_KEY = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";

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

function resolveTrackName(track: CaptionTrack): string {
  if (track.name?.simpleText) return track.name.simpleText;
  if (Array.isArray(track.name?.runs)) {
    const joined = track.name.runs.map((item) => item.text || "").join("").trim();
    if (joined) return joined;
  }
  return track.languageCode || "Unknown";
}

async function getPlayerResponse(videoId: string) {
  // Try multiple client types - ANDROID client reliably returns captions from servers
  const clients = [
    {
      clientName: "ANDROID",
      clientVersion: "19.09.37",
      androidSdkVersion: 30,
      userAgent: "com.google.android.youtube/19.09.37 (Linux; U; Android 11) gzip",
    },
    {
      clientName: "IOS",
      clientVersion: "19.09.3",
      deviceModel: "iPhone14,3",
      userAgent: "com.google.ios.youtube/19.09.3 (iPhone14,3; U; CPU iOS 15_6 like Mac OS X)",
    },
  ];

  for (const client of clients) {
    try {
      const payload: any = {
        context: {
          client: {
            hl: "en",
            gl: "US",
            clientName: client.clientName,
            clientVersion: client.clientVersion,
            ...(client.androidSdkVersion && { androidSdkVersion: client.androidSdkVersion }),
            ...(client.deviceModel && { deviceModel: client.deviceModel }),
          },
        },
        videoId,
      };

      const res = await fetch(
        `https://www.youtube.com/youtubei/v1/player?key=${INNERTUBE_API_KEY}&prettyPrint=false`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "User-Agent": client.userAgent,
          },
          body: JSON.stringify(payload),
        }
      );

      if (!res.ok) {
        console.log(`${client.clientName} client failed:`, res.status);
        continue;
      }

      const data = await res.json();
      const tracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
      console.log(`${client.clientName} client: ${tracks?.length || 0} caption tracks`);

      if (Array.isArray(tracks) && tracks.length > 0) {
        return data;
      }
    } catch (e) {
      console.log(`${client.clientName} client error:`, e);
    }
  }

  // Final fallback: WEB_EMBEDDED_PLAYER client
  try {
    const payload = {
      context: {
        client: {
          hl: "en",
          gl: "US",
          clientName: "WEB_EMBEDDED_PLAYER",
          clientVersion: "1.20240530.00.00",
        },
      },
      videoId,
    };

    const res = await fetch(
      `https://www.youtube.com/youtubei/v1/player?key=${INNERTUBE_API_KEY}&prettyPrint=false`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/125.0.0.0 Safari/537.36",
        },
        body: JSON.stringify(payload),
      }
    );

    if (res.ok) {
      const data = await res.json();
      const tracks = data?.captions?.playerCaptionsTracklistRenderer?.captionTracks;
      console.log(`WEB_EMBEDDED_PLAYER: ${tracks?.length || 0} caption tracks`);
      if (Array.isArray(tracks) && tracks.length > 0) {
        return data;
      }
      // Even if no tracks, return data for video details
      return data;
    }
  } catch (e) {
    console.log("WEB_EMBEDDED_PLAYER error:", e);
  }

  return null;
}

async function fetchTranscriptJson3(track: CaptionTrack) {
  const url = `${track.baseUrl}&fmt=json3`;
  const res = await fetch(url);
  if (!res.ok) throw new Error("json3 fetch failed: " + res.status);
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
  const res = await fetch(track.baseUrl);
  if (!res.ok) throw new Error("XML fetch failed: " + res.status);
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
      lines.push({ text, start: parseFloat(m[1]), duration: parseFloat(m[2]) });
    }
  }
  return lines;
}

async function fetchTranscriptFromTrack(track: CaptionTrack) {
  try {
    return await fetchTranscriptJson3(track);
  } catch (e) {
    console.log("json3 failed, trying XML:", e);
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

    console.log("Fetching transcript for video:", videoId);

    const playerResponse = await getPlayerResponse(videoId);
    if (!playerResponse) {
      return new Response(JSON.stringify({ error: "Could not fetch video data from YouTube" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const videoDetails = playerResponse?.videoDetails || {};
    const title = videoDetails?.title || "";
    const author = videoDetails?.author || "";
    const lengthSeconds = parseInt(videoDetails?.lengthSeconds || "0", 10);
    const thumbnail = `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`;

    const captionTracks =
      playerResponse?.captions?.playerCaptionsTracklistRenderer?.captionTracks;

    if (!Array.isArray(captionTracks) || captionTracks.length === 0) {
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

    console.log("Using track:", track.languageCode);

    const transcript = await fetchTranscriptFromTrack(track);
    console.log("Transcript lines:", transcript.length);

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
  } catch (err) {
    console.error("Unhandled error:", err);
    return new Response(
      JSON.stringify({ error: "Something went wrong. Please try again." }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
