import { supabase } from "@/integrations/supabase/client";

export interface YtMediaItem {
  type: "Video" | "Audio" | string;
  mediaUrl: string;
  mediaExtension: string;
  mediaQuality: string;
  mediaRes: string | null;
  mediaFileSize: string;
  mediaDuration?: string;
  mediaThumbnail?: string;
  fallbackOpen?: boolean;
  directDownload?: boolean;
}

export interface YtVideoInfo {
  title: string;
  id: string;
  imagePreviewUrl: string;
  userInfo?: { name?: string };
  mediaItems: YtMediaItem[];
}

/**
 * Normalized format used by the existing FormatCard / Bulk / Playlist UI.
 */
export interface NormalizedFormat {
  formatId: string;
  quality: string;   // e.g. "1080p (1920x1080)" / "128K"
  extension: string; // mp4 / mp3 / m4a
  size: string;      // "83.70 MB"
  url: string;       // direct download link
  fileName: string;
}

export function buildFormatLabel(item: YtMediaItem): string {
  if (item.type === "Audio") {
    return `${item.mediaExtension} – ${item.mediaQuality} – ${item.mediaFileSize}`;
  }
  const res = item.mediaRes ? ` (${item.mediaRes})` : "";
  return `${item.mediaExtension} – ${item.mediaQuality}${res} – ${item.mediaFileSize}`;
}

function sanitizeTitle(title: string): string {
  return title.replace(/[\\/:*?"<>|]+/g, "").trim().slice(0, 80) || "video";
}

function buildThumbnailUrl(info: YtVideoInfo): string {
  if (info.id) return `https://i.ytimg.com/vi/${info.id}/hqdefault.jpg`;
  return info.imagePreviewUrl || "";
}

function buildProxyDownloadUrl(mediaUrl: string, fileName: string): string {
  const endpoint = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ytdown-proxy`;
  const params = new URLSearchParams({ source: mediaUrl, fileName });
  return `${endpoint}?${params.toString()}`;
}

export function normalizeMediaItems(info: YtVideoInfo): NormalizedFormat[] {
  const safeTitle = sanitizeTitle(info.title || "video");
  return (info.mediaItems || []).map((m, i) => {
    const ext = (m.mediaExtension || "").toLowerCase();
    const fileName = `MinusFlow.net_${safeTitle}.${ext || "mp4"}`;
    const qualityLabel =
      m.type === "Audio"
        ? m.mediaQuality
        : m.mediaRes
          ? `${m.mediaQuality} (${m.mediaRes})`
          : m.mediaQuality;
    // fallbackOpen → open YouTube directly (no force-download).
    // directDownload (real media URL) → route through proxy to set Content-Disposition and bypass CORS.
    let url = "";
    if (m.fallbackOpen) {
      url = m.mediaUrl;
    } else if (m.mediaUrl) {
      url = buildProxyDownloadUrl(m.mediaUrl, fileName);
    }
    return {
      formatId: `${ext}-${m.mediaQuality}-${i}`,
      quality: qualityLabel,
      extension: ext,
      size: m.mediaFileSize || "—",
      url,
      fileName,
    };
  });
}

async function invokeYtDownProxy(youtubeUrl: string) {
  const { data: sessionData } = await supabase.auth.getSession();
  const token = sessionData.session?.access_token || import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;
  const endpoint = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ytdown-proxy`;

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ url: youtubeUrl }),
  });

  const text = await response.text();
  let payload: any = null;
  try {
    payload = text ? JSON.parse(text) : null;
  } catch {
    throw new Error("Video provider returned invalid data. Please try again.");
  }

  if (!response.ok) {
    throw new Error(payload?.error || `YouTube provider failed (${response.status}). Please retry.`);
  }

  return payload;
}

/**
 * Calls the ytdown-proxy edge function and returns the parsed `api` payload.
 */
export async function fetchVideoInfo(youtubeUrl: string): Promise<YtVideoInfo> {
  let data: any = null;
  let lastError: unknown = null;

  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      data = await invokeYtDownProxy(youtubeUrl);
      break;
    } catch (error) {
      lastError = error;
      if (attempt === 0) await new Promise((resolve) => setTimeout(resolve, 900));
    }
  }

  if (!data) {
    throw lastError instanceof Error ? lastError : new Error("Video not found");
  }

  // ytdown.to returns { api: { status, message, ... } }
  const api: any = data?.api ?? data;

  if (!api || api.status === "error") {
    throw new Error(api?.message || "Video not found");
  }

  if (!Array.isArray(api.mediaItems) || api.mediaItems.length === 0) {
    throw new Error("No downloadable formats found");
  }

  return api as YtVideoInfo;
}

/**
 * Convenience: fetch + normalize for the existing UI shape.
 */
export async function fetchAndNormalize(youtubeUrl: string) {
  const info = await fetchVideoInfo(youtubeUrl);
  return {
    title: info.title,
    thumbnail: buildThumbnailUrl(info),
    channel: info.userInfo?.name ?? "",
    duration: info.mediaItems?.[0]?.mediaDuration ?? "",
    mediaItems: normalizeMediaItems(info),
    raw: info,
  };
}
