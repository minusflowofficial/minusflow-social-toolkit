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

export function normalizeMediaItems(info: YtVideoInfo): NormalizedFormat[] {
  const safeTitle = sanitizeTitle(info.title || "video");
  return (info.mediaItems || []).map((m, i) => {
    const ext = (m.mediaExtension || "").toLowerCase();
    const qualityLabel =
      m.type === "Audio"
        ? m.mediaQuality
        : m.mediaRes
          ? `${m.mediaQuality} (${m.mediaRes})`
          : m.mediaQuality;
    return {
      formatId: `${ext}-${m.mediaQuality}-${i}`,
      quality: qualityLabel,
      extension: ext,
      size: m.mediaFileSize || "—",
      url: m.mediaUrl,
      fileName: `MinusFlow.net_${safeTitle}.${ext}`,
    };
  });
}

/**
 * Calls the ytdown-proxy edge function and returns the parsed `api` payload.
 */
export async function fetchVideoInfo(youtubeUrl: string): Promise<YtVideoInfo> {
  const { data, error } = await supabase.functions.invoke("ytdown-proxy", {
    body: { url: youtubeUrl },
  });

  if (error) throw new Error(error.message || "Edge function error");

  // ytdown.to returns { api: { status, message, ... } }
  const api: any = (data as any)?.api ?? data;

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
    thumbnail: info.imagePreviewUrl,
    channel: info.userInfo?.name ?? "",
    duration: info.mediaItems?.[0]?.mediaDuration ?? "",
    mediaItems: normalizeMediaItems(info),
    raw: info,
  };
}
