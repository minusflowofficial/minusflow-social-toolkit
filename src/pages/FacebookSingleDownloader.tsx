import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Loader2, AlertCircle, Zap, Shield, Globe, Film, Copy, Check, Video, Smartphone, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import ToolPageLayout from "@/components/ToolPageLayout";

const FUNCTION_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/facebook-download`;

interface DownloadLink { quality: string; url: string; format: string; }
interface FBResult { success: boolean; title?: string; thumbnail?: string; download_links?: DownloadLink[]; error?: string; }

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

const features = [
  { icon: Film, title: "HD & SD Quality", desc: "Download Facebook videos in HD or SD quality — choose the best option for your needs." },
  { icon: Video, title: "Public Videos Only", desc: "Works with any public Facebook video, reel, or watch post. No login needed." },
  { icon: Zap, title: "Instant Processing", desc: "Videos are processed in seconds. Paste the URL, click download — done." },
  { icon: Shield, title: "Zero Tracking", desc: "We never store your URLs, downloads, or personal data. Total privacy." },
  { icon: Smartphone, title: "Mobile Friendly", desc: "Works on iPhone, Android, iPad — no app needed, just your browser." },
  { icon: WifiOff, title: "Save for Offline", desc: "Download Facebook videos to watch anytime, even without internet." },
];

const steps = [
  { title: "Find the Facebook Video", desc: "Navigate to the Facebook video you want to download. It must be a public video." },
  { title: "Copy the URL", desc: "Click the three dots on the video post and select 'Copy link', or copy the URL from your browser." },
  { title: "Paste & Download", desc: "Paste the Facebook video URL into the input above and click the Download button." },
  { title: "Choose Quality & Save", desc: "Select HD or SD quality and click Download to save the video to your device." },
];

const faqs = [
  { q: "What Facebook videos can I download?", a: "You can download any public Facebook video, including videos from pages, groups (public), reels, and Facebook Watch. Private videos or videos from private profiles cannot be downloaded." },
  { q: "Do I need a Facebook account?", a: "No! Our tool works without any Facebook login. Just paste the public video URL and download instantly." },
  { q: "What quality options are available?", a: "We provide HD (720p/1080p) and SD (360p) options when available. The exact quality depends on the original upload." },
  { q: "Can I download Facebook Reels?", a: "Yes! Facebook Reels are fully supported. Just copy the reel URL and paste it into our tool." },
  { q: "Why did my download fail?", a: "Common reasons: the video is private, the URL is incorrect, or the video was deleted. Make sure you're using a direct Facebook video URL from a public post." },
  { q: "Is it legal to download Facebook videos?", a: "Downloading public videos for personal, offline viewing is generally acceptable. Always respect the original creator's rights — don't redistribute or use content commercially without permission." },
];

const seoBlocks = [
  { title: "Free Facebook Video Downloader — HD Quality", content: "MinusFlow ToolKit Facebook Downloader saves any public Facebook video in HD or SD quality. No login, no app — just paste the URL and download. Works with Facebook Watch, Reels, page videos, and more." },
  { title: "Download Facebook Videos on Any Device", content: "Our Facebook downloader works on all devices — iPhone, Android, iPad, laptop, desktop. No app installation needed. Compatible with Chrome, Safari, Firefox, Edge, and all modern browsers." },
];

const CopyButton = ({ text }: { text: string }) => {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={() => { navigator.clipboard.writeText(text); setCopied(true); toast.success("Link copied!"); setTimeout(() => setCopied(false), 2000); }}
      className="rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
      title="Copy link"
    >
      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
    </button>
  );
};

const FacebookSingleDownloader = () => {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FBResult | null>(null);
  const [error, setError] = useState("");

  const handleFetch = async () => {
    if (!url.trim()) { toast.error("Please paste a Facebook video URL"); return; }
    setLoading(true); setResult(null); setError("");
    try {
      const res = await fetch(FUNCTION_BASE, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url: url.trim() }) });
      const data: FBResult = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || "Failed to fetch video");
      setResult(data);
    } catch (err: any) { setError(err.message || "Failed to fetch video"); }
    finally { setLoading(false); }
  };

  return (
    <ToolPageLayout
      icon={Video}
      title="Facebook Video"
      highlight="Downloader"
      subtitle="Download Facebook videos in HD — fast, free, no login required."
      badge="HD Quality — No Login Needed"
      gradientFrom="from-[#1877F2]"
      gradientTo="to-[#42b72a]"
      iconBgClass="bg-[#1877F2]/10"
      features={features}
      steps={steps}
      faqs={faqs}
      seoBlocks={seoBlocks}
    >
      <div className="space-y-6">
        <div className="flex gap-2">
          <input
            placeholder="Paste Facebook video URL here..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleFetch()}
            className="h-12 flex-1 rounded-xl border border-border bg-card px-4 text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-[#1877F2]/40 transition-all"
          />
          <Button onClick={handleFetch} disabled={loading} className="h-12 rounded-xl px-6 font-semibold bg-[#1877F2] hover:bg-[#1565c0] text-white">
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

        {result?.success && result.download_links?.length && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border bg-card p-4 space-y-4">
            <div className="flex gap-4 items-start">
              {result.thumbnail && <img src={result.thumbnail} alt={result.title} className="h-28 w-28 flex-shrink-0 rounded-lg object-cover" crossOrigin="anonymous" referrerPolicy="no-referrer" />}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-foreground line-clamp-2">{result.title || "Facebook Video"}</p>
                <p className="text-xs text-muted-foreground mt-1">{result.download_links.length} quality option{result.download_links.length > 1 ? "s" : ""} available</p>
              </div>
            </div>
            <div className="space-y-2">
              {result.download_links.map((link, i) => (
                <div key={i} className="flex items-center gap-2 rounded-lg border border-border/50 bg-muted/30 p-3">
                  <Film className="h-4 w-4 text-[#1877F2] flex-shrink-0" />
                  <span className="text-sm font-medium text-foreground flex-1">{link.quality} — MP4</span>
                  <CopyButton text={link.url} />
                  <Button
                    size="sm"
                    onClick={() => { triggerDownload(buildProxyUrl(link.url, result.title || "video", link.quality)); toast.success("Download started!"); }}
                    className="gap-1.5 bg-[#1877F2] hover:bg-[#1565c0] text-white"
                  >
                    <Download className="h-3.5 w-3.5" /> Download
                  </Button>
                </div>
              ))}
            </div>
          </motion.div>
        )}
      </div>
    </ToolPageLayout>
  );
};

export default FacebookSingleDownloader;
