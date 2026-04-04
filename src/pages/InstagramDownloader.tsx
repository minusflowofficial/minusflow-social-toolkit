import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Download, Loader2, AlertCircle, Instagram, CheckCircle2, XCircle,
} from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ScrollProgress from "@/components/ScrollProgress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";

const FUNCTION_BASE = `https://uphyqimrsclstdumeuwf.supabase.co/functions/v1/fetch-reel`;

interface DownloadLink {
  quality: string;
  url: string;
  format: string;
}

interface FetchResult {
  success: boolean;
  download_links?: DownloadLink[];
  thumbnail?: string;
  title?: string;
  hashtags?: string[];
  error?: string | null;
}

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9_\-. #]/g, "").replace(/\s+/g, "_").slice(0, 120) || "reel";
}

function buildFilename(result: FetchResult, index: number, quality: string, format: string) {
  let name = "MinusFlow.net";
  const titlePart = result.title ? `_${sanitizeFilename(result.title)}` : `_reel_${index + 1}`;
  name += titlePart;
  if (result.hashtags?.length) {
    const tags = result.hashtags.slice(0, 5).join("_");
    // Only add if not already in title
    if (!titlePart.includes(tags.slice(0, 10))) {
      name += `_${sanitizeFilename(tags)}`;
    }
  }
  name += `_${quality}.${format}`;
  return name;
}

interface BulkEntry {
  url: string;
  status: "pending" | "loading" | "success" | "error";
  result?: FetchResult;
  error?: string;
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

// ── Main Page ──
const InstagramDownloader = () => {
  const [tab, setTab] = useState<"single" | "bulk">("single");

  return (
    <div className="relative min-h-screen overflow-hidden bg-[hsl(var(--background))]">
      <ScrollProgress />
      <Header />

      <main className="relative z-10 mx-auto max-w-2xl px-4 pb-20 pt-8">
        {/* Hero */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#833ab4] via-[#fd1d1d] to-[#fcb045]">
            <Instagram className="h-8 w-8 text-white" />
          </div>
          <h1 className="mb-2 text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
            Instagram Reels{" "}
            <span className="bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] bg-clip-text text-transparent">
              Downloader
            </span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Paste a public Instagram Reel URL and download in HD — fast &amp; free.
          </p>
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
  const [result, setResult] = useState<FetchResult | null>(null);

  const handleSubmit = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setLoading(true);
    setResult(null);
    try {
      const data = await fetchReel(trimmed);
      setResult(data);
    } catch {
      setResult({ success: false, error: "Something went wrong. Please try again." });
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
          placeholder="https://www.instagram.com/reel/..."
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

      <ResultCard result={result} index={0} />
    </div>
  );
};

// ── Result Card (reusable) ──
const ResultCard = ({ result, index }: { result: FetchResult | null; index: number }) => {
  const [selectedIdx, setSelectedIdx] = useState(0);

  if (!result) return null;

  if (!result.success && result.error) {
    return (
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
        className="w-full rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive flex items-center gap-3"
      >
        <AlertCircle className="h-5 w-5 shrink-0" />
        {result.error}
      </motion.div>
    );
  }

  if (!result.success || !result.download_links?.length) return null;

  const selectedLink = result.download_links[selectedIdx];

  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="w-full rounded-xl border border-border bg-card p-4 space-y-4"
    >
      {/* Thumbnail + Title row */}
      <div className="flex gap-4 items-start">
        {result.thumbnail && (
          <img
            src={result.thumbnail}
            alt="Reel thumbnail"
            className="h-24 w-24 flex-shrink-0 rounded-lg object-cover"
          />
        )}
        <div className="flex-1 min-w-0">
          {result.title && (
            <p className="font-semibold text-foreground line-clamp-2 text-sm">{result.title}</p>
          )}
          {result.hashtags?.length ? (
            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
              {result.hashtags.slice(0, 5).map(t => `#${t}`).join(" ")}
            </p>
          ) : null}
        </div>
      </div>

      {/* Quality dropdown + Download button */}
      <div className="flex gap-2 items-center">
        <Select
          value={String(selectedIdx)}
          onValueChange={(v) => setSelectedIdx(Number(v))}
        >
          <SelectTrigger className="flex-1 bg-background border-border">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {result.download_links.map((link, i) => (
              <SelectItem key={i} value={String(i)}>
                {link.quality} — {link.format.toUpperCase()}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Button
          onClick={() => triggerDownload(selectedLink.url, buildFilename(result, index, selectedLink.quality, selectedLink.format))}
          className="bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] text-white hover:opacity-90 px-6"
        >
          <Download className="h-4 w-4 mr-1.5" />
          Download
        </Button>
      </div>
    </motion.div>
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
    const urls = text.split("\n").map((l) => l.trim()).filter((l) => l.length > 0).slice(0, 20);
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
        const data = await fetchReel(urls[i]);
        if (!data.success) {
          initial[i].status = "error";
          initial[i].error = data.error || "Failed";
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
    const successful = entries.filter((e) => e.status === "success" && e.result?.download_links?.length);
    if (successful.length === 0) {
      toast({ title: "Nothing to download", description: "No successful results.", variant: "destructive" });
      return;
    }
    let idx = 0;
    for (const entry of successful) {
      // Download highest quality (first link) for each
      const link = entry.result!.download_links![0];
      idx++;
      triggerDownload(link.url, buildFilename(entry.result!, idx - 1, link.quality, link.format));
      await new Promise((r) => setTimeout(r, 800));
    }
    toast({ title: "Downloads started", description: `${idx} file(s) queued.` });
  };

  const successCount = entries.filter((e) => e.status === "success").length;

  return (
    <div className="space-y-6">
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={"Paste Instagram Reel URLs, one per line (max 20)\nhttps://www.instagram.com/reel/ABC123/\nhttps://www.instagram.com/username/reel/XYZ789/"}
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
          <Button
            onClick={handleDownloadAll}
            variant="outline"
            className="border-[#833ab4]/40 text-[#833ab4] hover:bg-[#833ab4]/10"
          >
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
        <div className="max-h-[500px] space-y-3 overflow-y-auto pr-1">
          {entries.map((entry, i) => (
            <BulkCard key={i} entry={entry} index={i} />
          ))}
        </div>
      )}
    </div>
  );
};

// ── Bulk Card ──
const BulkCard = ({ entry, index }: { entry: BulkEntry; index: number }) => (
  <div className="rounded-xl border border-white/5 bg-card/80 p-4 backdrop-blur">
    <div className="mb-2 flex items-center gap-2">
      {entry.status === "loading" && <Loader2 className="h-4 w-4 animate-spin text-[#fcb045]" />}
      {entry.status === "success" && <CheckCircle2 className="h-4 w-4 text-green-400" />}
      {entry.status === "error" && <XCircle className="h-4 w-4 text-destructive" />}
      {entry.status === "pending" && <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />}
      <span className="truncate text-sm text-muted-foreground">#{index + 1} — {entry.url}</span>
    </div>

    {entry.status === "error" && <p className="text-xs text-destructive">{entry.error}</p>}

    {entry.status === "success" && entry.result && (
      <ResultCard result={entry.result} index={index} />
    )}
  </div>
);

export default InstagramDownloader;
