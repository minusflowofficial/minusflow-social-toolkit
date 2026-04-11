import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Loader2, AlertCircle, Film, Music, Copy, Check, Zap, Shield, Globe, Smartphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import ToolPageLayout from "@/components/ToolPageLayout";

const FUNCTION_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/douyin-download`;
const proxyThumb = (url: string) => url ? `${FUNCTION_BASE}?url=${encodeURIComponent(url)}&filename=thumb.jpg` : "";

interface DownloadLink { quality: string; url: string; format: string; }
interface DouyinResult { success: boolean; title?: string; thumbnail?: string; download_links?: DownloadLink[]; error?: string; }

const sanitizeFilename = (name: string) => name.replace(/[^a-zA-Z0-9_\-. ]/g, "").slice(0, 80) || "video";
const buildProxyUrl = (mediaUrl: string, title: string, quality: string) => {
  const ext = quality.toLowerCase().includes("mp3") ? "mp3" : "mp4";
  const filename = `MinusFlow.net_${sanitizeFilename(title)}_${quality}.${ext}`;
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
  { icon: Film, title: "HD Quality", desc: "Download Douyin videos in HD quality — no watermark, clean files." },
  { icon: Music, title: "MP3 Audio", desc: "Extract audio from any Douyin video and save it as MP3." },
  { icon: Zap, title: "Instant Processing", desc: "Videos are processed in seconds. Paste, click, download." },
  { icon: Shield, title: "Zero Tracking", desc: "We never store your URLs or downloads. Complete privacy." },
  { icon: Smartphone, title: "Mobile Friendly", desc: "Works on any device — no app installation needed." },
  { icon: Globe, title: "Works Worldwide", desc: "Download Douyin videos from anywhere in the world." },
];

const steps = [
  { title: "Copy Douyin Link", desc: "Open the Douyin video and copy the share link from the app." },
  { title: "Paste the URL", desc: "Paste the copied Douyin video URL into the input field above." },
  { title: "Click Download", desc: "Hit the Download button and wait while we process the video." },
  { title: "Save Your Video", desc: "Choose your preferred format (MP4 or MP3) and save to your device." },
];

const faqs = [
  { q: "How do I download Douyin videos?", a: "Copy the Douyin video URL from the app, paste it here, and click Download. We'll extract the video and provide download links in multiple qualities." },
  { q: "Can I download Douyin audio as MP3?", a: "Yes! If MP3 extraction is available for the video, you'll see an MP3 download option alongside the video downloads." },
  { q: "Does it work with private Douyin videos?", a: "No, only public Douyin videos can be downloaded. Private or restricted videos cannot be accessed." },
  { q: "Is it free to use?", a: "Yes, completely free with no sign-up required. Just paste a link and download." },
];

const seoBlocks = [
  { title: "Free Douyin Video Downloader", content: "Download Douyin (Chinese TikTok) videos in HD quality. No watermark, no sign-up, completely free. Works on all devices." },
  { title: "Save Douyin Videos on Any Device", content: "Our Douyin downloader works on all devices and browsers. No app installation needed — just paste a link and download." },
];

const DouyinSingleDownloader = () => {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DouyinResult | null>(null);
  const [error, setError] = useState("");

  const handleFetch = async () => {
    if (!url.trim()) { toast.error("Please paste a Douyin URL"); return; }
    setLoading(true); setResult(null); setError("");
    try {
      const res = await fetch(FUNCTION_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: url.trim() }),
      });
      const data: DouyinResult = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed to fetch video");
      setResult(data);
    } catch (err: any) { setError(err.message || "Failed to fetch video"); }
    finally { setLoading(false); }
  };

  return (
    <ToolPageLayout
      icon={Globe}
      title="Douyin Video"
      highlight="Downloader"
      subtitle="Download Douyin videos in HD — no watermark, MP4 and MP3 formats available."
      badge="Douyin — HD Quality"
      gradientFrom="from-[#fe2c55]"
      gradientTo="to-[#25f4ee]"
      iconBgClass="bg-[#fe2c55]/10"
      features={features}
      steps={steps}
      faqs={faqs}
      seoBlocks={seoBlocks}
    >
      <div className="space-y-6">
        <div className="flex gap-2">
          <input
            placeholder="Paste Douyin video URL here..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleFetch()}
            className="h-12 flex-1 rounded-xl border border-border bg-card px-4 text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-[#fe2c55]/40 transition-all"
          />
          <Button onClick={handleFetch} disabled={loading} className="h-12 rounded-xl px-6 font-semibold bg-[#fe2c55] hover:bg-[#e0264c] text-white">
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
                <div className="flex-1 space-y-3 py-2"><div className="h-4 w-3/4 animate-pulse rounded bg-muted" /><div className="h-3 w-1/3 animate-pulse rounded bg-muted" /></div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {result && result.download_links && result.download_links.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-2xl border border-border bg-card overflow-hidden">
            {/* Thumbnail banner */}
            {result.thumbnail ? (
              <div className="relative h-48 w-full bg-muted">
                <img src={proxyThumb(result.thumbnail)} alt={result.title} className="h-full w-full object-cover" onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                <div className="absolute inset-0 bg-gradient-to-t from-card via-transparent to-transparent" />
              </div>
            ) : (
              <div className="h-2 w-full bg-gradient-to-r from-[#fe2c55] to-[#25f4ee]" />
            )}
            
            <div className="p-5 space-y-4">
              <div>
                <p className="font-semibold text-foreground text-lg line-clamp-2">{result.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{result.download_links.length} format{result.download_links.length > 1 ? 's' : ''} available</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {result.download_links.map((link, j) => (
                  <div key={j} className="flex items-center gap-1">
                    <Button
                      size="sm"
                      onClick={() => { triggerDownload(buildProxyUrl(link.url, result.title || "video", link.quality)); toast.success("Download started!"); }}
                      className={`gap-1.5 text-white rounded-lg ${
                        link.format === "mp3" 
                          ? "bg-orange-500 hover:bg-orange-600" 
                          : link.quality.includes("HD") 
                            ? "bg-[#fe2c55] hover:bg-[#e0264c]" 
                            : "bg-[#fe2c55]/80 hover:bg-[#e0264c]/80"
                      }`}
                    >
                      {link.format === "mp3" ? <Music className="h-3.5 w-3.5" /> : <Film className="h-3.5 w-3.5" />}
                      {link.quality}
                    </Button>
                    <CopyButton text={link.url} />
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </ToolPageLayout>
  );
};

export default DouyinSingleDownloader;
