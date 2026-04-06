import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Download, Loader2, Music, Film, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ScrollProgress from "@/components/ScrollProgress";

interface TikTokResult {
  title: string;
  author: string;
  thumbnail: string;
  download_url_no_watermark: string;
  download_url_watermark: string;
  download_url_mp3: string;
  error?: string;
}

const sanitizeFilename = (name: string) =>
  name.replace(/[^a-zA-Z0-9_\-. ]/g, "").slice(0, 80) || "video";

const buildProxyUrl = (mediaUrl: string, title: string, ext: string) => {
  const base = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tiktok-download`;
  const filename = `MinusFlow.net_${sanitizeFilename(title)}.${ext}`;
  return `${base}?url=${encodeURIComponent(mediaUrl)}&filename=${encodeURIComponent(filename)}`;
};

const triggerIframeDownload = (url: string) => {
  const iframe = document.createElement("iframe");
  iframe.style.display = "none";
  iframe.src = url;
  document.body.appendChild(iframe);
  setTimeout(() => iframe.remove(), 60000);
};

const openDownload = (mediaUrl: string, title = "video", ext = "mp4") => {
  if (!mediaUrl) {
    toast.error("Download link not available");
    return;
  }
  triggerIframeDownload(buildProxyUrl(mediaUrl, title, ext));
  toast.success("Download started!");
};

const TikTokSingleDownloader = () => {
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
      const { data, error: err } = await supabase.functions.invoke("tiktok-download", {
        body: { url: url.trim() },
      });
      if (err) throw new Error(err.message);
      if (data?.error) throw new Error(data.error);
      setResult(data);
    } catch (err: any) {
      setError(err.message || "Failed to fetch video");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[hsl(var(--background))]">
      <ScrollProgress />
      <Header />

      <main className="relative z-10 mx-auto max-w-2xl px-4 pb-20 pt-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[hsl(348,98%,57%)]/10">
            <Music className="h-8 w-8 text-[hsl(348,98%,57%)]" />
          </div>
          <h1 className="mb-2 text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
            TikTok Video{" "}
            <span className="bg-gradient-to-r from-[hsl(348,98%,57%)] to-[hsl(175,100%,50%)] bg-clip-text text-transparent">
              Downloader
            </span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Download TikTok videos without watermark — MP4 and MP3 formats available.
          </p>
        </motion.div>

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
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <><Download className="h-4 w-4 mr-1.5" /> Download</>}
            </Button>
          </div>

          {error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2 rounded-lg border border-destructive/50 bg-destructive/10 p-3 text-sm text-destructive">
              <AlertCircle className="h-4 w-4 flex-shrink-0" /> {error}
            </motion.div>
          )}

          <AnimatePresence>
            {loading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="space-y-3">
                <div className="flex gap-4 rounded-xl border border-border bg-card p-4">
                  <div className="h-28 w-28 animate-pulse rounded-lg bg-muted" />
                  <div className="flex-1 space-y-3 py-2">
                    <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
                    <div className="h-3 w-1/3 animate-pulse rounded bg-muted" />
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {result && (
            <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row gap-4 rounded-xl border border-border bg-card p-4">
              {result.thumbnail && <img src={result.thumbnail} alt={result.title} className="h-28 w-28 flex-shrink-0 rounded-lg object-cover" />}
              <div className="flex flex-1 flex-col gap-3">
                <div>
                  <p className="font-semibold text-foreground line-clamp-2">{result.title}</p>
                  {result.author && <p className="text-sm text-muted-foreground">{result.author}</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" onClick={() => openDownload(result.download_url_no_watermark, result.title, "mp4")} className="gap-1.5 bg-[hsl(348,98%,57%)] hover:bg-[hsl(348,98%,50%)] text-white">
                    <Film className="h-3.5 w-3.5" /> MP4 No Watermark
                  </Button>
                  <Button size="sm" variant="secondary" disabled={!result.download_url_watermark} onClick={() => openDownload(result.download_url_watermark, result.title, "mp4")} className="gap-1.5">
                    <Film className="h-3.5 w-3.5" /> With Watermark
                  </Button>
                  <Button size="sm" variant="secondary" disabled={!result.download_url_mp3} onClick={() => openDownload(result.download_url_mp3, result.title, "mp3")} className="gap-1.5">
                    <Music className="h-3.5 w-3.5" /> MP3 Audio
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* SEO Content */}
        <section className="mt-16 space-y-6 text-sm leading-relaxed text-muted-foreground">
          <h2 className="text-xl font-bold text-foreground">Download TikTok Videos Without Watermark — Free & Fast</h2>
          <p>
            YTFetch TikTok Downloader lets you save any TikTok video to your device without the watermark.
            Download in MP4 video or MP3 audio format — perfect for saving your favorite TikTok content offline.
          </p>
          <h3 className="text-lg font-semibold text-foreground">How to Download TikTok Videos</h3>
          <ol className="list-decimal list-inside space-y-1">
            <li>Open TikTok and copy the video link (Share → Copy Link)</li>
            <li>Paste the URL in the input field above</li>
            <li>Click "Download" to process the video</li>
            <li>Choose MP4 (with/without watermark) or MP3 audio</li>
            <li>Your download starts instantly</li>
          </ol>
          <h3 className="text-lg font-semibold text-foreground">Features</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>Download without watermark in HD quality</li>
            <li>Extract MP3 audio from any TikTok video</li>
            <li>No sign-up or app installation required</li>
            <li>Works on desktop, tablet, and mobile</li>
          </ul>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default TikTokSingleDownloader;
