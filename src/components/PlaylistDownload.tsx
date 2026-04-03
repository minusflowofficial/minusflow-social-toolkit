import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import {
  ListVideo, Loader2, CheckCircle2, XCircle, Download, Trash2,
  ChevronDown, ChevronUp, Settings2, Play
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

import { triggerBatchDownloads, triggerDownload } from "@/lib/download-manager";

interface PlaylistFormat {
  formatId: string;
  quality: string;
  extension: string;
  size: string;
  url: string;
  fileName?: string;
}

interface PlaylistVideoItem {
  url: string;
  status: "pending" | "fetching" | "done" | "error";
  title?: string;
  thumbnail?: string;
  formats?: PlaylistFormat[];
  selectedFormat?: number;
  expanded?: boolean;
  error?: string;
}

const PlaylistDownload = () => {
  const [playlistUrl, setPlaylistUrl] = useState("");
  const [videos, setVideos] = useState<PlaylistVideoItem[]>([]);
  const [processing, setProcessing] = useState(false);
  const [showPlaylist, setShowPlaylist] = useState(false);
  const [extracting, setExtracting] = useState(false);

  const extractPlaylistId = (url: string): string | null => {
    try {
      const parsed = new URL(url);
      const listParam = parsed.searchParams.get("list");
      if (listParam) return listParam;
    } catch {}
    if (/^PL[a-zA-Z0-9_-]+$/.test(url)) return url;
    return null;
  };

  const handleFetchPlaylist = async () => {
    const pid = extractPlaylistId(playlistUrl.trim());
    if (!pid) {
      toast.error("Invalid playlist URL. Please paste a valid YouTube playlist link.");
      return;
    }

    setExtracting(true);
    setVideos([]);

    try {
      // Step 1: Extract video URLs from playlist
      const { data: playlistData, error: playlistError } = await supabase.functions.invoke(
        "youtube-download",
        { body: { url: playlistUrl.trim(), action: "extract_playlist" } }
      );

      if (playlistError) throw playlistError;
      if (!playlistData?.videoUrls?.length) {
        toast.error("No videos found in this playlist");
        setExtracting(false);
        return;
      }

      toast.success(`Found ${playlistData.videoUrls.length} videos in playlist!`);

      // Step 2: Create items and fetch each video
      const items: PlaylistVideoItem[] = playlistData.videoUrls.map((vUrl: string) => ({
        url: vUrl,
        status: "pending" as const,
        selectedFormat: 0,
      }));
      setVideos(items);
      setExtracting(false);
      setProcessing(true);

      // Fetch each video sequentially
      for (let i = 0; i < items.length; i++) {
        setVideos((prev) =>
          prev.map((v, idx) => (idx === i ? { ...v, status: "fetching" } : v))
        );

        try {
          const { data, error } = await supabase.functions.invoke("youtube-download", {
            body: { url: items[i].url },
          });
          if (error) throw error;
          if (!data?.mediaItems?.length) throw new Error("No formats found");

          setVideos((prev) =>
            prev.map((v, idx) =>
              idx === i
                ? { ...v, status: "done", title: data.title, thumbnail: data.thumbnail, formats: data.mediaItems, selectedFormat: 0 }
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
      }

      setProcessing(false);
      toast.success("Playlist fetch completed!");
    } catch (err: any) {
      toast.error(err.message || "Failed to extract playlist");
      setExtracting(false);
    }
  };




  const clearAll = () => {
    setVideos([]);
    setPlaylistUrl("");
    setProcessing(false);
    setExtracting(false);
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

        {videos.length === 0 && !extracting && !processing ? (
          <div className="space-y-3">
            {/* Playlist URL input */}
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
                Fetch
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground text-center">
              Paste any YouTube playlist URL — all videos will be extracted automatically
            </p>
          </div>
        ) : extracting ? (
          <div className="flex items-center justify-center gap-3 py-8">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="text-sm text-muted-foreground">Extracting playlist videos...</span>
          </div>
        ) : (
          <>
            {/* Video list */}
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
                    {/* Index number */}
                    <span className="flex-shrink-0 text-[10px] font-bold text-muted-foreground/50 w-4 text-right">
                      {i + 1}
                    </span>

                    {/* Status */}
                    <div className="flex-shrink-0">
                      {item.status === "pending" && <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />}
                      {item.status === "fetching" && <Loader2 className="h-5 w-5 animate-spin text-primary" />}
                      {item.status === "done" && <CheckCircle2 className="h-5 w-5 text-emerald-500" />}
                      {item.status === "error" && <XCircle className="h-5 w-5 text-destructive" />}
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      {item.thumbnail && item.status === "done" ? (
                        <div className="flex items-center gap-2">
                          <img src={item.thumbnail} alt="" className="h-10 w-16 flex-shrink-0 rounded object-cover" />
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

                    {/* Actions */}
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

                  {/* Format picker */}
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

            {/* Global format selector */}
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

            {/* Actions bar */}
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
