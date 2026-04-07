import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Download, Loader2, Music, Film, AlertCircle, Zap, Shield, Globe, Smartphone, WifiOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import ToolPageLayout from "@/components/ToolPageLayout";

interface TikTokResult {
  title: string; author: string; thumbnail: string;
  download_url_no_watermark: string; download_url_watermark: string; download_url_mp3: string;
  error?: string;
}

const sanitizeFilename = (name: string) => name.replace(/[^a-zA-Z0-9_\-. ]/g, "").slice(0, 80) || "video";
const buildProxyUrl = (mediaUrl: string, title: string, ext: string) => {
  const base = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/tiktok-download`;
  return `${base}?url=${encodeURIComponent(mediaUrl)}&filename=${encodeURIComponent(`MinusFlow.net_${sanitizeFilename(title)}.${ext}`)}`;
};
const triggerIframeDownload = (url: string) => {
  const iframe = document.createElement("iframe");
  iframe.style.display = "none"; iframe.src = url;
  document.body.appendChild(iframe);
  setTimeout(() => iframe.remove(), 60000);
};
const openDownload = (mediaUrl: string, title = "video", ext = "mp4") => {
  if (!mediaUrl) { toast.error("Download link not available"); return; }
  triggerIframeDownload(buildProxyUrl(mediaUrl, title, ext));
  toast.success("Download started!");
};

const features = [
  { icon: Film, title: "No Watermark", desc: "Download TikTok videos completely clean — no TikTok watermark or logo overlay." },
  { icon: Music, title: "MP3 Audio Extract", desc: "Save just the audio track from any TikTok video as a high-quality MP3 file." },
  { icon: Zap, title: "Instant Processing", desc: "Videos are processed in seconds. Paste, click, download — it's that simple." },
  { icon: Shield, title: "Zero Tracking", desc: "We never store your URLs, downloads, or personal data. Complete privacy." },
  { icon: Smartphone, title: "Mobile Friendly", desc: "Works perfectly on iPhone, Android, iPad — no app installation needed." },
  { icon: WifiOff, title: "Save for Offline", desc: "Download your favorite TikToks to watch anytime, even without internet." },
];

const steps = [
  { title: "Open TikTok Video", desc: "Find the TikTok video you want to download. Tap the Share button and then 'Copy Link' to get the video URL." },
  { title: "Paste the URL", desc: "Come back to MinusFlow ToolKit and paste the copied TikTok URL into the input field above." },
  { title: "Click Download", desc: "Hit the Download button and wait a few seconds while we process the video." },
  { title: "Choose Format & Save", desc: "Select MP4 (without watermark), MP4 (with watermark), or MP3 audio — then save to your device." },
];

const faqs = [
  { q: "How do I download TikTok videos without watermark?", a: "Simply paste the TikTok video URL into our tool and click Download. We automatically extract the watermark-free version of the video. Click 'MP4 No Watermark' to download the clean version directly to your device." },
  { q: "Can I download TikTok audio as MP3?", a: "Yes! Our tool extracts the audio track from any TikTok video and lets you download it as an MP3 file. Perfect for saving trending sounds, music clips, or audio from tutorials and speeches." },
  { q: "Does it work with private TikTok videos?", a: "No, our tool can only download public TikTok videos. Private videos and videos with restricted sharing settings are not accessible through any third-party downloader." },
  { q: "Is downloading TikTok videos legal?", a: "Downloading TikTok videos for personal, offline viewing is generally acceptable. However, always respect the original creator's rights — don't redistribute, re-upload, or use downloaded content for commercial purposes without permission." },
  { q: "Why does my download sometimes fail?", a: "This can happen if the TikTok URL is incorrect, the video was deleted, or TikTok temporarily blocks access. Try refreshing the page and pasting the URL again. If the issue persists, the video may no longer be available." },
  { q: "Do I need to install a TikTok downloader app?", a: "No! MinusFlow ToolKit is a web-based tool that works directly in your browser. No app downloads, extensions, or installations needed. Just visit our website, paste a link, and download. Works on any device." },
  { q: "What video quality do I get?", a: "We download TikTok videos in the highest quality available — typically 1080p or 720p HD, depending on the original upload quality. The watermark-free version maintains the same quality as the original." },
  { q: "Can I download TikTok slideshows/photo videos?", a: "TikTok slideshow-style videos (photo carousels with music) are downloaded as video files (MP4), preserving the slideshow animation and audio exactly as they appear on TikTok." },
];

const seoBlocks = [
  { title: "Free TikTok Video Downloader — No Watermark, HD Quality", content: "MinusFlow ToolKit TikTok Downloader saves any public TikTok video without the watermark in full HD quality. Download in MP4 for video or MP3 for audio-only — perfect for saving trending content, funny clips, tutorials, and music. No sign-up, no app, completely free." },
  { title: "Save TikTok Videos on Any Device", content: "Our TikTok downloader works on iPhones, Android phones, iPads, laptops, and desktop computers. No app installation required — just use your web browser. Compatible with Chrome, Safari, Firefox, Edge, and all modern browsers." },
  { title: "Extract Audio from TikTok Videos", content: "Want just the sound? Our MP3 extraction feature lets you save audio from any TikTok video. Perfect for trending sounds, music clips, podcasts, ASMR content, and more. High-quality audio files ready for offline listening." },
];

const TikTokSingleDownloader = () => {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TikTokResult | null>(null);
  const [error, setError] = useState("");

  const handleFetch = async () => {
    if (!url.trim()) { toast.error("Please paste a TikTok URL"); return; }
    setLoading(true); setResult(null); setError("");
    try {
      const { data, error: err } = await supabase.functions.invoke("tiktok-download", { body: { url: url.trim() } });
      if (err) throw new Error(err.message);
      if (data?.error) throw new Error(data.error);
      setResult(data);
    } catch (err: any) { setError(err.message || "Failed to fetch video"); }
    finally { setLoading(false); }
  };

  return (
    <ToolPageLayout
      icon={Music}
      title="TikTok Video"
      highlight="Downloader"
      subtitle="Download TikTok videos without watermark in HD — MP4 and MP3 formats available."
      badge="No Watermark — HD Quality"
      gradientFrom="from-[hsl(348,98%,57%)]"
      gradientTo="to-[hsl(175,100%,50%)]"
      iconBgClass="bg-[hsl(348,98%,57%)]/10"
      features={features}
      steps={steps}
      faqs={faqs}
      seoBlocks={seoBlocks}
    >
      <div className="space-y-6">
        <div className="flex gap-2">
          <input
            placeholder="Paste TikTok video URL here..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleFetch()}
            className="h-12 flex-1 rounded-xl border border-border bg-card px-4 text-foreground placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-[hsl(348,98%,57%)]/40 transition-all"
          />
          <Button onClick={handleFetch} disabled={loading} className="h-12 rounded-xl px-6 font-semibold bg-[hsl(348,98%,57%)] hover:bg-[hsl(348,98%,50%)] text-white">
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

        {result && (
          <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col sm:flex-row gap-4 rounded-xl border border-border bg-card p-4">
            {result.thumbnail && <img src={result.thumbnail} alt={result.title} className="h-28 w-28 flex-shrink-0 rounded-lg object-cover" />}
            <div className="flex flex-1 flex-col gap-3">
              <div>
                <p className="font-semibold text-foreground line-clamp-2">{result.title}</p>
                {result.author && <p className="text-sm text-muted-foreground">{result.author}</p>}
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => openDownload(result.download_url_no_watermark, result.title, "mp4")} className="gap-1.5 bg-[hsl(348,98%,57%)] hover:bg-[hsl(348,98%,50%)] text-white"><Film className="h-3.5 w-3.5" /> MP4 No Watermark</Button>
                <Button size="sm" variant="secondary" disabled={!result.download_url_watermark} onClick={() => openDownload(result.download_url_watermark, result.title, "mp4")} className="gap-1.5"><Film className="h-3.5 w-3.5" /> With Watermark</Button>
                <Button size="sm" variant="secondary" disabled={!result.download_url_mp3} onClick={() => openDownload(result.download_url_mp3, result.title, "mp3")} className="gap-1.5"><Music className="h-3.5 w-3.5" /> MP3 Audio</Button>
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </ToolPageLayout>
  );
};

export default TikTokSingleDownloader;
