import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Download, Loader2, Music, Film, AlertCircle, DownloadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

interface TikTokResult {
  title: string;
  author: string;
  thumbnail: string;
  download_url_no_watermark: string;
  download_url_watermark: string;
  download_url_mp3: string;
  error?: string;
}

interface BulkItem {
  url: string;
  status: "pending" | "loading" | "success" | "error";
  result?: TikTokResult;
  error?: string;
}

const downloadVideo = async (url: string): Promise<TikTokResult> => {
  const { data, error } = await supabase.functions.invoke("tiktok-download", {
    body: { url: url.trim() },
  });
  if (error) throw new Error(error.message || "Failed to fetch video");
  if (data?.error) throw new Error(data.error);
  return data;
};

const sanitizeFilename = (name: string) =>
  name.replace(/[^a-zA-Z0-9_\-. ]/g, "").slice(0, 80) || "video";

const buildProxyUrl = (mediaUrl: string, title: string, ext: string) => {
  const base = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tiktok-download`;
  const filename = `MinusFlow.net_${sanitizeFilename(title)}.${ext}`;
  return `${base}?url=${encodeURIComponent(mediaUrl)}&filename=${encodeURIComponent(filename)}`;
};

const openDownload = (mediaUrl: string, title = "video", ext = "mp4") => {
  if (!mediaUrl) {
    toast.error("Download link not available");
    return;
  }
  window.open(buildProxyUrl(mediaUrl, title, ext), "_blank", "noopener,noreferrer");
};

/* ─── Result Card ─── */
const ResultCard = ({ result }: { result: TikTokResult }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex flex-col sm:flex-row gap-4 rounded-xl border border-border bg-card p-4"
  >
    {result.thumbnail && (
      <img
        src={result.thumbnail}
        alt={result.title}
        className="h-28 w-28 flex-shrink-0 rounded-lg object-cover"
      />
    )}
    <div className="flex flex-1 flex-col gap-3">
      <div>
        <p className="font-semibold text-foreground line-clamp-2">{result.title}</p>
        {result.author && (
          <p className="text-sm text-muted-foreground">{result.author}</p>
        )}
      </div>
      <div className="flex flex-wrap gap-2">
        <Button
          size="sm"
          onClick={() => openDownload(result.download_url_no_watermark)}
          className="gap-1.5 bg-[hsl(348,98%,57%)] hover:bg-[hsl(348,98%,50%)] text-white"
        >
          <Film className="h-3.5 w-3.5" /> MP4 No Watermark
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => openDownload(result.download_url_watermark)}
          className="gap-1.5"
        >
          <Film className="h-3.5 w-3.5" /> MP4 With Watermark
        </Button>
        <Button
          size="sm"
          variant="secondary"
          onClick={() => openDownload(result.download_url_mp3)}
          className="gap-1.5"
        >
          <Music className="h-3.5 w-3.5" /> MP3 Audio
        </Button>
      </div>
    </div>
  </motion.div>
);

/* ─── Single Download Tab ─── */
const SingleTab = () => {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TikTokResult | null>(null);
  const [error, setError] = useState("");

  const handleFetch = async () => {
    if (!url.trim()) {
      toast.error("Please paste a TikTok URL");
      return;
    }
    setLoading(true);
    setResult(null);
    setError("");
    try {
      const data = await downloadVideo(url);
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Failed to fetch video");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <input
          placeholder="Paste TikTok video URL here..."
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleFetch()}
          className="h-12 flex-1 rounded-xl border border-border bg-card px-4 text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-[hsl(348,98%,57%)]/40 transition-all"
        />
        <Button
          onClick={handleFetch}
          disabled={loading}
          className="h-12 rounded-xl px-6 font-semibold bg-[hsl(348,98%,57%)] hover:bg-[hsl(348,98%,50%)] text-white"
        >
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Download className="h-4 w-4 mr-1.5" /> Download
            </>
          )}
        </Button>
      </div>

      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive"
        >
          <AlertCircle className="h-4 w-4 flex-shrink-0" /> {error}
        </motion.div>
      )}

      <AnimatePresence>
        {loading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="space-y-3"
          >
            <div className="flex gap-4 rounded-xl border border-border bg-card p-4">
              <div className="h-28 w-28 animate-pulse rounded-lg bg-muted" />
              <div className="flex-1 space-y-3 py-2">
                <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
                <div className="flex gap-2 pt-2">
                  <div className="h-8 w-32 animate-pulse rounded bg-muted" />
                  <div className="h-8 w-32 animate-pulse rounded bg-muted" />
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {result && <ResultCard result={result} />}
    </div>
  );
};

/* ─── Bulk Download Tab ─── */
const BulkTab = () => {
  const [text, setText] = useState("");
  const [items, setItems] = useState<BulkItem[]>([]);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleBulk = async () => {
    const urls = text
      .split("\n")
      .map((u) => u.trim())
      .filter(Boolean);
    if (!urls.length) {
      toast.error("Please paste at least one URL");
      return;
    }
    if (urls.length > 20) {
      toast.error("Maximum 20 URLs at a time");
      return;
    }

    setProcessing(true);
    const initial: BulkItem[] = urls.map((u) => ({ url: u, status: "pending" }));
    setItems(initial);

    const results = [...initial];
    for (let i = 0; i < urls.length; i++) {
      setProgress({ current: i + 1, total: urls.length });
      results[i] = { ...results[i], status: "loading" };
      setItems([...results]);

      try {
        const data = await downloadVideo(urls[i]);
        results[i] = { ...results[i], status: "success", result: data };
      } catch (err: any) {
        results[i] = { ...results[i], status: "error", error: err.message };
      }
      setItems([...results]);

      if (i < urls.length - 1) {
        await new Promise((r) => setTimeout(r, 1200));
      }
    }
    setProcessing(false);
    setProgress(null);
  };

  return (
    <div className="space-y-6">
      <textarea
        placeholder="Paste multiple TikTok URLs, one per line (max 20)"
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={5}
        className="w-full rounded-xl border border-border bg-card px-4 py-3 text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-[hsl(348,98%,57%)]/40 resize-none transition-all"
      />
      <Button
        onClick={handleBulk}
        disabled={processing}
        className="w-full h-12 rounded-xl font-semibold bg-[hsl(348,98%,57%)] hover:bg-[hsl(348,98%,50%)] text-white"
      >
        {processing ? (
          <span className="flex items-center gap-2">
            <Loader2 className="h-4 w-4 animate-spin" /> Processing…
          </span>
        ) : (
          <>
            <Download className="h-4 w-4 mr-1.5" /> Download All
          </>
        )}
      </Button>

      {progress && (
        <div className="space-y-2">
          <p className="text-sm text-muted-foreground">
            Processing {progress.current} of {progress.total} videos…
          </p>
          <Progress
            value={(progress.current / progress.total) * 100}
            className="h-2"
          />
        </div>
      )}

      <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
        {items.map((item, i) => (
          <div key={i}>
            {item.status === "loading" && (
              <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-4">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                <p className="text-sm text-muted-foreground truncate">{item.url}</p>
              </div>
            )}
            {item.status === "error" && (
              <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/5 p-4">
                <AlertCircle className="h-5 w-5 text-destructive flex-shrink-0" />
                <div className="min-w-0">
                  <p className="text-sm text-foreground truncate">{item.url}</p>
                  <p className="text-xs text-destructive">{item.error}</p>
                </div>
              </div>
            )}
            {item.status === "success" && item.result && (
              <ResultCard result={item.result} />
            )}
            {item.status === "pending" && (
              <div className="flex items-center gap-3 rounded-xl border border-border bg-card/50 p-4 opacity-50">
                <div className="h-5 w-5 rounded-full border-2 border-muted-foreground/30" />
                <p className="text-sm text-muted-foreground truncate">{item.url}</p>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

/* ─── Main Page ─── */
const TikTokDownloader = () => {
  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Header />

      <main className="flex flex-1 flex-col items-center px-4 py-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-2xl space-y-8"
        >
          {/* Hero */}
          <div className="text-center space-y-2">
            <h1 className="text-3xl font-bold text-foreground md:text-4xl">
              TikTok Downloader{" "}
              <span className="text-[hsl(348,98%,57%)]">Pro</span>
            </h1>
            <p className="text-muted-foreground">
              Download TikTok videos without watermark — fast, free, no sign-up.
            </p>
          </div>

          {/* Tabs */}
          <Tabs defaultValue="single" className="w-full">
            <TabsList className="grid w-full grid-cols-2 rounded-xl bg-card">
              <TabsTrigger value="single" className="rounded-lg">
                Single Download
              </TabsTrigger>
              <TabsTrigger value="bulk" className="rounded-lg">
                Bulk Download
              </TabsTrigger>
            </TabsList>
            <TabsContent value="single" className="mt-6">
              <SingleTab />
            </TabsContent>
            <TabsContent value="bulk" className="mt-6">
              <BulkTab />
            </TabsContent>
          </Tabs>
        </motion.div>
      </main>

      <Footer />
    </div>
  );
};

export default TikTokDownloader;
