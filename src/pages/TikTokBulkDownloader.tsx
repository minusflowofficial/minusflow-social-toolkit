import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Download, Loader2, Music, Film, AlertCircle, CheckCircle2, XCircle, DownloadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
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

const triggerIframeDownload = (url: string) => {
  const iframe = document.createElement("iframe");
  iframe.style.display = "none";
  iframe.src = url;
  document.body.appendChild(iframe);
  setTimeout(() => iframe.remove(), 60000);
};

const openDownload = (mediaUrl: string, title = "video", ext = "mp4") => {
  if (!mediaUrl) { toast.error("Download link not available"); return; }
  triggerIframeDownload(buildProxyUrl(mediaUrl, title, ext));
  toast.success("Download started!");
};

const TikTokBulkDownloader = () => {
  const [text, setText] = useState("");
  const [items, setItems] = useState<BulkItem[]>([]);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleBulk = async () => {
    const urls = text.split("\n").map((u) => u.trim()).filter(Boolean);
    if (!urls.length) { toast.error("Please paste at least one URL"); return; }
    if (urls.length > 20) { toast.error("Maximum 20 URLs at a time"); return; }

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
      if (i < urls.length - 1) await new Promise((r) => setTimeout(r, 1200));
    }
    setProcessing(false);
    setProgress(null);
  };

  return (
    <div className="relative min-h-screen bg-[hsl(var(--background))]">
      <ScrollProgress />
      <Header />

      <main className="relative z-10 mx-auto max-w-2xl px-4 pb-20 pt-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-[hsl(348,98%,57%)]/10">
            <DownloadCloud className="h-8 w-8 text-[hsl(348,98%,57%)]" />
          </div>
          <h1 className="mb-2 text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
            TikTok Bulk{" "}
            <span className="bg-gradient-to-r from-[hsl(348,98%,57%)] to-[hsl(175,100%,50%)] bg-clip-text text-transparent">
              Downloader
            </span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Download up to 20 TikTok videos at once — paste multiple URLs and batch download.
          </p>
        </motion.div>

        <div className="space-y-6">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"Paste TikTok URLs (one per line)...\nhttps://www.tiktok.com/@user/video/...\nhttps://www.tiktok.com/@user/video/..."}
            rows={5}
            className="w-full rounded-xl border border-border bg-card p-4 text-foreground placeholder:text-muted-foreground outline-none resize-none focus:ring-2 focus:ring-[hsl(348,98%,57%)]/40"
          />
          <Button onClick={handleBulk} disabled={processing} className="w-full h-12 rounded-xl font-semibold bg-[hsl(348,98%,57%)] hover:bg-[hsl(348,98%,50%)] text-white">
            {processing ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Processing...</> : <><DownloadCloud className="h-4 w-4 mr-2" /> Process All URLs</>}
          </Button>

          {progress && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Processing {progress.current} of {progress.total}</span>
                <span>{Math.round((progress.current / progress.total) * 100)}%</span>
              </div>
              <Progress value={(progress.current / progress.total) * 100} />
            </div>
          )}

          {items.map((item, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-2">
                {item.status === "success" && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                {item.status === "error" && <XCircle className="h-4 w-4 text-destructive" />}
                {item.status === "loading" && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                {item.status === "pending" && <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />}
                <span className="text-xs text-muted-foreground truncate flex-1">{item.url}</span>
              </div>
              {item.error && <p className="text-xs text-destructive">{item.error}</p>}
              {item.result && (
                <div className="flex flex-wrap gap-2 mt-2">
                  <Button size="sm" onClick={() => openDownload(item.result!.download_url_no_watermark, item.result!.title, "mp4")} className="gap-1 bg-[hsl(348,98%,57%)] hover:bg-[hsl(348,98%,50%)] text-white text-xs">
                    <Film className="h-3 w-3" /> MP4
                  </Button>
                  <Button size="sm" variant="secondary" onClick={() => openDownload(item.result!.download_url_mp3, item.result!.title, "mp3")} className="gap-1 text-xs">
                    <Music className="h-3 w-3" /> MP3
                  </Button>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* SEO Content */}
        <section className="mt-16 space-y-6 text-sm leading-relaxed text-muted-foreground">
          <h2 className="text-xl font-bold text-foreground">Bulk Download TikTok Videos — Save Up to 20 Videos at Once</h2>
          <p>
            YTFetch TikTok Bulk Downloader makes it easy to download multiple TikTok videos in one go.
            Paste up to 20 video URLs, and our tool will process each one sequentially — downloading them without watermark in HD quality.
          </p>
          <h3 className="text-lg font-semibold text-foreground">How to Bulk Download TikTok Videos</h3>
          <ol className="list-decimal list-inside space-y-1">
            <li>Copy multiple TikTok video URLs</li>
            <li>Paste all URLs in the text box (one per line)</li>
            <li>Click "Process All URLs" to start batch processing</li>
            <li>Download each video in MP4 or MP3 as they're processed</li>
          </ol>
          <h3 className="text-lg font-semibold text-foreground">Perfect For</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>Saving an entire creator's content library</li>
            <li>Downloading trending videos for offline viewing</li>
            <li>Extracting audio from multiple TikTok videos</li>
            <li>Content creators backing up their own videos</li>
          </ul>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default TikTokBulkDownloader;
