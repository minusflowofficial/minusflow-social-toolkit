import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Loader2, AlertCircle, Film, Music, Copy, Check, DownloadCloud, Globe, ChevronDown, ChevronUp } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import ToolPageLayout from "@/components/ToolPageLayout";

const FUNCTION_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/douyin-download`;
const proxyThumb = (url: string) => url ? `${FUNCTION_BASE}?url=${encodeURIComponent(url)}&filename=thumb.jpg` : "";

interface DownloadLink { quality: string; url: string; format: string; }
interface DouyinResult { success: boolean; title?: string; thumbnail?: string; download_links?: DownloadLink[]; error?: string; }
interface BulkItem { url: string; status: "pending" | "loading" | "success" | "error"; result?: DouyinResult; error?: string; selectedFormat: number; expanded: boolean; }

const sanitizeFilename = (name: string) => name.replace(/[^a-zA-Z0-9_\-. ]/g, "").slice(0, 80) || "video";
const buildProxyUrl = (mediaUrl: string, title: string, quality: string) => {
  const ext = quality.toLowerCase().includes("mp3") ? "mp3" : "mp4";
  const filename = `MinusFlow.net_${sanitizeFilename(title)}_${quality}.${ext}`;
  return `${FUNCTION_BASE}?url=${encodeURIComponent(mediaUrl)}&filename=${encodeURIComponent(filename)}`;
};
const triggerDownloadFrame = (url: string) => {
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

const DownloadAllDropdown = ({ items, onDownload }: { items: BulkItem[]; onDownload: (quality: "first" | "hd" | "mp3") => void }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handler = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div className="relative flex" ref={ref}>
      <Button
        onClick={() => onDownload("first")}
        className="flex-1 h-12 rounded-l-xl rounded-r-none font-semibold bg-[#fe2c55] hover:bg-[#e0264c] text-white gap-2"
      >
        <DownloadCloud className="h-5 w-5" /> Download All ({items.length} Videos)
      </Button>
      <Button
        onClick={() => setOpen(!open)}
        className="h-12 rounded-l-none rounded-r-xl px-3 bg-[#fe2c55] hover:bg-[#e0264c] text-white border-l border-white/20"
      >
        <ChevronDown className={`h-4 w-4 transition-transform ${open ? "rotate-180" : ""}`} />
      </Button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            className="absolute bottom-full mb-1 right-0 z-50 min-w-[200px] rounded-lg border border-border bg-card shadow-xl overflow-hidden"
          >
            <button onClick={() => { onDownload("first"); setOpen(false); }} className="w-full flex items-center gap-2 px-4 py-3 text-sm text-foreground hover:bg-muted/50 transition-colors">
              <Film className="h-4 w-4" /> Download All (Best Quality)
            </button>
            <button onClick={() => { onDownload("hd"); setOpen(false); }} className="w-full flex items-center gap-2 px-4 py-3 text-sm text-foreground hover:bg-muted/50 transition-colors border-t border-border/30">
              <Film className="h-4 w-4" /> Download All (HD)
            </button>
            <button onClick={() => { onDownload("mp3"); setOpen(false); }} className="w-full flex items-center gap-2 px-4 py-3 text-sm text-foreground hover:bg-muted/50 transition-colors border-t border-border/30">
              <Music className="h-4 w-4" /> Download All (MP3)
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const features = [
  { icon: Globe, title: "Batch Processing", desc: "Download up to 10 Douyin videos at once — paste multiple URLs and process them all." },
  { icon: Film, title: "HD Quality", desc: "Each video is downloaded in the highest quality available." },
  { icon: DownloadCloud, title: "Download All", desc: "After processing, download all successful videos with a single click." },
];

const steps = [
  { title: "Collect Video URLs", desc: "Copy multiple Douyin video URLs from the app." },
  { title: "Paste All URLs", desc: "Paste all URLs into the text area, one per line (max 10)." },
  { title: "Process & Download", desc: "Click Process All and wait while we fetch each video. Then download individually or all at once." },
];

const faqs = [
  { q: "How many videos can I download at once?", a: "You can process up to 10 Douyin videos in a single batch." },
  { q: "What if some videos fail?", a: "Failed videos will show an error message. You can still download the successful ones." },
];

const seoBlocks = [
  { title: "Bulk Douyin Video Downloader", content: "Download multiple Douyin videos at once with MinusFlow ToolKit. Paste up to 10 URLs, process them all, and download in HD quality." },
];

const DouyinBulkDownloader = () => {
  const [text, setText] = useState("");
  const [items, setItems] = useState<BulkItem[]>([]);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);
  const [processing, setProcessing] = useState(false);

  const toggleExpand = (idx: number) => {
    setItems((prev) => prev.map((item, i) => i === idx ? { ...item, expanded: !item.expanded } : item));
  };

  const selectFormat = (itemIdx: number, formatIdx: number) => {
    setItems((prev) => prev.map((item, i) => i === itemIdx ? { ...item, selectedFormat: formatIdx, expanded: false } : item));
  };

  const handleBulk = async () => {
    const urls = text.split("\n").map((u) => u.trim()).filter(Boolean);
    if (!urls.length) { toast.error("Paste at least one URL"); return; }
    if (urls.length > 10) { toast.error("Maximum 10 URLs at a time"); return; }

    setProcessing(true);
    const initial: BulkItem[] = urls.map((u) => ({ url: u, status: "pending", selectedFormat: 0, expanded: false }));
    setItems(initial);
    const results = [...initial];

    for (let i = 0; i < urls.length; i++) {
      setProgress({ current: i + 1, total: urls.length });
      results[i] = { ...results[i], status: "loading" };
      setItems([...results]);

      try {
        const res = await fetch(FUNCTION_BASE, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: urls[i] }) });
        const data: DouyinResult = await res.json();
        if (!res.ok || data.error) throw new Error(data.error || "Failed");
        results[i] = { ...results[i], status: "success", result: data };
      } catch (err: any) {
        results[i] = { ...results[i], status: "error", error: err.message };
      }
      setItems([...results]);
      if (i < urls.length - 1) await new Promise((r) => setTimeout(r, 2000));
    }
    setProcessing(false);
    setProgress(null);
  };

  const successItems = items.filter((i) => i.status === "success" && i.result?.download_links?.length);

  const handleDownloadAll = (quality: "first" | "hd" | "mp3") => {
    successItems.forEach((item, idx) => {
      setTimeout(() => {
        const links = item.result!.download_links!;
        let link: DownloadLink;
        if (quality === "mp3") {
          link = links.find((l) => l.format === "mp3") || links[0];
        } else if (quality === "hd") {
          link = links.find((l) => l.quality.includes("HD")) || links[0];
        } else {
          link = links[item.selectedFormat] || links[0];
        }
        triggerDownloadFrame(buildProxyUrl(link.url, item.result!.title || "video", link.quality));
      }, idx * 1500);
    });
    toast.success(`Downloading ${successItems.length} videos...`);
  };

  return (
    <ToolPageLayout
      icon={Globe}
      title="Douyin Bulk"
      highlight="Downloader"
      subtitle="Download multiple Douyin videos at once — up to 10 URLs per batch."
      badge="Bulk Download — Up to 10 Videos"
      gradientFrom="from-[#fe2c55]"
      gradientTo="to-[#25f4ee]"
      iconBgClass="bg-[#fe2c55]/10"
      features={features}
      steps={steps}
      faqs={faqs}
      seoBlocks={seoBlocks}
    >
      <div className="space-y-6">
        <textarea
          placeholder="Paste Douyin video URLs, one per line (max 10)"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={5}
          className="w-full rounded-xl border border-border bg-card px-4 py-3 text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-[#fe2c55]/40 resize-none transition-all"
        />
        <Button onClick={handleBulk} disabled={processing} className="w-full h-12 rounded-xl font-semibold bg-[#fe2c55] hover:bg-[#e0264c] text-white">
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
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded-xl border border-border bg-card overflow-hidden">
                  <div className="flex items-center gap-3 p-4">
                    {item.result.thumbnail && <img src={proxyThumb(item.result.thumbnail)} alt="" className="h-16 w-16 rounded-lg object-cover flex-shrink-0" />}
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground line-clamp-2">{item.result.title}</p>
                      <p className="text-xs text-muted-foreground mt-0.5">
                        {item.result.download_links[item.selectedFormat]?.quality}{" "}
                        <span className="uppercase">{item.result.download_links[item.selectedFormat]?.format}</span>
                      </p>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      <button
                        onClick={() => toggleExpand(i)}
                        className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:text-foreground hover:bg-muted/20"
                        title="Choose format"
                      >
                        {item.expanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                      </button>
                      <button
                        onClick={() => {
                          const link = item.result!.download_links![item.selectedFormat];
                          triggerDownloadFrame(buildProxyUrl(link.url, item.result!.title || "video", link.quality));
                          toast.success("Download started!");
                        }}
                        className="rounded-lg bg-[#fe2c55]/10 p-2 text-[#fe2c55] transition-colors hover:bg-[#fe2c55]/20"
                        title="Download selected format"
                      >
                        <Download className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  {/* Expanded format picker */}
                  <AnimatePresence>
                    {item.expanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="border-t border-border/20 px-3 py-2 space-y-1">
                          {item.result.download_links.map((link, fi) => {
                            const isSelected = item.selectedFormat === fi;
                            return (
                              <button
                                key={fi}
                                onClick={() => selectFormat(i, fi)}
                                className={`w-full flex items-center justify-between rounded-md px-3 py-2.5 text-sm transition-all ${
                                  isSelected
                                    ? "bg-[#fe2c55]/15 text-[#fe2c55] ring-1 ring-[#fe2c55]/30"
                                    : "text-muted-foreground hover:text-foreground hover:bg-muted/10"
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  {link.format === "mp3" ? <Music className="h-3.5 w-3.5" /> : <Film className="h-3.5 w-3.5" />}
                                  <span className="font-medium">{link.quality}</span>
                                </div>
                                <span className="text-xs uppercase text-muted-foreground">{link.format}</span>
                              </button>
                            );
                          })}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
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
          <DownloadAllDropdown items={successItems} onDownload={handleDownloadAll} />
        )}
      </div>
    </ToolPageLayout>
  );
};

export default DouyinBulkDownloader;
