// MinusFlow YouTube playlist extractor — Invidious primary, InnerTube fallback.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const INVIDIOUS_INSTANCES = [
  "https://invidious.f5.si",
  "https://iv.melmac.space",
  "https://invidious.nikkosphere.com",
  "https://invidious.private.coffee",
  "https://invidious.materialio.us",
  "https://yewtu.be",
  "https://invidious.perennialte.ch",
];

const INNERTUBE_KEY = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8";
const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

interface PlaylistVideo {
  videoId: string;
  title: string;
  thumbnail: string;
  duration?: string;
}

const fetchWithTimeout = async (input: string, init: RequestInit = {}, ms = 9000) => {
  const c = new AbortController();
  const t = setTimeout(() => c.abort(), ms);
  try { return await fetch(input, { ...init, signal: c.signal }); }
  finally { clearTimeout(t); }
};

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
    if (Array.isArray(obj)) for (const v of obj) walk(v, key, out);
    else {
      for (const [k, v] of Object.entries(obj as Record<string, unknown>)) {
        if (k === key) out.push(v);
        walk(v, key, out);
      }
    }
  }
  return out;
}

// === Invidious primary ===
async function fetchPlaylistFromInvidious(playlistId: string) {
  const shuffled = [...INVIDIOUS_INSTANCES].sort(() => Math.random() - 0.5);
  let lastError = "All Invidious instances failed";

  for (const inst of shuffled) {
    try {
      const r = await fetchWithTimeout(`${inst}/api/v1/playlists/${playlistId}`, {
        headers: { "User-Agent": BROWSER_USER_AGENT, Accept: "application/json" },
      });
      if (!r.ok) { lastError = `${inst} returned ${r.status}`; continue; }
      const data: any = await r.json();
      if (!data || data.error) { lastError = data?.error || `${inst} returned error`; continue; }
      const videos: PlaylistVideo[] = (data.videos || []).map((v: any) => ({
        videoId: v.videoId,
        title: v.title || `Video ${v.videoId}`,
        thumbnail: v.videoThumbnails?.[0]?.url || `https://i.ytimg.com/vi/${v.videoId}/hqdefault.jpg`,
        duration: v.lengthSeconds ? String(v.lengthSeconds) : undefined,
      })).filter((v: PlaylistVideo) => v.videoId);
      if (videos.length === 0) { lastError = `${inst} returned no videos`; continue; }
      return { title: data.title || "Untitled playlist", videos };
    } catch (e) {
      lastError = e instanceof Error ? e.message : "instance failed";
      continue;
    }
  }
  throw new Error(lastError);
}

// === InnerTube fallback ===
async function fetchPlaylistFromInnerTube(playlistId: string) {
  const browseId = playlistId.startsWith("VL") ? playlistId : `VL${playlistId}`;
  const resp = await fetchWithTimeout(
    `https://www.youtube.com/youtubei/v1/browse?key=${INNERTUBE_KEY}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": BROWSER_USER_AGENT,
        "Accept-Language": "en-US,en;q=0.9",
      },
      body: JSON.stringify({
        context: { client: { clientName: "WEB", clientVersion: "2.20240101.00.00", hl: "en", gl: "US" } },
        browseId,
      }),
    },
    12000,
  );

  if (!resp.ok) throw new Error(`YouTube API error ${resp.status}`);
  const data: any = await resp.json();

  const alerts = data?.alerts;
  if (Array.isArray(alerts)) {
    for (const a of alerts) {
      const errTxt =
        a?.alertRenderer?.text?.runs?.[0]?.text || a?.alertRenderer?.text?.simpleText;
      if (a?.alertRenderer?.type === "ERROR" && errTxt) throw new Error(errTxt);
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
    const titleText = r?.title?.runs?.[0]?.text || r?.title?.simpleText || `Video ${vid}`;
    const thumbs = r?.thumbnail?.thumbnails;
    const thumb =
      (Array.isArray(thumbs) && thumbs.length > 0 ? thumbs[thumbs.length - 1]?.url : null) ||
      `https://i.ytimg.com/vi/${vid}/hqdefault.jpg`;
    const duration = r?.lengthText?.simpleText || r?.lengthSeconds || undefined;
    videos.push({ videoId: vid, title: titleText, thumbnail: thumb, duration });
  }

  return { title, videos };
}

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return new Response(JSON.stringify({ error: "url parameter is required" }), {
        status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const pid = extractPlaylistId(url);
    if (!pid) {
      return new Response(
        JSON.stringify({ error: "Invalid playlist URL — could not extract playlist ID" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    let result: { title: string; videos: PlaylistVideo[] };
    try {
      result = await fetchPlaylistFromInvidious(pid);
    } catch (invErr) {
      try {
        result = await fetchPlaylistFromInnerTube(pid);
      } catch (ytErr) {
        const msg = ytErr instanceof Error ? ytErr.message : String(ytErr);
        const invMsg = invErr instanceof Error ? invErr.message : String(invErr);
        return new Response(
          JSON.stringify({ error: `Could not load playlist: ${msg} (also: ${invMsg})` }),
          { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    if (result.videos.length === 0) {
      return new Response(
        JSON.stringify({ error: "No videos found in this playlist (it may be empty or private)" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    return new Response(
      JSON.stringify({
        playlistId: pid,
        title: result.title,
        videoCount: result.videos.length,
        videos: result.videos,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    return new Response(
      JSON.stringify({ error: (err as Error).message || "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
