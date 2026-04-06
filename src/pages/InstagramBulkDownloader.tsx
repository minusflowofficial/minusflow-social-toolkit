import { useState, useRef } from "react";
import { motion } from "framer-motion";
import { Download, Loader2, DownloadCloud, CheckCircle2, XCircle, Instagram, Zap, Shield, Layers, Clock, Image, Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import ToolPageLayout from "@/components/ToolPageLayout";

const FUNCTION_BASE = `https://uphyqimrsclstdumeuwf.supabase.co/functions/v1/fetch-reel`;
interface DownloadLink { quality: string; url: string; format: string; }
interface FetchResult { success: boolean; download_links?: DownloadLink[]; thumbnail?: string; title?: string; hashtags?: string[]; error?: string | null; }
interface BulkEntry { url: string; status: "pending" | "loading" | "success" | "error"; result?: FetchResult; error?: string; }

function sanitizeFilename(name: string) { return name.replace(/[^a-zA-Z0-9_\-. #]/g, "").replace(/\s+/g, "_").slice(0, 120) || "reel"; }
function buildFilename(result: FetchResult, index: number, quality: string, format: string) { return `MinusFlow.net${result.title ? `_${sanitizeFilename(result.title)}` : `_reel_${index + 1}`}_${quality}.${format}`; }
function triggerDownload(mediaUrl: string, filename: string) { const params = new URLSearchParams({ url: mediaUrl, filename }); const iframe = document.createElement("iframe"); iframe.style.display = "none"; iframe.src = `${FUNCTION_BASE}?${params}`; document.body.appendChild(iframe); setTimeout(() => iframe.remove(), 30000); }
async function fetchReel(url: string): Promise<FetchResult> { const res = await fetch(FUNCTION_BASE, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) }); return res.json(); }

const features = [
  { icon: Layers, title: "Up to 20 Reels", desc: "Process up to 20 Instagram Reels or video URLs in a single batch." },
  { icon: Image, title: "HD Quality", desc: "Every video is downloaded in its original HD quality — no compression." },
  { icon: Zap, title: "Auto Processing", desc: "Paste your URLs and click once. Every reel is fetched automatically." },
  { icon: Heart, title: "Original Audio", desc: "Downloaded videos include the original audio track, music, and sounds." },
  { icon: Shield, title: "No Login Needed", desc: "No Instagram account required. Works with any public content." },
  { icon: Clock, title: "Reliable Downloads", desc: "Smart delays between processing ensure every video downloads successfully." },
];

const steps = [
  { title: "Collect Instagram URLs", desc: "Open Instagram, go to each reel/video you want, tap ⋯ → Copy Link. Collect all URLs." },
  { title: "Paste All URLs", desc: "Come to YTFetch and paste all Instagram URLs in the text area — one URL per line, up to 20." },
  { title: "Click Process All", desc: "Hit the 'Process All URLs' button. Each reel is fetched and processed one by one." },
  { title: "Download Each File", desc: "As each reel is processed, click 'Download Best' to save the highest quality version." },
];

const faqs = [
  { q: "How many Instagram Reels can I bulk download?", a: "You can process up to 20 Instagram Reels or video posts in a single batch. For more than 20, simply run another batch after the first completes. There are no daily limits on how many batches you can run." },
  { q: "Do I need to be logged into Instagram?", a: "No! YTFetch Instagram Bulk Downloader works without any Instagram login. All you need are the URLs of public Instagram content. Private account content is not accessible." },
  { q: "What happens if some reels fail?", a: "Failed reels are clearly marked with an error message, but processing continues for the remaining URLs. Common failure reasons include private accounts, deleted content, or incorrect URLs." },
  { q: "What quality are the bulk downloads?", a: "Each reel is downloaded in the highest available quality, typically 1080p HD. The quality depends on what the original creator uploaded to Instagram." },
  { q: "Can I download carousel posts with multiple videos?", a: "Our tool downloads the primary video from a post. For carousel posts with multiple videos, you may need to download each video slide individually using its direct URL." },
  { q: "How long does bulk processing take?", a: "Each reel takes about 2-3 seconds to process, plus a short delay between each. A full batch of 20 reels typically completes in about 60-90 seconds." },
  { q: "Are the files named properly?", a: "Yes! Each downloaded file includes the MinusFlow.net_ prefix, the reel title (when available), relevant hashtags, and the quality level — making organization easy." },
  { q: "Can I use this on my phone?", a: "Absolutely! The bulk downloader works perfectly on mobile browsers (Chrome, Safari, Firefox). No app installation needed — just paste your URLs and download." },
];

const seoBlocks = [
  { title: "Bulk Download Instagram Reels & Videos — Free Tool", content: "YTFetch Instagram Bulk Downloader lets you save multiple Instagram Reels and videos in one session. Paste up to 20 URLs, click Process, and each video is downloaded in HD quality automatically. No Instagram login required." },
  { title: "Save Entire Collections for Offline Viewing", content: "Build your personal content library by bulk downloading your favorite creators' Reels. Watch offline, save mobile data, and never worry about content being deleted. All files include descriptive filenames for easy organization." },
  { title: "Reliable Batch Processing with Progress Tracking", content: "Watch real-time progress as each reel is processed. Clear success/failure indicators let you know exactly which videos were downloaded and which need attention. Smart delays between processing ensure maximum reliability." },
];

const InstagramBulkDownloader = () => {
  const [text, setText] = useState("");
  const [entries, setEntries] = useState<BulkEntry[]>([]);
  const [processing, setProcessing] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const abortRef = useRef(false);

  const handleBulk = async () => {
    const urls = text.split("\n").map((l) => l.trim()).filter((l) => l.length > 0).slice(0, 20);
    if (urls.length === 0) return;
    abortRef.current = false; setProcessing(true); setProgress({ current: 0, total: urls.length });
    const initial: BulkEntry[] = urls.map((u) => ({ url: u, status: "pending" }));
    setEntries([...initial]);
    for (let i = 0; i < urls.length; i++) {
      if (abortRef.current) break;
      setProgress({ current: i + 1, total: urls.length });
      initial[i] = { ...initial[i], status: "loading" }; setEntries([...initial]);
      try { const data = await fetchReel(urls[i]); initial[i] = { ...initial[i], status: data.success ? "success" : "error", result: data, error: data.error || undefined }; }
      catch (err: any) { initial[i] = { ...initial[i], status: "error", error: err.message }; }
      setEntries([...initial]);
      if (i < urls.length - 1) await new Promise((r) => setTimeout(r, 1500));
    }
    setProcessing(false);
  };

  return (
    <ToolPageLayout
      icon={DownloadCloud}
      title="Instagram Bulk"
      highlight="Downloader"
      subtitle="Download up to 20 Instagram reels & videos at once — paste multiple URLs and batch download."
      badge="Batch Download — Up to 20 Reels"
      gradientFrom="from-[#833ab4]"
      gradientTo="to-[#fcb045]"
      iconBgClass="bg-gradient-to-br from-[#833ab4]/10 via-[#fd1d1d]/10 to-[#fcb045]/10"
      features={features}
      steps={steps}
      faqs={faqs}
      seoBlocks={seoBlocks}
    >
      <div className="space-y-6">
        <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={"Paste Instagram URLs (one per line)...\nhttps://www.instagram.com/reel/...\nhttps://www.instagram.com/p/..."} rows={5} className="border-white/10 bg-card text-foreground placeholder:text-muted-foreground resize-none" />
        <Button onClick={handleBulk} disabled={processing} className="w-full h-12 bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] text-white hover:opacity-90">
          {processing ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Processing...</> : <><DownloadCloud className="h-4 w-4 mr-2" /> Process All URLs</>}
        </Button>
        {processing && progress.total > 0 && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground"><span>Processing {progress.current} of {progress.total}</span><span>{Math.round((progress.current / progress.total) * 100)}%</span></div>
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
                <Button size="sm" onClick={() => { const link = entry.result!.download_links![0]; triggerDownload(link.url, buildFilename(entry.result!, i, link.quality, link.format)); }} className="gap-1 bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] text-white text-xs">
                  <Download className="h-3 w-3" /> Download Best
                </Button>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </ToolPageLayout>
  );
};

export default InstagramBulkDownloader;
