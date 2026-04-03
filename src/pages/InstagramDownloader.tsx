import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Loader2, AlertCircle, Image, Film, CheckCircle2, XCircle, Instagram } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ScrollProgress from "@/components/ScrollProgress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";

const FUNCTION_BASE = `https://uphyqimrsclstdumeuwf.supabase.co/functions/v1/instagram-download`;

interface MediaItem {
  type: string;
  url: string;
  thumbnail: string;
}

interface SingleResult {
  success: boolean;
  media_count: number;
  items: MediaItem[];
  error?: string;
}

interface BulkEntry {
  url: string;
  status: "pending" | "loading" | "success" | "error";
  result?: SingleResult;
  error?: string;
}

// ── helpers ──
function buildProxyUrl(mediaUrl: string, filename: string) {
  const params = new URLSearchParams({ url: mediaUrl, filename });
  return `${FUNCTION_BASE}?${params}`;
}

function triggerDownload(mediaUrl: string, filename: string) {
  // Use hidden iframe for direct download via proxy
  const iframe = document.createElement("iframe");
  iframe.style.display = "none";
  iframe.src = buildProxyUrl(mediaUrl, filename);
  document.body.appendChild(iframe);
  setTimeout(() => iframe.remove(), 30000);
}

async function fetchMedia(url: string): Promise<SingleResult> {
  const res = await fetch(FUNCTION_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  return res.json();
}

// ── component ──
const InstagramDownloader = () => {
  const [tab, setTab] = useState<"single" | "bulk">("single");

  return (
    <div className="relative min-h-screen overflow-hidden bg-[hsl(var(--background))]">
      <ScrollProgress />
      <Header />

      <main className="relative z-10 mx-auto max-w-3xl px-4 pb-20 pt-8">
        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-10 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#833ab4] via-[#fd1d1d] to-[#fcb045]">
            <Instagram className="h-8 w-8 text-white" />
          </div>
          <h1 className="mb-2 text-4xl font-extrabold tracking-tight text-foreground md:text-5xl">
            Insta<span className="bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] bg-clip-text text-transparent">Save</span> Pro
          </h1>
          <p className="text-muted-foreground">Download Instagram Reels, Videos, Photos & Carousels — fast & free.</p>
        </motion.div>

        {/* Tabs */}
        <div className="mb-6 flex gap-2 rounded-xl bg-card/60 p-1 backdrop-blur">
          {(["single", "bulk"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 rounded-lg py-2.5 text-sm font-semibold transition-all ${
                tab === t
                  ? "bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] text-white shadow"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {t === "single" ? "Single Download" : "Bulk Download"}
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {tab === "single" ? (
            <motion.div key="single" initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
              <SingleTab />
            </motion.div>
          ) : (
            <motion.div key="bulk" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <BulkTab />
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <Footer />
    </div>
  );
};

// ── Single Tab ──
const SingleTab = () => {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SingleResult | null>(null);
  const { toast } = useToast();

  const handleSubmit = async () => {
    if (!url.trim()) return;
    setLoading(true);
    setResult(null);
    try {
      const data = await fetchMedia(url.trim());
      if (data.error) {
        toast({ title: "Error", description: data.error, variant: "destructive" });
      }
      setResult(data);
    } catch {
      toast({ title: "Error", description: "Network error. Please try again.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex gap-3">
        <Input
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="Paste Instagram post/reel/video URL..."
          className="flex-1 border-white/10 bg-card text-foreground placeholder:text-muted-foreground"
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
        />
        <Button
          onClick={handleSubmit}
          disabled={loading || !url.trim()}
          className="bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] px-6 text-white hover:opacity-90"
        >
          {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
          <span className="ml-2 hidden sm:inline">{loading ? "Fetching..." : "Download"}</span>
        </Button>
      </div>

      {result && result.success && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-3">
          {result.items.map((item, i) => (
            <MediaCard key={i} item={item} index={i} total={result.items.length} />
          ))}
        </motion.div>
      )}

      {result && result.error && (
        <div className="flex items-center gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive">
          <AlertCircle className="h-5 w-5 shrink-0" />
          {result.error}
        </div>
      )}
    </div>
  );
};

// ── Media Card ──
const MediaCard = ({ item, index, total }: { item: MediaItem; index: number; total: number }) => {
  const ext = item.type === "video" ? "mp4" : "jpg";
  const filename = `MinusFlow.net_instagram_${index + 1}.${ext}`;

  return (
    <div className="flex items-center gap-4 rounded-xl border border-white/5 bg-card/80 p-4 backdrop-blur">
      {item.thumbnail ? (
        <img src={item.thumbnail} alt="" className="h-20 w-20 shrink-0 rounded-lg object-cover" />
      ) : (
        <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-white/5">
          {item.type === "video" ? <Film className="h-8 w-8 text-muted-foreground" /> : <Image className="h-8 w-8 text-muted-foreground" />}
        </div>
      )}

      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
            item.type === "video"
              ? "bg-[#fd1d1d]/20 text-[#fd1d1d]"
              : "bg-[#833ab4]/20 text-[#833ab4]"
          }`}>
            {item.type === "video" ? "Video" : "Photo"}
          </span>
          {total > 1 && <span className="text-xs text-muted-foreground">Item {index + 1} of {total}</span>}
        </div>
      </div>

      <Button
        size="sm"
        onClick={() => triggerDownload(item.url, filename)}
        className="bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] text-white hover:opacity-90"
      >
        <Download className="mr-1 h-3.5 w-3.5" />
        Download
      </Button>
    </div>
  );
};

// ── Bulk Tab ──
const BulkTab = () => {
  const [text, setText] = useState("");
  const [entries, setEntries] = useState<BulkEntry[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const abortRef = useRef(false);
  const { toast } = useToast();

  const handleBulk = async () => {
    const urls = text
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      .slice(0, 20);

    if (urls.length === 0) return;

    abortRef.current = false;
    setProcessing(true);
    setProgress({ current: 0, total: urls.length });

    const initial: BulkEntry[] = urls.map((u) => ({ url: u, status: "pending" }));
    setEntries([...initial]);

    for (let i = 0; i < urls.length; i++) {
      if (abortRef.current) break;
      initial[i].status = "loading";
      setEntries([...initial]);
      setProgress({ current: i + 1, total: urls.length });

      try {
        const data = await fetchMedia(urls[i]);
        if (data.error) {
          initial[i].status = "error";
          initial[i].error = data.error;
        } else {
          initial[i].status = "success";
          initial[i].result = data;
        }
      } catch {
        initial[i].status = "error";
        initial[i].error = "Network error";
      }
      setEntries([...initial]);
      if (i < urls.length - 1) await new Promise((r) => setTimeout(r, 1500));
    }
    setProcessing(false);
  };

  const handleDownloadAll = async () => {
    const successful = entries.filter((e) => e.status === "success" && e.result?.items);
    if (successful.length === 0) {
      toast({ title: "Nothing to download", description: "No successful results.", variant: "destructive" });
      return;
    }
    let idx = 0;
    for (const entry of successful) {
      for (const item of entry.result!.items) {
        idx++;
        const ext = item.type === "video" ? "mp4" : "jpg";
        triggerDownload(item.url, `MinusFlow.net_instagram_${idx}.${ext}`);
        await new Promise((r) => setTimeout(r, 800));
      }
    }
    toast({ title: "Downloads started", description: `${idx} file(s) queued.` });
  };

  const successCount = entries.filter((e) => e.status === "success").length;

  return (
    <div className="space-y-6">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={"Paste Instagram URLs, one per line (max 20)\nhttps://www.instagram.com/reel/ABC123/\nhttps://www.instagram.com/p/XYZ789/"}
        className="min-h-[140px] border-white/10 bg-card text-foreground placeholder:text-muted-foreground"
      />

      <div className="flex gap-3">
        <Button
          onClick={handleBulk}
          disabled={processing || !text.trim()}
          className="flex-1 bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] text-white hover:opacity-90"
        >
          {processing ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Processing {progress.current}/{progress.total}...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Process All
            </>
          )}
        </Button>

        {successCount > 0 && !processing && (
          <Button onClick={handleDownloadAll} variant="outline" className="border-[#833ab4]/40 text-[#833ab4] hover:bg-[#833ab4]/10">
            <Download className="mr-2 h-4 w-4" />
            Download All ({successCount})
          </Button>
        )}
      </div>

      {processing && (
        <div className="space-y-2">
          <Progress value={(progress.current / progress.total) * 100} className="h-2" />
          <p className="text-center text-xs text-muted-foreground">
            Processing {progress.current} of {progress.total}...
          </p>
        </div>
      )}

      {entries.length > 0 && (
        <div className="max-h-[400px] space-y-3 overflow-y-auto pr-1">
          {entries.map((entry, i) => (
            <BulkCard key={i} entry={entry} index={i} />
          ))}
        </div>
      )}
    </div>
  );
};

const BulkCard = ({ entry, index }: { entry: BulkEntry; index: number }) => (
  <div className="rounded-xl border border-white/5 bg-card/80 p-4 backdrop-blur">
    <div className="mb-2 flex items-center gap-2">
      {entry.status === "loading" && <Loader2 className="h-4 w-4 animate-spin text-[#fcb045]" />}
      {entry.status === "success" && <CheckCircle2 className="h-4 w-4 text-green-400" />}
      {entry.status === "error" && <XCircle className="h-4 w-4 text-destructive" />}
      {entry.status === "pending" && <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />}
      <span className="truncate text-sm text-muted-foreground">
        #{index + 1} — {entry.url}
      </span>
    </div>

    {entry.status === "error" && (
      <p className="text-xs text-destructive">{entry.error}</p>
    )}

    {entry.status === "success" && entry.result?.items && (
      <div className="mt-2 space-y-2">
        {entry.result.items.map((item, j) => (
          <MediaCard key={j} item={item} index={j} total={entry.result!.items.length} />
        ))}
      </div>
    )}
  </div>
);

export default InstagramDownloader;
