export interface TranscriptLine {
  start: number;
  duration: number;
  text: string;
}

export interface TranscriptResult {
  success: boolean;
  videoId: string;
  title: string;
  author: string;
  duration: number;
  language: string;
  thumbnail: string;
  availableTracks: { languageCode: string; name: string }[];
  transcript: TranscriptLine[];
}

export interface HistoryItem {
  videoId: string;
  title: string;
  thumbnail: string;
  fetchedAt: string;
  wordCount: number;
}

const HISTORY_KEY = "yt_history";
const MAX_HISTORY = 20;

export function extractVideoId(input: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/shorts\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
    /^([a-zA-Z0-9_-]{11})$/,
  ];
  for (const pattern of patterns) {
    const match = input.match(pattern);
    if (match) return match[1];
  }
  return null;
}

export const formatTime = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  return `${m}:${s.toString().padStart(2, "0")}`;
};

export const formatSrtTime = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")},${ms.toString().padStart(3, "0")}`;
};

export const exportTxt = (lines: TranscriptLine[]): string =>
  lines.map((l) => `[${formatTime(l.start)}] ${l.text}`).join("\n");

export const exportSrt = (lines: TranscriptLine[]): string =>
  lines
    .map((l, i) => {
      const end = l.start + l.duration;
      return `${i + 1}\n${formatSrtTime(l.start)} --> ${formatSrtTime(end)}\n${l.text}\n`;
    })
    .join("\n");

export const downloadFile = (content: string, filename: string, mime: string) => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export const getWordCount = (lines: TranscriptLine[]): number =>
  lines.reduce((acc, l) => acc + l.text.split(/\s+/).filter(Boolean).length, 0);

export const formatDuration = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
};

export const getHistory = (): HistoryItem[] => {
  try { return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]"); }
  catch { return []; }
};

export const saveToHistory = (result: TranscriptResult) => {
  const history = getHistory().filter((h) => h.videoId !== result.videoId);
  history.unshift({
    videoId: result.videoId,
    title: result.title,
    thumbnail: result.thumbnail,
    fetchedAt: new Date().toISOString(),
    wordCount: getWordCount(result.transcript),
  });
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
};

export const removeFromHistory = (videoId: string) => {
  localStorage.setItem(
    HISTORY_KEY,
    JSON.stringify(getHistory().filter((h) => h.videoId !== videoId))
  );
};

export const clearHistory = () => localStorage.removeItem(HISTORY_KEY);
