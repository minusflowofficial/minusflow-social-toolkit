import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Download, Loader2, AlertCircle, Instagram, CheckCircle2, XCircle, DownloadCloud } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ScrollProgress from "@/components/ScrollProgress";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const FUNCTION_BASE = `https://uphyqimrsclstdumeuwf.supabase.co/functions/v1/fetch-reel`;

interface DownloadLink { quality: string; url: string; format: string; }
interface FetchResult { success: boolean; download_links?: DownloadLink[]; thumbnail?: string; title?: string; hashtags?: string[]; error?: string | null; }

interface BulkEntry {
  url: string;
  status: "pending" | "loading" | "success" | "error";
  result?: FetchResult;
  error?: string;
}

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9_\-. #]/g, "").replace(/\s+/g, "_").slice(0, 120) || "reel";
}

function buildFilename(result: FetchResult, index: number, quality: string, format: string) {
  let name = "MinusFlow.net";
  name += result.title ? `_${sanitizeFilename(result.title)}` : `_reel_${index + 1}`;
  name += `_${quality}.${format}`;
  return name;
}

function triggerDownload(mediaUrl: string, filename: string) {
  const params = new URLSearchParams({ url: mediaUrl, filename });
  const iframe = document.createElement("iframe");
  iframe.style.display = "none";
  iframe.src = `${FUNCTION_BASE}?${params}`;
  document.body.appendChild(iframe);
  setTimeout(() => iframe.remove(), 30000);
}

async function fetchReel(url: string): Promise<FetchResult> {
  const res = await fetch(FUNCTION_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  return res.json();
}

const InstagramBulkDownloader = () => {
  const [text, setText] = useState("");
  const [entries, setEntries] = useState<BulkEntry[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const abortRef = useRef(false);

  const handleBulk = async () => {
    const urls = text.split("\n").map((l) => l.trim()).filter((l) => l.length > 0).slice(0, 20);
    if (urls.length === 0) return;

    abortRef.current = false;
    setProcessing(true);
    setProgress({ current: 0, total: urls.length });

    const initial: BulkEntry[] = urls.map((u) => ({ url: u, status: "pending" }));
    setEntries([...initial]);

    for (let i = 0; i < urls.length; i++) {
      if (abortRef.current) break;
      setProgress({ current: i + 1, total: urls.length });
      initial[i] = { ...initial[i], status: "loading" };
      setEntries([...initial]);

      try {
        const data = await fetchReel(urls[i]);
        initial[i] = { ...initial[i], status: data.success ? "success" : "error", result: data, error: data.error || undefined };
      } catch (err: any) {
        initial[i] = { ...initial[i], status: "error", error: err.message };
      }
      setEntries([...initial]);
      if (i < urls.length - 1) await new Promise((r) => setTimeout(r, 1500));
    }
    setProcessing(false);
  };

  return (
    <div className="relative min-h-screen bg-[hsl(var(--background))]">
      <ScrollProgress />
      <Header />

      <main className="relative z-10 mx-auto max-w-2xl px-4 pb-20 pt-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#833ab4] via-[#fd1d1d] to-[#fcb045]">
            <DownloadCloud className="h-8 w-8 text-white" />
          </div>
          <h1 className="mb-2 text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
            Instagram Bulk{" "}
            <span className="bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] bg-clip-text text-transparent">
              Downloader
            </span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Download up to 20 Instagram reels & videos at once — paste multiple URLs and batch download.
          </p>
        </motion.div>

        <div className="space-y-6">
          <Textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder={"Paste Instagram URLs (one per line)...\nhttps://www.instagram.com/reel/...\nhttps://www.instagram.com/p/..."}
            rows={5}
            className="border-white/10 bg-card text-foreground placeholder:text-muted-foreground resize-none"
          />
          <Button
            onClick={handleBulk}
            disabled={processing}
            className="w-full h-12 bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] text-white hover:opacity-90"
          >
            {processing ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Processing...</> : <><DownloadCloud className="h-4 w-4 mr-2" /> Process All URLs</>}
          </Button>

          {processing && progress.total > 0 && (
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Processing {progress.current} of {progress.total}</span>
                <span>{Math.round((progress.current / progress.total) * 100)}%</span>
              </div>
              <Progress value={(progress.current / progress.total) * 100} />
            </div>
          )}

          {entries.map((entry, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border bg-card p-4">
              <div className="flex items-center gap-2 mb-2">
                {entry.status === "success" && <CheckCircle2 className="h-4 w-4 text-green-500" />}
                {entry.status === "error" && <XCircle className="h-4 w-4 text-destructive" />}
                {entry.status === "loading" && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
                {entry.status === "pending" && <div className="h-4 w-4 rounded-full border-2 border-muted-foreground" />}
                <span className="text-xs text-muted-foreground truncate flex-1">{entry.url}</span>
              </div>
              {entry.error && <p className="text-xs text-destructive">{entry.error}</p>}
              {entry.result?.success && entry.result.download_links?.length && (
                <div className="flex gap-2 mt-2">
                  <Button
                    size="sm"
                    onClick={() => {
                      const link = entry.result!.download_links![0];
                      triggerDownload(link.url, buildFilename(entry.result!, i, link.quality, link.format));
                    }}
                    className="gap-1 bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] text-white text-xs"
                  >
                    <Download className="h-3 w-3" /> Download Best
                  </Button>
                </div>
              )}
            </motion.div>
          ))}
        </div>

        {/* SEO Content */}
        <section className="mt-16 space-y-6 text-sm leading-relaxed text-muted-foreground">
          <h2 className="text-xl font-bold text-foreground">Bulk Download Instagram Reels & Videos — Save Up to 20 at Once</h2>
          <p>
            YTFetch Instagram Bulk Downloader lets you download multiple Instagram reels and videos simultaneously.
            Paste up to 20 URLs and our tool processes each one — saving you time and effort.
          </p>
          <h3 className="text-lg font-semibold text-foreground">How to Bulk Download Instagram Content</h3>
          <ol className="list-decimal list-inside space-y-1">
            <li>Copy Instagram reel/video URLs from the app or browser</li>
            <li>Paste all URLs in the text box above (one per line)</li>
            <li>Click "Process All URLs" to start batch processing</li>
            <li>Download each file as it's processed</li>
          </ol>
          <h3 className="text-lg font-semibold text-foreground">Use Cases</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>Save favorite creator content for offline viewing</li>
            <li>Back up your own Instagram posts and reels</li>
            <li>Download trending content compilations</li>
            <li>Archive educational or tutorial content</li>
          </ul>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default InstagramBulkDownloader;
