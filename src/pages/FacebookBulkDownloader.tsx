import { useState } from "react";
import { motion } from "framer-motion";
import { Download, Loader2, AlertCircle, Video, Film, Copy, Check, DownloadCloud } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import ToolPageLayout from "@/components/ToolPageLayout";

const FUNCTION_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/facebook-download`;
const proxyThumb = (url: string) => url ? `${FUNCTION_BASE}?url=${encodeURIComponent(url)}&filename=thumb.jpg` : "";

interface DownloadLink { quality: string; url: string; format: string; }
interface FBResult { success: boolean; title?: string; thumbnail?: string; download_links?: DownloadLink[]; error?: string; }
interface BulkItem { url: string; status: "pending" | "loading" | "success" | "error"; result?: FBResult; error?: string; }

const sanitizeFilename = (name: string) => name.replace(/[^a-zA-Z0-9_\-. ]/g, "").slice(0, 80) || "video";
const buildProxyUrl = (mediaUrl: string, title: string, quality: string) => {
  const filename = `MinusFlow.net_${sanitizeFilename(title)}_${quality}.mp4`;
  return `${FUNCTION_BASE}?url=${encodeURIComponent(mediaUrl)}&filename=${encodeURIComponent(filename)}`;
};
const triggerDownload = (url: string) => {
  const iframe = document.createElement("iframe");
  iframe.style.display = "none"; iframe.src = url;
  document.body.appendChild(iframe);
  setTimeout(() => iframe.remove(), 60000);
};

const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); toast.success("Link copied!"); setTimeout(() => setCopied(false), 2000); }}
      className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
    >
      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
    </button>
  );
};

const features = [
  { icon: Video, title: "Batch Processing", desc: "Download up to 10 Facebook videos at once — paste multiple URLs and process them all." },
  { icon: Film, title: "HD Quality", desc: "Each video is downloaded in the highest quality available — HD when possible." },
  { icon: DownloadCloud, title: "Download All", desc: "After processing, download all successful videos with a single click." },
];

const steps = [
  { title: "Collect Video URLs", desc: "Copy multiple Facebook video URLs from your browser." },
  { title: "Paste All URLs", desc: "Paste all URLs into the text area, one per line (max 10)." },
  { title: "Process & Download", desc: "Click Process All and wait while we fetch each video. Then download individually or all at once." },
];

const faqs = [
  { q: "How many videos can I download at once?", a: "You can process up to 10 Facebook videos in a single batch. Each video is fetched sequentially to ensure reliable results." },
  { q: "What if some videos fail?", a: "Failed videos will show an error message. You can still download the successful ones. Common failures are private or deleted videos." },
];

const seoBlocks = [
  { title: "Bulk Facebook Video Downloader", content: "Download multiple Facebook videos at once with MinusFlow ToolKit. Paste up to 10 URLs, process them all, and download in HD quality." },
];

const FacebookBulkDownloader = () => {
  const [text, setText] = useState("");
  const [items, setItems] = useState<BulkItem[]>([]);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleBulk = async () => {
    const urls = text.split("\n").map((u) => u.trim()).filter(Boolean);
    if (!urls.length) { toast.error("Paste at least one URL"); return; }
    if (urls.length > 10) { toast.error("Maximum 10 URLs at a time"); return; }

    setProcessing(true);
    const initial: BulkItem[] = urls.map((u) => ({ url: u, status: "pending" }));
    setItems(initial);
    const results = [...initial];

    for (let i = 0; i < urls.length; i++) {
      setProgress({ current: i + 1, total: urls.length });
      results[i] = { ...results[i], status: "loading" };
      setItems([...results]);

      try {
        const res = await fetch(FUNCTION_BASE, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: urls[i] }) });
        const data: FBResult = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || "Failed");
        results[i] = { ...results[i], status: "success", result: data };
      } catch (err: any) {
        results[i] = { ...results[i], status: "error", error: err.message };
      }
      setItems([...results]);
      if (i < urls.length - 1) await new Promise((r) => setTimeout(r, 1500));
    }
    setProcessing(false);
    setProgress(null);
  };

  const successItems = items.filter((i) => i.status === "success" && i.result?.download_links?.length);

  return (
    <ToolPageLayout
      icon={Video}
      title="Facebook Bulk"
      highlight="Downloader"
      subtitle="Download multiple Facebook videos at once — up to 10 URLs per batch."
      badge="Bulk Download — Up to 10 Videos"
      gradientFrom="from-[#1877F2]"
      gradientTo="to-[#42b72a]"
      iconBgClass="bg-[#1877F2]/10"
      features={features}
      steps={steps}
      faqs={faqs}
      seoBlocks={seoBlocks}
    >
      <div className="space-y-6">
        <textarea
          placeholder="Paste Facebook video URLs, one per line (max 10)"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          className="w-full rounded-xl border border-border bg-card px-4 py-3 text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-[#1877F2]/40 resize-none transition-all"
        />
        <Button onClick={handleBulk} disabled={processing} className="w-full h-12 rounded-xl font-semibold bg-[#1877F2] hover:bg-[#1565c0] text-white">
          {processing ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Processing…</> : <><Download className="h-4 w-4 mr-1.5" /> Process All</>}
        </Button>

        {progress && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Processing {progress.current} of {progress.total}…</p>
            <Progress value={(progress.current / progress.total) * 100} className="h-2" />
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
              {item.status === "success" && item.result?.download_links?.length && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl border border-border bg-card p-4 space-y-3">
                  <div className="flex gap-3 items-start">
                    {item.result.thumbnail && <img src={proxyThumb(item.result.thumbnail)} alt="" className="h-20 w-20 rounded-lg object-cover flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground line-clamp-2">{item.result.title}</p>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {item.result.download_links.map((link, j) => (
                      <div key={j} className="flex items-center gap-1">
                        <Button size="sm" onClick={() => { triggerDownload(buildProxyUrl(link.url, item.result!.title || "video", link.quality)); toast.success("Download started!"); }} className="gap-1.5 bg-[#1877F2] hover:bg-[#1565c0] text-white">
                          <Download className="h-3.5 w-3.5" /> {link.quality}
                        </Button>
                        <CopyButton text={link.url} />
                      </div>
                    ))}
                  </div>
                </motion.div>
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

        {!processing && successItems.length > 0 && (
          <Button
            onClick={() => {
              successItems.forEach((item, idx) => {
                setTimeout(() => {
                  const link = item.result!.download_links![0];
                  triggerDownload(buildProxyUrl(link.url, item.result!.title || "video", link.quality));
                }, idx * 1500);
              });
              toast.success(`Downloading ${successItems.length} videos...`);
            }}
            className="w-full h-12 rounded-xl font-semibold bg-[#1877F2] hover:bg-[#1565c0] text-white gap-2"
          >
            <DownloadCloud className="h-5 w-5" /> Download All ({successItems.length} Videos)
          </Button>
        )}
      </div>
    </ToolPageLayout>
  );
};

export default FacebookBulkDownloader;
