import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  ListVideo, Loader2, CheckCircle2, XCircle, Download, Trash2,
  ChevronDown, ChevronUp, Settings2, Play, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

import { triggerBatchDownloads, triggerDownload } from "@/lib/download-manager";
import { fetchAndNormalize, type NormalizedFormat } from "@/lib/youtube-api";
import { supabase } from "@/integrations/supabase/client";

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

interface PlaylistVideoItem {
  url: string;
  status: "pending" | "fetching" | "done" | "error";
  title?: string;
  thumbnail?: string;
  formats?: NormalizedFormat[];
  selectedFormat?: number;
  expanded?: boolean;
  error?: string;
}

const extractPlaylistId = (url: string): string | null => {
  try {
    const parsed = new URL(url);
    const listParam = parsed.searchParams.get("list");
    if (listParam) return listParam;
  } catch {}
  if (/^PL[a-zA-Z0-9_-]+$/.test(url)) return url;
  return null;
};

const extractVideoIds = (text: string): string[] => {
  const ids = new Set<string>();
  // youtu.be/ID, youtube.com/watch?v=ID, /shorts/ID, /embed/ID, bare 11-char IDs
  const patterns = [
    /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|shorts\/|embed\/|v\/))([A-Za-z0-9_-]{11})/g,
    /[?&]v=([A-Za-z0-9_-]{11})/g,
    /^([A-Za-z0-9_-]{11})$/gm,
  ];
  for (const re of patterns) {
    let m: RegExpExecArray | null;
    while ((m = re.exec(text)) !== null) ids.add(m[1]);
  }
  return Array.from(ids);
};

const PlaylistDownload = () => {
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [videos, setVideos] = useState<PlaylistVideoItem[]>([]);
  const [processing, setProcessing] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [extracting, setExtracting] = useState(false);
  const [showFallback, setShowFallback] = useState(false);
  const [fallbackText, setFallbackText] = useState("");

  const startProcessingUrls = async (urls: string[]) => {
    if (urls.length === 0) {
      toast.error("No videos to process");
      return;
    }

    const items: PlaylistVideoItem[] = urls.map((u) => ({
      url: u,
      status: "pending",
      selectedFormat: 0,
    }));
    setVideos(items);
    setProcessing(true);

    for (let i = 0; i < items.length; i++) {
      setVideos((prev) =>
        prev.map((v, idx) => (idx === i ? { ...v, status: "fetching" } : v))
      );

      try {
        const result = await fetchAndNormalize(items[i].url);
        setVideos((prev) =>
          prev.map((v, idx) =>
            idx === i
              ? {
                  ...v,
                  status: "done",
                  title: result.title,
                  thumbnail: result.thumbnail,
                  formats: result.mediaItems,
                  selectedFormat: 0,
                }
              : v
          )
        );
      } catch (err: any) {
        setVideos((prev) =>
          prev.map((v, idx) =>
            idx === i ? { ...v, status: "error", error: err.message || "Failed" } : v
          )
        );
      }

      if (i < items.length - 1) await sleep(1200);
    }

    setProcessing(false);
    toast.success("Playlist fetch completed!");
  };

  const handleFetchPlaylist = async () => {
    const pid = extractPlaylistId(playlistUrl.trim());
    if (!pid) {
      toast.error("Invalid playlist URL. Please paste a valid YouTube playlist link.");
      return;
    }

    setExtracting(true);
    setVideos([]);
    setShowFallback(false);

    try {
      // Use our own edge function (InnerTube API) — reliable, no key required
      const { data, error } = await supabase.functions.invoke("youtube-playlist", {
        body: { url: playlistUrl.trim() },
      });

      if (error) throw new Error(error.message || "Failed to load playlist");
      if ((data as any)?.error) throw new Error((data as any).error);

      const playlistVideos: Array<{ videoId: string; title?: string; thumbnail?: string }> =
        (data as any)?.videos || [];

      if (playlistVideos.length === 0) throw new Error("No videos found in playlist");

      const urls = playlistVideos.map((v) => `https://www.youtube.com/watch?v=${v.videoId}`);
      toast.success(`Found ${urls.length} videos in playlist!`);
      setExtracting(false);
      await startProcessingUrls(urls);
    } catch (err: any) {
      console.warn("Playlist auto-extract failed:", err);
      setExtracting(false);
      setShowFallback(true);
      toast.message("Could not auto-load playlist", {
        description: err?.message || "Please paste the individual video URLs below.",
      });
    }
  };

  const handleFallbackSubmit = async () => {
    const ids = extractVideoIds(fallbackText);
    if (ids.length === 0) {
      toast.error("No valid YouTube video URLs found");
      return;
    }
    const urls = ids.map((id) => `https://www.youtube.com/watch?v=${id}`);
    setShowFallback(false);
    await startProcessingUrls(urls);
  };

  const clearAll = () => {
    setVideos([]);
    setPlaylistUrl("");
    setProcessing(false);
    setExtracting(false);
    setShowFallback(false);
    setFallbackText("");
  };

  const toggleExpand = (index: number) => {
    setVideos((prev) =>
      prev.map((v, idx) => (idx === index ? { ...v, expanded: !v.expanded } : v))
    );
  };

  const selectFormat = (itemIndex: number, formatIndex: number) => {
    setVideos((prev) =>
      prev.map((v, idx) => (idx === itemIndex ? { ...v, selectedFormat: formatIndex } : v))
    );
  };

  const getGlobalFormats = () => {
    const formatMap = new Map<string, string>();
    videos.forEach((v) => {
      if (v.status === "done" && v.formats) {
        v.formats.forEach((fmt) => {
          const key = `${fmt.extension}_${fmt.quality}`.toLowerCase();
          if (!formatMap.has(key)) formatMap.set(key, `${fmt.extension.toUpperCase()} ${fmt.quality}`);
        });
      }
    });
    return Array.from(formatMap.entries()).map(([key, label]) => ({ key, label }));
  };

  const applyGlobalFormat = (formatKey: string) => {
    const [ext, ...qParts] = formatKey.split("_");
    const quality = qParts.join("_");
    setVideos((prev) =>
      prev.map((v) => {
        if (v.status !== "done" || !v.formats) return v;
        const match = v.formats.findIndex(
          (f) => f.extension.toLowerCase() === ext && f.quality.toLowerCase() === quality
        );
        if (match >= 0) return { ...v, selectedFormat: match };
        const extMatch = v.formats.findIndex((f) => f.extension.toLowerCase() === ext);
        if (extMatch >= 0) return { ...v, selectedFormat: extMatch };
        return v;
      })
    );
    toast.success("Format applied to all videos");
  };

  const downloadItem = (item: PlaylistVideoItem) => {
    if (!item.formats?.length) return;
    const fmt = item.formats[item.selectedFormat ?? 0];
    if (!fmt?.url) return;

    triggerDownload({
      url: fmt.url,
      fileName: fmt.fileName || `MinusFlow.net_${item.title || "video"}.${fmt.extension}`,
    });
  };

  const downloadAll = () => {
    const doneVideos = videos.filter((v) => v.status === "done");

    const startedDownloads = triggerBatchDownloads(
      doneVideos.map((video) => {
        const selectedFormat = video.formats?.[video.selectedFormat ?? 0];

        return {
          url: selectedFormat?.url || "",
          fileName: selectedFormat?.fileName || `MinusFlow.net_${video.title || "video"}.${selectedFormat?.extension || "mp4"}`,
        };
      })
    );

    if (!startedDownloads) {
      toast.error("No downloadable files available");
      return;
    }

    toast.success(`Started ${startedDownloads} downloads`);
  };

  if (!showPlaylist) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0, duration: 0.4 }}
        className="mt-3 w-full max-w-xl"
      >
        <button
          onClick={() => setShowPlaylist(true)}
          className="glass mx-auto flex items-center gap-2 rounded-full px-5 py-2 text-xs font-medium text-muted-foreground transition-all duration-300 hover:text-foreground hover:shadow-[var(--shadow-glow)]"
        >
          <ListVideo className="h-3.5 w-3.5" />
          Playlist Download
        </button>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      className="mt-6 w-full max-w-xl"
    >
      <div className="glass rounded-xl p-4">
        <div className="mb-3 flex items-center justify-between">
          <h3 className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <ListVideo className="h-4 w-4 text-primary" />
            Playlist Download
          </h3>
          <button
            onClick={() => { setShowPlaylist(false); clearAll(); }}
            className="text-xs text-muted-foreground hover:text-foreground transition-colors"
          >
            Close
          </button>
        </div>

        {videos.length === 0 && !extracting && !processing && !showFallback ? (
          <div className="space-y-3">
            <div className="flex gap-2">
              <input
                value={playlistUrl}
                onChange={(e) => setPlaylistUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleFetchPlaylist()}
                placeholder="Paste YouTube playlist URL..."
                className="glass h-10 flex-1 rounded-lg px-3 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none"
              />
              <Button
                onClick={handleFetchPlaylist}
                disabled={!playlistUrl.trim()}
                size="sm"
                className="h-10 rounded-lg px-4 text-xs font-semibold"
              >
                <Play className="h-3.5 w-3.5 mr-1.5" />
                Load Playlist
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground text-center">
              Paste any YouTube playlist URL — videos will be extracted automatically (up to 50)
            </p>
          </div>
        ) : extracting ? (
          <div className="flex items-center justify-center gap-3 py-8">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Loading playlist videos...</span>
          </div>
        ) : showFallback ? (
          <div className="space-y-3">
            <div className="flex items-start gap-2 rounded-lg border border-amber-500/20 bg-amber-500/5 p-3">
              <AlertCircle className="h-4 w-4 flex-shrink-0 text-amber-500 mt-0.5" />
              <div className="text-xs text-muted-foreground">
                Auto-loading failed. Open the playlist on YouTube, copy the individual video URLs and paste them below (one per line).
              </div>
            </div>
            <textarea
              value={fallbackText}
              onChange={(e) => setFallbackText(e.target.value)}
              placeholder={"https://www.youtube.com/watch?v=...\nhttps://youtu.be/..."}
              className="glass w-full rounded-lg p-3 text-sm text-foreground placeholder:text-muted-foreground/50 outline-none resize-none"
              rows={6}
            />
            <div className="flex justify-between items-center">
              <span className="text-xs text-muted-foreground">
                {extractVideoIds(fallbackText).length} valid video{extractVideoIds(fallbackText).length !== 1 ? "s" : ""} detected
              </span>
              <div className="flex gap-2">
                <Button onClick={clearAll} variant="ghost" size="sm" className="h-9 text-xs text-muted-foreground">
                  Cancel
                </Button>
                <Button
                  onClick={handleFallbackSubmit}
                  disabled={extractVideoIds(fallbackText).length === 0}
                  size="sm"
                  className="h-9 rounded-lg px-4 text-xs font-semibold"
                >
                  Fetch Videos
                </Button>
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
              {videos.map((item, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="glass rounded-lg overflow-hidden"
                >
                  <div className="flex items-center gap-3 p-3">
                    <span className="flex-shrink-0 text-[10px] font-bold text-muted-foreground/50 w-4 text-right">
                      {i + 1}
                    </span>

                    <div className="flex-shrink-0">
                      {item.status === "pending" && <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />}
                      {item.status === "fetching" && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
                      {item.status === "done" && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
                      {item.status === "error" && <XCircle className="h-5 w-5 text-destructive" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      {item.thumbnail && item.status === "done" ? (
                        <div className="flex items-center gap-2">
                          <img src={item.thumbnail} alt="" loading="lazy" className="h-10 w-16 flex-shrink-0 rounded object-cover" />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-xs font-medium text-foreground">{item.title || "Untitled"}</p>
                            <p className="text-[10px] text-muted-foreground">
                              {item.formats?.[item.selectedFormat ?? 0]?.quality || ""}{" "}
                              <span className="uppercase">{item.formats?.[item.selectedFormat ?? 0]?.extension}</span>
                              {" · "}{item.formats?.[item.selectedFormat ?? 0]?.size || ""}
                            </p>
                          </div>
                        </div>
                      ) : (
                        <p className="truncate text-xs text-muted-foreground">{item.error || item.url}</p>
                      )}
                    </div>

                    {item.status === "done" && item.formats?.length && (
                      <div className="flex items-center gap-1 flex-shrink-0">
                        <button
                          onClick={() => toggleExpand(i)}
                          className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:text-foreground hover:bg-muted/20"
                        >
                          {item.expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                        </button>
                        <button
                          onClick={() => downloadItem(item)}
                          className="rounded-lg bg-primary/10 p-2 text-primary transition-colors hover:bg-primary/20"
                        >
                          <Download className="h-4 w-4" />
                        </button>
                      </div>
                    )}
                  </div>

                  <AnimatePresence>
                    {item.expanded && item.formats && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-border/20 px-3 py-2 space-y-1 max-h-[200px] overflow-y-auto">
                          {item.formats.map((fmt, fi) => {
                            const isSelected = (item.selectedFormat ?? 0) === fi;
                            return (
                              <button
                                key={fi}
                                onClick={() => selectFormat(i, fi)}
                                className={`w-full flex items-center justify-between rounded-md px-3 py-2 text-xs transition-all ${
                                  isSelected
                                    ? "bg-primary/15 text-primary ring-1 ring-primary/30"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/10"
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <span className="rounded bg-muted/20 px-1.5 py-0.5 text-[10px] font-bold uppercase">{fmt.extension}</span>
                                  <span className="font-medium">{fmt.quality || fmt.formatId}</span>
                                </div>
                                <span className="text-[10px]">{fmt.size || "—"}</span>
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>

            {!processing && videos.some((v) => v.status === "done") && (
              <div className="mt-3 flex flex-wrap items-center gap-2 rounded-lg border border-border/20 bg-muted/5 p-2.5">
                <Settings2 className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                <span className="text-[10px] text-muted-foreground font-medium flex-shrink-0">Apply to all:</span>
                <select
                  onChange={(e) => { if (e.target.value) applyGlobalFormat(e.target.value); }}
                  defaultValue=""
                  className="glass h-7 rounded-md px-2 text-[11px] text-foreground outline-none cursor-pointer flex-1 min-w-[120px]"
                >
                  <option value="" disabled>Select format…</option>
                  {getGlobalFormats().map((f) => (
                    <option key={f.key} value={f.key}>{f.label}</option>
                  ))}
                </select>
              </div>
            )}

            <div className="mt-2 flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {videos.filter((v) => v.status === "done").length}/{videos.length} completed
              </span>
              <div className="flex gap-2">
                {!processing && (
                  <Button onClick={clearAll} variant="ghost" size="sm" className="h-8 gap-1.5 text-xs text-muted-foreground">
                    <Trash2 className="h-3.5 w-3.5" />
                    Clear
                  </Button>
                )}
                {!processing && videos.some((v) => v.status === "done") && (
                  <Button
                    onClick={downloadAll}
                    size="sm"
                    className="h-8 gap-1.5 text-xs font-semibold"
                  >
                    <Download className="h-3.5 w-3.5" />
                    Download All
                  </Button>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </motion.div>
  );
};

export default PlaylistDownload;
