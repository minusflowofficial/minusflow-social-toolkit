export interface TranscriptLine {
  text: string;
  start: number;
  duration: number;
}

export interface TranscriptResult {
  video_id: string;
  title: string;
  author: string;
  thumbnail: string;
  duration: number;
  language: string;
  available_languages: { code: string; name: string }[];
  transcript: TranscriptLine[];
}

export interface HistoryItem {
  videoId: string;
  title: string;
  author: string;
  thumbnail: string;
  wordCount: number;
  fetchedAt: string;
  transcriptPreview: string;
}

const HISTORY_KEY = "yt_transcript_history";
const MAX_HISTORY = 50;

export const formatTime = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
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

export const exportJson = (lines: TranscriptLine[]): string =>
  JSON.stringify(lines, null, 2);

export const downloadFile = (content: string, filename: string, mime: string) => {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
};

export const getHistory = (): HistoryItem[] => {
  try {
    return JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
  } catch {
    return [];
  }
};

export const saveToHistory = (result: TranscriptResult) => {
  const history = getHistory();
  const existing = history.findIndex((h) => h.videoId === result.video_id);
  if (existing !== -1) history.splice(existing, 1);

  const wordCount = result.transcript.reduce(
    (acc, l) => acc + l.text.split(/\s+/).length,
    0
  );

  history.unshift({
    videoId: result.video_id,
    title: result.title,
    author: result.author,
    thumbnail: result.thumbnail,
    wordCount,
    fetchedAt: new Date().toISOString(),
    transcriptPreview: result.transcript
      .slice(0, 3)
      .map((l) => l.text)
      .join(" ")
      .slice(0, 120),
  });

  localStorage.setItem(HISTORY_KEY, JSON.stringify(history.slice(0, MAX_HISTORY)));
};

export const removeFromHistory = (videoId: string) => {
  const history = getHistory().filter((h) => h.videoId !== videoId);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(history));
};

export const clearHistory = () => {
  localStorage.removeItem(HISTORY_KEY);
};

export const getWordCount = (lines: TranscriptLine[]): number =>
  lines.reduce((acc, l) => acc + l.text.split(/\s+/).filter(Boolean).length, 0);

export const formatDuration = (seconds: number): string => {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
};
