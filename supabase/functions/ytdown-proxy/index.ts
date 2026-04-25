// MinusFlow YouTube proxy — direct download enabled.
// Strategy: Invidious instances (direct googlevideo URLs) → ytdown.to → safe fallback.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version, range",
  "Access-Control-Allow-Methods": "GET, HEAD, POST, OPTIONS",
  "Access-Control-Expose-Headers":
    "Content-Disposition, Content-Length, Content-Type, Accept-Ranges, Content-Range, Retry-After, X-Download-Status",
};

const TIMEOUT_MS = 15000;
const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36";

// Public Invidious instances that expose /api/v1/videos with direct googlevideo URLs and CORS allowed.
// We rotate through this list; first one returning data wins.
const INVIDIOUS_INSTANCES = [
  "https://invidious.f5.si",
  "https://iv.melmac.space",
  "https://invidious.nikkosphere.com",
  "https://invidious.private.coffee",
  "https://invidious.materialio.us",
  "https://invidious.darkness.service",
  "https://invidious.einfachzocken.eu",
  "https://invidious.perennialte.ch",
  "https://yewtu.be",
  "https://invidious.reallyaweso.me",
];

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

const fetchWithTimeout = async (input: string, init: RequestInit = {}, timeoutMs = TIMEOUT_MS) => {
  const controller = new AbortController();
  const t = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(input, { ...init, signal: controller.signal });
  } finally {
    clearTimeout(t);
  }
};

const jsonResponse = (body: Record<string, unknown>, status = 200, extraHeaders: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json", ...extraHeaders },
  });

function extractVideoId(value: string): string | null {
  if (/^[A-Za-z0-9_-]{11}$/.test(value)) return value;
  try {
    const url = new URL(value);
    if (url.hostname === "youtu.be" || url.hostname.endsWith(".youtu.be")) {
      const id = url.pathname.slice(1).split("/")[0];
      return /^[A-Za-z0-9_-]{11}$/.test(id) ? id : null;
    }
    const v = url.searchParams.get("v");
    if (v && /^[A-Za-z0-9_-]{11}$/.test(v)) return v;
    const match = url.pathname.match(/\/(?:shorts|embed|v|live)\/([A-Za-z0-9_-]{11})/);
    return match?.[1] || null;
  } catch {
    return null;
  }
}

const sanitizeFileName = (value: string) => {
  const cleaned = value.replace(/YTDown\.com/gi, "MinusFlow.net").replace(/[\\/:*?"<>|]+/g, "-").trim();
  return cleaned || "MinusFlow.net_download";
};

const formatBytes = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) return "—";
  const units = ["B", "KB", "MB", "GB"];
  let size = value;
  let i = 0;
  while (size >= 1024 && i < units.length - 1) { size /= 1024; i += 1; }
  return `${size.toFixed(size >= 100 || i === 0 ? 0 : 2)} ${units[i]}`;
};

const formatDuration = (value: number) => {
  if (!Number.isFinite(value) || value <= 0) return "";
  const total = Math.round(value);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  if (h > 0) return `${h}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
  return `${m}:${String(s).padStart(2, "0")}`;
};

// ===== Download host policy =====
// We allow proxying any google video CDN host (googlevideo.com), Invidious googlevideo proxies, and the ytdown providers.
const isAllowedDownloadHost = (hostname: string) => {
  const host = hostname.toLowerCase();
  if (host === "googlevideo.com" || host.endsWith(".googlevideo.com")) return true;
  if (host.endsWith(".youtube.com") || host === "youtube.com") return true;
  if (host === "ytcontent.com" || host.endsWith(".ytcontent.com")) return true;
  if (host === "process4.me" || host.endsWith(".process4.me")) return true;
  if (host === "iamworker.com" || host.endsWith(".iamworker.com")) return true;
  if (/(^|\.)worker\d+\.com$/i.test(host)) return true;
  // Allow ALL Invidious instances we use (they may proxy media themselves).
  for (const inst of INVIDIOUS_INSTANCES) {
    try {
      if (host === new URL(inst).hostname) return true;
    } catch {}
  }
  return false;
};

// ===== Streaming proxy: forces download attachment & bypasses CORS =====
const proxyDownload = async (req: Request) => {
  const requestUrl = new URL(req.url);
  const source = requestUrl.searchParams.get("source") || "";
  const requestedFileName = requestUrl.searchParams.get("fileName") || "";

  if (!source) return jsonResponse({ error: "Missing source URL" }, 400);

  let sourceUrl: URL;
  try {
    sourceUrl = new URL(source);
  } catch {
    return jsonResponse({ error: "Invalid source URL" }, 400);
  }

  if (!["http:", "https:"].includes(sourceUrl.protocol) || !isAllowedDownloadHost(sourceUrl.hostname)) {
    return jsonResponse({ error: "Unsupported download host" }, 400);
  }

  const upstreamHeaders: Record<string, string> = {
    "User-Agent": BROWSER_USER_AGENT,
    Accept: "*/*",
    Referer: "https://www.youtube.com/",
    Origin: "https://www.youtube.com",
  };
  const range = req.headers.get("range");
  if (range) upstreamHeaders["Range"] = range;

  const upstream = await fetchWithTimeout(sourceUrl.toString(), {
    method: req.method === "HEAD" ? "HEAD" : "GET",
    headers: upstreamHeaders,
  }, 20000);

  if (!upstream.ok && upstream.status !== 206) {
    return jsonResponse({ error: `Download provider error: ${upstream.status}` }, 502);
  }

  const fileName = sanitizeFileName(
    requestedFileName || sourceUrl.pathname.split("/").pop() || "MinusFlow.net_download",
  );

  const headers = new Headers(corsHeaders);
  headers.set("Content-Type", upstream.headers.get("Content-Type") || "application/octet-stream");
  const cl = upstream.headers.get("Content-Length");
  if (cl) headers.set("Content-Length", cl);
  const cr = upstream.headers.get("Content-Range");
  if (cr) headers.set("Content-Range", cr);
  const ar = upstream.headers.get("Accept-Ranges");
  if (ar) headers.set("Accept-Ranges", ar);
  headers.set(
    "Content-Disposition",
    `attachment; filename="${fileName.replace(/["\\]/g, "_")}"; filename*=UTF-8''${encodeURIComponent(fileName)}`,
  );

  return new Response(req.method === "HEAD" ? null : upstream.body, {
    status: upstream.status,
    headers,
  });
};

// ===== Invidious primary parser =====
interface InvidiousFormat {
  url?: string;
  container?: string;
  qualityLabel?: string;
  audioQuality?: string;
  bitrate?: string | number;
  contentLength?: string | number;
  resolution?: string;
  encoding?: string;
  type?: string; // mime
  size?: string;
}

const audioQualityToK = (q?: string, bitrate?: number) => {
  if (bitrate && bitrate > 0) return `${Math.max(48, Math.round(bitrate / 1000))}K`;
  if (!q) return "128K";
  if (q.includes("HIGH")) return "192K";
  if (q.includes("MEDIUM")) return "128K";
  if (q.includes("LOW")) return "64K";
  return "128K";
};

const fetchFromInvidious = async (videoId: string) => {
  const shuffled = [...INVIDIOUS_INSTANCES].sort(() => Math.random() - 0.5);
  let lastError = "All Invidious instances failed";

  for (const inst of shuffled) {
    try {
      const r = await fetchWithTimeout(`${inst}/api/v1/videos/${videoId}`, {
        headers: {
          "User-Agent": BROWSER_USER_AGENT,
          Accept: "application/json",
        },
      }, 9000);

      if (!r.ok) { lastError = `${inst} returned ${r.status}`; continue; }

      const data: any = await r.json();
      if (!data || data.error || (!data.formatStreams && !data.adaptiveFormats)) {
        lastError = data?.error || `${inst} returned no formats`;
        continue;
      }

      const seen = new Set<string>();
      const items: any[] = [];

      // formatStreams = combined audio+video (best for direct download)
      for (const f of (data.formatStreams || []) as InvidiousFormat[]) {
        if (!f.url) continue;
        const ext = (f.container || "mp4").toUpperCase();
        const quality = f.qualityLabel || f.resolution || "Auto";
        const sizeBytes = Number(f.size || 0);
        const key = `V|${ext}|${quality}`;
        if (seen.has(key)) continue;
        seen.add(key);
        items.push({
          type: "Video",
          mediaUrl: f.url,
          mediaExtension: ext,
          mediaQuality: quality,
          mediaRes: f.resolution || null,
          mediaFileSize: sizeBytes > 0 ? formatBytes(sizeBytes) : "Direct stream",
          mediaDuration: formatDuration(Number(data.lengthSeconds || 0)),
          mediaThumbnail: data.videoThumbnails?.[0]?.url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          directDownload: true,
          _sort: 100000 + (parseInt(quality) || 0) * 100 + 50,
        });
      }

      // adaptiveFormats — pick AUDIO ones (m4a/webm) for MP3 button
      for (const f of (data.adaptiveFormats || []) as InvidiousFormat[]) {
        if (!f.url) continue;
        const mime = (f.type || "").toLowerCase();
        const isAudio = mime.startsWith("audio/") || (!!f.audioQuality && !f.qualityLabel);
        if (!isAudio) continue;
        const ext = (f.container || (mime.includes("mp4") ? "m4a" : "webm")).toUpperCase();
        const bitrate = Number(f.bitrate || 0);
        const quality = audioQualityToK(f.audioQuality, bitrate);
        const sizeBytes = Number(f.contentLength || 0);
        const key = `A|${ext}|${quality}`;
        if (seen.has(key)) continue;
        seen.add(key);
        items.push({
          type: "Audio",
          mediaUrl: f.url,
          mediaExtension: ext,
          mediaQuality: quality,
          mediaRes: null,
          mediaFileSize: sizeBytes > 0 ? formatBytes(sizeBytes) : "Direct stream",
          mediaDuration: formatDuration(Number(data.lengthSeconds || 0)),
          mediaThumbnail: data.videoThumbnails?.[0]?.url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          directDownload: true,
          _sort: 1000 + bitrate / 1000,
        });
      }

      if (items.length === 0) { lastError = `${inst} returned no usable formats`; continue; }

      items.sort((a, b) => b._sort - a._sort);
      const cleaned = items.map(({ _sort, ...rest }) => rest);

      return {
        api: {
          title: data.title || `YouTube Video ${videoId}`,
          id: videoId,
          imagePreviewUrl:
            data.videoThumbnails?.find((t: any) => t.quality === "maxresdefault")?.url ||
            data.videoThumbnails?.[0]?.url ||
            `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
          userInfo: { name: data.author || "YouTube" },
          mediaItems: cleaned,
        },
      };
    } catch (e) {
      lastError = e instanceof Error ? e.message : "instance failed";
      continue;
    }
  }

  throw new Error(lastError);
};

// ===== Safe fallback (Open on YouTube) =====
const buildFallbackInfo = (videoId: string, message: string) => ({
  api: {
    title: `YouTube Video ${videoId}`,
    id: videoId,
    imagePreviewUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
    userInfo: { name: "YouTube" },
    mediaItems: [
      {
        type: "Video",
        mediaUrl: `https://www.youtube.com/watch?v=${videoId}`,
        mediaExtension: "MP4",
        mediaQuality: "Open",
        mediaRes: null,
        mediaFileSize: "Open on YouTube",
        mediaDuration: "",
        mediaThumbnail: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
        fallbackOpen: true,
        directDownload: true,
      },
    ],
    fallback: true,
    message,
  },
});

const fetchVideoInfo = async (url: string) => {
  const videoId = extractVideoId(url);
  if (!videoId) throw new Error("Invalid YouTube video URL");

  try {
    return await fetchFromInvidious(videoId);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Provider failed";
    return buildFallbackInfo(videoId, `Direct download unavailable: ${message}`);
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method === "GET" || req.method === "HEAD") {
    return proxyDownload(req);
  }

  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const { url } = await req.json();
    if (!url || typeof url !== "string") {
      return jsonResponse({ error: "url parameter is required" }, 400);
    }
    const data = await fetchVideoInfo(url);
    return jsonResponse(data);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return jsonResponse({ error: message }, 500);
  }
});
