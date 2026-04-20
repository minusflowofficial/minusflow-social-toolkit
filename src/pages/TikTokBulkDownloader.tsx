import { useState } from "react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Download, Loader2, Music, Film, DownloadCloud, CheckCircle2, XCircle, Zap, Shield, Layers, Clock } from "lucide-react";
import { FaTiktok } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import ToolPageLayout from "@/components/ToolPageLayout";

interface TikTokResult {
  title: string; author: string; thumbnail: string;
  download_url_no_watermark: string; download_url_watermark: string; download_url_mp3: string; error?: string;
}
interface BulkItem { url: string; status: "pending" | "loading" | "success" | "error"; result?: TikTokResult; error?: string; }

const downloadVideo = async (url: string): Promise<TikTokResult> => {
  const { data, error } = await supabase.functions.invoke("tiktok-download", { body: { url: url.trim() } });
  if (error) throw new Error(error.message); if (data?.error) throw new Error(data.error); return data;
};
const sanitizeFilename = (name: string) => name.replace(/[^a-zA-Z0-9_\-. ]/g, "").slice(0, 80) || "video";
const buildProxyUrl = (mediaUrl: string, title: string, ext: string) => {
  const base = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tiktok-download`;
  return `${base}?url=${encodeURIComponent(mediaUrl)}&filename=${encodeURIComponent(`MinusFlow.net_${sanitizeFilename(title)}.${ext}`)}`;
};
const triggerIframeDownload = (url: string) => { const iframe = document.createElement("iframe"); iframe.style.display = "none"; iframe.src = url; document.body.appendChild(iframe); setTimeout(() => iframe.remove(), 60000); };
const openDownload = (mediaUrl: string, title = "video", ext = "mp4") => { if (!mediaUrl) { toast.error("Download link not available"); return; } triggerIframeDownload(buildProxyUrl(mediaUrl, title, ext)); toast.success("Download started!"); };

const features = [
  { icon: Layers, title: "Up to 20 Videos", desc: "Process up to 20 TikTok URLs in a single batch — save an entire creator's content library." },
  { icon: Zap, title: "Auto Processing", desc: "Just paste your URLs and click once. Every video is processed automatically, one by one." },
  { icon: Film, title: "No Watermark", desc: "All videos are downloaded without the TikTok watermark — clean, high-quality files." },
  { icon: Music, title: "MP3 Extraction", desc: "Extract audio from every video in the batch. Perfect for saving trending sounds." },
  { icon: Shield, title: "Private & Secure", desc: "We never store your URLs or downloaded videos. Everything is processed in real-time." },
  { icon: Clock, title: "Smart Delays", desc: "Built-in delays between processing ensure reliable results for every video." },
];

const steps = [
  { title: "Collect TikTok URLs", desc: "Open TikTok, go to each video you want, tap Share → Copy Link. Repeat for all videos." },
  { title: "Paste All URLs", desc: "Come to MinusFlow ToolKit and paste all your TikTok URLs in the text area — one URL per line, up to 20." },
  { title: "Click Process All", desc: "Hit the 'Process All URLs' button. Each video is fetched and processed sequentially." },
  { title: "Download Each Video", desc: "As each video is processed, download it in MP4 (no watermark) or MP3 audio format." },
];

const faqs = [
  { q: "How many TikTok videos can I bulk download?", a: "You can process up to 20 TikTok videos in a single batch. For more than 20 videos, simply run another batch after the first one completes. There are no daily limits." },
  { q: "Are all videos downloaded without watermark?", a: "Yes! Every video in the batch is downloaded without the TikTok watermark by default. You also have the option to download with watermark if preferred." },
  { q: "What if some videos fail in the batch?", a: "Failed videos are clearly marked with an error message, but processing continues for the remaining URLs. You can retry failed videos individually after the batch completes." },
  { q: "Can I extract MP3 audio from all videos?", a: "Yes, each processed video shows both MP4 and MP3 download options. You can selectively download audio from specific videos or all of them." },
  { q: "Why does processing take a while?", a: "We process videos sequentially with short delays between each to ensure maximum reliability. A batch of 20 videos typically takes about 30-60 seconds total." },
  { q: "Does it work with all TikTok URLs?", a: "We support standard TikTok video URLs (tiktok.com/@user/video/...), mobile share links, and shortened TikTok URLs. Only public videos can be downloaded." },
  { q: "Is there a file size limit?", a: "No file size limit on our end. You get the full video in its original quality. Long TikTok videos may result in larger file sizes." },
  { q: "Can I use this on my phone?", a: "Absolutely! MinusFlow ToolKit Bulk Downloader works on all mobile browsers. Just paste your URLs and tap Process All — no app needed." },
];

const seoBlocks = [
  { title: "Batch Download TikTok Videos — Up to 20 at Once", content: "MinusFlow ToolKit TikTok Bulk Downloader makes mass-downloading TikTok content effortless. Paste up to 20 video URLs, click once, and every video is processed automatically. All downloads are watermark-free and in HD quality." },
  { title: "Perfect for Content Archiving & Offline Viewing", content: "Want to save a creator's entire collection? Bulk download makes it easy to archive content for offline viewing. All files are saved with the MinusFlow.net_ prefix for easy organization on your device." },
  { title: "Reliable Processing with Smart Rate Limiting", content: "Our intelligent sequential processing with built-in delays ensures every video in your batch is handled successfully. No failed downloads due to rate limiting — just reliable, consistent results every time." },
];

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
    setItems(initial); const results = [...initial];
    for (let i = 0; i < urls.length; i++) {
      setProgress({ current: i + 1, total: urls.length });
      results[i] = { ...results[i], status: "loading" }; setItems([...results]);
      try { const data = await downloadVideo(urls[i]); results[i] = { ...results[i], status: "success", result: data }; }
      catch (err: any) { results[i] = { ...results[i], status: "error", error: err.message }; }
      setItems([...results]);
      if (i < urls.length - 1) await new Promise((r) => setTimeout(r, 1200));
    }
    setProcessing(false); setProgress(null);
  };

  return (
    <ToolPageLayout
      icon={FaTiktok}
      title="TikTok Bulk"
      highlight="Downloader"
      subtitle="Download up to 20 TikTok videos at once — paste multiple URLs and batch download instantly."
      badge="Batch Download — Up to 20 Videos"
      gradientFrom="from-[hsl(348,98%,57%)]"
      gradientTo="to-[hsl(175,100%,50%)]"
      iconBgClass="bg-[hsl(348,98%,57%)]/10"
      features={features}
      steps={steps}
      faqs={faqs}
      seoBlocks={seoBlocks}
    >
      <div className="space-y-6">
        <textarea value={text} onChange={(e) => setText(e.target.value)} placeholder={"Paste TikTok URLs (one per line)...\nhttps://www.tiktok.com/@user/video/...\nhttps://www.tiktok.com/@user/video/..."} rows={5} className="w-full rounded-xl border border-border bg-card p-4 text-foreground placeholder:text-muted-foreground outline-none resize-none focus:ring-2 focus:ring-[hsl(348,98%,57%)]/40" />
        <Button onClick={handleBulk} disabled={processing} className="w-full h-12 rounded-xl font-semibold bg-[hsl(348,98%,57%)] hover:bg-[hsl(348,98%,50%)] text-white">
          {processing ? <><Loader2 className="h-4 w-4 animate-spin mr-2" /> Processing...</> : <><DownloadCloud className="h-4 w-4 mr-2" /> Process All URLs</>}
        </Button>
        {progress && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-muted-foreground"><span>Processing {progress.current} of {progress.total}</span><span>{Math.round((progress.current / progress.total) * 100)}%</span></div>
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
                <Button size="sm" onClick={() => openDownload(item.result!.download_url_no_watermark, item.result!.title, "mp4")} className="gap-1 bg-[hsl(348,98%,57%)] hover:bg-[hsl(348,98%,50%)] text-white text-xs"><Film className="h-3 w-3" /> MP4</Button>
                <Button size="sm" variant="secondary" onClick={() => openDownload(item.result!.download_url_mp3, item.result!.title, "mp3")} className="gap-1 text-xs"><Music className="h-3 w-3" /> MP3</Button>
              </div>
            )}
          </motion.div>
        ))}

        {/* Download All Button */}
        {!processing && items.filter((i) => i.status === "success" && i.result?.download_url_no_watermark).length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col gap-2 sm:flex-row sm:gap-3"
          >
            <Button
              onClick={() => {
                const successItems = items.filter((i) => i.status === "success" && i.result?.download_url_no_watermark);
                successItems.forEach((item, idx) => {
                  setTimeout(() => {
                    openDownload(item.result!.download_url_no_watermark, item.result!.title, "mp4");
                  }, idx * 500);
                });
                toast.success(`Started ${successItems.length} downloads!`);
              }}
              className="h-12 w-full gap-2 bg-[hsl(348,98%,57%)] hover:bg-[hsl(348,98%,50%)] text-white font-semibold"
            >
              <Download className="h-4 w-4" /> Download All MP4 ({items.filter((i) => i.status === "success").length} videos)
            </Button>
            <Button
              variant="secondary"
              onClick={() => {
                const successItems = items.filter((i) => i.status === "success" && i.result?.download_url_mp3);
                successItems.forEach((item, idx) => {
                  setTimeout(() => {
                    openDownload(item.result!.download_url_mp3, item.result!.title, "mp3");
                  }, idx * 500);
                });
                toast.success(`Started ${successItems.length} audio downloads!`);
              }}
              className="h-12 w-full gap-2 font-semibold"
            >
              <Music className="h-4 w-4" /> Download All MP3
            </Button>
          </motion.div>
        )}
      </div>
    </ToolPageLayout>
  );
};

export default TikTokBulkDownloader;
