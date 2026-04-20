import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface PlaylistVideo {
  videoId: string;
  title: string;
  thumbnail: string;
  duration?: string;
}

const INNERTUBE_KEY = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";

function extractPlaylistId(input: string): string | null {
  try {
    const u = new URL(input);
    const list = u.searchParams.get("list");
    if (list) return list;
  } catch {}
  if (/^(PL|UU|FL|RD|OL|LL)[A-Za-z0-9_-]+$/.test(input)) return input;
  return null;
}

function walk(obj: unknown, key: string, out: any[] = []): any[] {
  if (obj && typeof obj === "object") {
    if (Array.isArray(obj)) {
      for (const v of obj) walk(v, key, out);
    } else {
      for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
        if (k === key) out.push(v);
        walk(v, key, out);
      }
    }
  }
  return out;
}

async function fetchPlaylist(playlistId: string): Promise<{ title: string; videos: PlaylistVideo[] }> {
  const browseId = playlistId.startsWith("VL") ? playlistId : `VL${playlistId}`;

  const body = {
    context: {
      client: {
        clientName: "WEB",
        clientVersion: "2.20240101.00.00",
        hl: "en",
        gl: "US",
      },
    },
    browseId,
  };

  const resp = await fetch(
    `https://www.youtube.com/youtubei/v1/browse?key=${INNERTUBE_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
        "Accept-Language": "en-US,en;q=0.9",
      },
      body: JSON.stringify(body),
    }
  );

  if (!resp.ok) throw new Error(`YouTube API error ${resp.status}`);
  const data = await resp.json();

  // Check for playlist not found / empty
  const alerts = data?.alerts;
  if (Array.isArray(alerts)) {
    for (const a of alerts) {
      const errTxt =
        a?.alertRenderer?.text?.runs?.[0]?.text ||
        a?.alertRenderer?.text?.simpleText;
      if (a?.alertRenderer?.type === "ERROR" && errTxt) {
        throw new Error(errTxt);
      }
    }
  }

  const title: string =
    data?.metadata?.playlistMetadataRenderer?.title ||
    data?.header?.playlistHeaderRenderer?.title?.simpleText ||
    "Untitled playlist";

  const renderers = walk(data, "playlistVideoRenderer");
  const seen = new Set<string>();
  const videos: PlaylistVideo[] = [];

  for (const r of renderers) {
    const vid = r?.videoId;
    if (!vid || seen.has(vid)) continue;
    seen.add(vid);

    const titleText =
      r?.title?.runs?.[0]?.text ||
      r?.title?.simpleText ||
      `Video ${vid}`;

    const thumbs = r?.thumbnail?.thumbnails;
    const thumb =
      (Array.isArray(thumbs) && thumbs.length > 0
        ? thumbs[thumbs.length - 1]?.url
        : null) || `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`;

    const duration =
      r?.lengthText?.simpleText ||
      r?.lengthSeconds ||
      undefined;

    videos.push({ videoId: vid, title: titleText, thumbnail: thumb, duration });
  }

  return { title, videos };
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return new Response(
        JSON.stringify({ error: "url parameter is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const pid = extractPlaylistId(url);
    if (!pid) {
      return new Response(
        JSON.stringify({ error: "Invalid playlist URL — could not extract playlist ID" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const result = await fetchPlaylist(pid);

    if (result.videos.length === 0) {
      return new Response(
        JSON.stringify({ error: "No videos found in this playlist (it may be empty or private)" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        playlistId: pid,
        title: result.title,
        videoCount: result.videos.length,
        videos: result.videos,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
