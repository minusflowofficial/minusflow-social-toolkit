import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Copy, Check, Trash2, Clock, Image, Package } from "lucide-react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

interface ThumbnailInfo {
  label: string;
  quality: string;
  jpgUrl: string;
  webpUrl: string | null;
  available: boolean;
}

interface HistoryItem {
  videoId: string;
  timestamp: number;
}

const HISTORY_KEY = "mf-thumb-history";
const MAX_HISTORY = 10;

const extractVideoId = (input: string): string | null => {
  const trimmed = input.trim();
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) return trimmed;
  const patterns = [
    /(?:youtube\.com\/watch\?.*v=)([a-zA-Z0-9_-]{11})/,
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/shorts\/)([a-zA-Z0-9_-]{11})/,
    /(?:youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/,
  ];
  for (const p of patterns) {
    const m = trimmed.match(p);
    if (m) return m[1];
  }
  return null;
};

const buildThumbnails = (videoId: string): ThumbnailInfo[] => [
  { label: "Full HD", quality: "1280×720", jpgUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`, webpUrl: `https://img.youtube.com/vi_webp/${videoId}/maxresdefault.webp`, available: true },
  { label: "HQ", quality: "480×360", jpgUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`, webpUrl: `https://img.youtube.com/vi_webp/${videoId}/hqdefault.webp`, available: true },
  { label: "MQ", quality: "320×180", jpgUrl: `https://img.youtube.com/vi/${videoId}/mqdefault.jpg`, webpUrl: null, available: true },
  { label: "SD", quality: "640×480", jpgUrl: `https://img.youtube.com/vi/${videoId}/sddefault.jpg`, webpUrl: `https://img.youtube.com/vi_webp/${videoId}/sddefault.webp`, available: true },
  { label: "Small", quality: "120×90", jpgUrl: `https://img.youtube.com/vi/${videoId}/default.jpg`, webpUrl: null, available: true },
];

const ThumbnailDownloader = () => {
  const [url, setUrl] = useState("");
  const [videoId, setVideoId] = useState<string | null>(null);
  const [thumbnails, setThumbnails] = useState<ThumbnailInfo[]>([]);
  const [error, setError] = useState("");
  const [useWebp, setUseWebp] = useState(false);
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);
  const [downloading, setDownloading] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    try {
      const stored = JSON.parse(localStorage.getItem(HISTORY_KEY) || "[]");
      setHistory(stored);
    } catch { /* ignore */ }
  }, []);

  const saveHistory = (items: HistoryItem[]) => {
    setHistory(items);
    localStorage.setItem(HISTORY_KEY, JSON.stringify(items));
  };

  const addToHistory = (id: string) => {
    const filtered = history.filter((h) => h.videoId !== id);
    const next = [{ videoId: id, timestamp: Date.now() }, ...filtered].slice(0, MAX_HISTORY);
    saveHistory(next);
  };

  const handleFetch = useCallback((input: string) => {
    setError("");
    setThumbnails([]);
    setVideoId(null);
    const id = extractVideoId(input);
    if (!id) {
      if (input.trim()) setError("Please enter a valid YouTube URL");
      return;
    }
    setVideoId(id);
    const thumbs = buildThumbnails(id);

    // Check if maxresdefault exists
    const img = new window.Image();
    img.onload = () => {
      if (img.naturalWidth <= 120) {
        thumbs[0].available = false;
      }
      setThumbnails(thumbs);
      addToHistory(id);
    };
    img.onerror = () => {
      thumbs[0].available = false;
      setThumbnails(thumbs);
      addToHistory(id);
    };
    img.src = thumbs[0].jpgUrl;
  }, [history]);

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text");
    setTimeout(() => handleFetch(pasted), 50);
  };

  const getDownloadUrl = (t: ThumbnailInfo) => {
    if (useWebp && t.webpUrl) return t.webpUrl;
    return t.jpgUrl;
  };

  const getExt = (t: ThumbnailInfo) => (useWebp && t.webpUrl ? "webp" : "jpg");

  const downloadSingle = async (t: ThumbnailInfo) => {
    const imgUrl = getDownloadUrl(t);
    const ext = getExt(t);
    try {
      const res = await fetch(imgUrl);
      const blob = await res.blob();
      saveAs(blob, `MinusFlow.net_thumbnail_${videoId}_${t.label.toLowerCase().replace(/\s/g, "")}.${ext}`);
    } catch {
      window.open(imgUrl, "_blank");
    }
  };

  const copyUrl = (t: ThumbnailInfo, idx: number) => {
    navigator.clipboard.writeText(getDownloadUrl(t));
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1500);
  };

  const downloadAll = async () => {
    if (!videoId) return;
    setDownloading(true);
    try {
      const zip = new JSZip();
      const available = thumbnails.filter((t) => t.available);
      await Promise.all(
        available.map(async (t) => {
          const imgUrl = getDownloadUrl(t);
          const ext = getExt(t);
          const res = await fetch(imgUrl);
          const blob = await res.blob();
          zip.file(`MinusFlow.net_thumbnail_${videoId}_${t.label.toLowerCase().replace(/\s/g, "")}.${ext}`, blob);
        })
      );
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, `MinusFlow.net_thumbnails_${videoId}.zip`);
    } catch {
      // fallback individual downloads
      for (const t of thumbnails.filter((x) => x.available)) {
        await downloadSingle(t);
      }
    }
    setDownloading(false);
  };

  const clearHistory = () => saveHistory([]);

  const availableThumbs = thumbnails.filter((t) => t.available);

  return (
    <div className="relative min-h-screen bg-background">
      <Header />
      <main className="mx-auto max-w-4xl px-4 pb-20 pt-8 sm:px-6">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-10 text-center"
        >
          <div className="mb-4 inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
            <Image className="h-4 w-4" />
            Free • No Login Required
          </div>
          <h1 className="mb-3 text-3xl font-bold tracking-tight text-foreground sm:text-4xl">
            YT Thumbnail Grabber
          </h1>
          <p className="text-muted-foreground">
            Download any YouTube thumbnail in seconds — all sizes, JPG & WebP
          </p>
        </motion.div>

        {/* Input */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4, delay: 0.1 }}
          className="glass input-glow mb-8 rounded-2xl p-5"
        >
          <div className="flex gap-3">
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onPaste={handlePaste}
              onKeyDown={(e) => e.key === "Enter" && handleFetch(url)}
              placeholder="Paste YouTube URL here..."
              className="h-12 border-white/10 bg-white/5 text-foreground placeholder:text-muted-foreground"
            />
            <Button
              onClick={() => handleFetch(url)}
              className="h-12 shrink-0 bg-primary px-6 text-primary-foreground hover:bg-primary/90"
            >
              Get Thumbnails
            </Button>
          </div>
          {error && (
            <p className="mt-3 text-sm text-destructive">{error}</p>
          )}
        </motion.div>

        {/* Results */}
        <AnimatePresence>
          {availableThumbs.length > 0 && videoId && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
            >
              {/* Controls bar */}
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">JPG</span>
                  <Switch checked={useWebp} onCheckedChange={setUseWebp} />
                  <span className="text-sm text-muted-foreground">WebP</span>
                </div>
                <Button
                  onClick={downloadAll}
                  disabled={downloading}
                  variant="outline"
                  className="gap-2 border-primary/30 text-primary hover:bg-primary/10"
                >
                  <Package className="h-4 w-4" />
                  {downloading ? "Zipping..." : "Download All (ZIP)"}
                </Button>
              </div>

              {/* Grid */}
              <div className="grid gap-4 sm:grid-cols-2">
                {availableThumbs.map((t, i) => (
                  <motion.div
                    key={t.label}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.3, delay: i * 0.05 }}
                    className="glass group overflow-hidden rounded-xl"
                  >
                    <div className="relative aspect-video overflow-hidden">
                      <img
                        src={getDownloadUrl(t)}
                        alt={`${t.label} thumbnail`}
                        className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                        loading="lazy"
                      />
                      <div className="absolute left-2 top-2 rounded-md bg-black/70 px-2 py-0.5 text-xs font-semibold text-white backdrop-blur-sm">
                        {t.label} • {t.quality}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 p-3">
                      <Button
                        size="sm"
                        onClick={() => downloadSingle(t)}
                        className="flex-1 gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
                      >
                        <Download className="h-3.5 w-3.5" />
                        Download {getExt(t).toUpperCase()}
                      </Button>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-8 w-8 border-white/10"
                        onClick={() => copyUrl(t, i)}
                      >
                        {copiedIdx === i ? <Check className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                      </Button>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* History */}
        {history.length > 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="mt-12"
          >
            <div className="mb-3 flex items-center justify-between">
              <h2 className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                <Clock className="h-4 w-4" />
                Recent Searches
              </h2>
              <button onClick={clearHistory} className="text-xs text-muted-foreground hover:text-destructive">
                <Trash2 className="inline h-3 w-3" /> Clear
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {history.map((h) => (
                <button
                  key={h.videoId}
                  onClick={() => {
                    setUrl(`https://youtu.be/${h.videoId}`);
                    handleFetch(`https://youtu.be/${h.videoId}`);
                  }}
                  className="group flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-2 py-1.5 transition-colors hover:border-primary/30"
                >
                  <img
                    src={`https://img.youtube.com/vi/${h.videoId}/default.jpg`}
                    alt=""
                    className="h-8 w-14 rounded object-cover"
                  />
                  <span className="text-xs text-muted-foreground group-hover:text-foreground">{h.videoId}</span>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </main>
      <Footer />
    </div>
  );
};

export default ThumbnailDownloader;
