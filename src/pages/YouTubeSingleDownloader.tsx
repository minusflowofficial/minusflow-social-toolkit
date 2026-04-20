import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Loader2, Zap, Shield, Globe, Film, Headphones, MonitorPlay } from "lucide-react";
import { FaYoutube } from "react-icons/fa";
import { Button } from "@/components/ui/button";
import FormatCard from "@/components/FormatCard";
import ToolPageLayout from "@/components/ToolPageLayout";
import { trackToolUsage } from "@/lib/analytics";
import { fetchAndNormalize, type NormalizedFormat } from "@/lib/youtube-api";
import { toast } from "sonner";

type MediaItem = NormalizedFormat;

const features = [
  { icon: Film, title: "Multiple Formats", desc: "Download in MP4, WebM, MP3, M4A — choose the format that works best for you." },
  { icon: MonitorPlay, title: "Up to 1080p HD", desc: "Get the highest quality available — Full HD 1080p, 720p, 480p, and more." },
  { icon: Headphones, title: "Audio Extraction", desc: "Extract just the audio track in MP3 or M4A — perfect for music and podcasts." },
  { icon: Zap, title: "Lightning Fast", desc: "Our servers process videos in seconds. No waiting, no queues, just instant results." },
  { icon: Shield, title: "100% Private", desc: "We never store your data, search history, or downloads. Zero tracking, total privacy." },
  { icon: Globe, title: "Works Everywhere", desc: "Desktop, tablet, or phone — works on all browsers with no app installation needed." },
];

const steps = [
  { title: "Copy the YouTube URL", desc: "Go to YouTube, find the video you want, and copy the URL from the address bar or Share button." },
  { title: "Paste & Fetch", desc: "Paste the URL into the input field above and click 'Fetch'. We'll analyze the video instantly." },
  { title: "Choose Your Format", desc: "Browse all available quality options — from 1080p video to MP3 audio. Pick what suits you." },
  { title: "Download Instantly", desc: "Click the download button and your file starts saving immediately. No waiting, no sign-up." },
];

const faqs = [
  { q: "Is it really free to download YouTube videos?", a: "Yes, MinusFlow ToolKit is completely free with no hidden charges, subscriptions, or premium tiers. You can download unlimited videos in any format without paying a penny. We believe everyone deserves access to a fast, reliable YouTube downloader." },
  { q: "What video quality options are available?", a: "We support up to 1080p Full HD (if the source video supports it), plus 720p HD, 480p SD, and 360p. For audio, we offer MP3 and M4A formats with high-quality bitrates up to 128kbps and beyond. The exact options depend on what the uploader provided." },
  { q: "Do I need to create an account or sign up?", a: "Absolutely not. MinusFlow ToolKit requires zero registration, no email, no phone number, nothing. Just paste a URL and download. We don't even use cookies to track you." },
  { q: "Can I download YouTube Shorts?", a: "Yes! YouTube Shorts URLs (youtube.com/shorts/VIDEO_ID) are fully supported. Just paste the Shorts URL and download it like any regular video." },
  { q: "Is it safe? Will my device get a virus?", a: "MinusFlow ToolKit is a web-based tool that runs entirely in your browser — nothing is installed on your device. We don't serve ads, pop-ups, or redirects. Your downloads come directly from YouTube's servers." },
  { q: "Why is my download failing?", a: "Common reasons: the URL might be incorrect, the video might be private/age-restricted, or it could be region-locked. Try refreshing the page or using a different browser. Very long videos (3+ hours) may take longer to process." },
  { q: "What YouTube URL formats do you support?", a: "We support all standard formats: youtube.com/watch?v=, youtu.be/ short links, youtube.com/shorts/, youtube.com/embed/, and even bare 11-character video IDs." },
  { q: "Can I download copyrighted content?", a: "MinusFlow ToolKit is intended for personal use only — saving educational content, lectures, tutorials, or your own uploads. We don't encourage downloading copyrighted material for redistribution or commercial purposes. Always respect intellectual property rights." },
];

const seoBlocks = [
  { title: "Free YouTube Video Downloader — MP4, MP3 & More", content: "MinusFlow ToolKit YouTube Video Downloader lets you save any public YouTube video directly to your device in seconds. Simply paste the video URL, choose your preferred format (MP4 video or MP3 audio), and download instantly. No sign-up, no software installation, completely free — works on desktop, tablet, and mobile." },
  { title: "Supported Formats & Quality Options", content: "Download YouTube videos in MP4 at resolutions up to 1080p Full HD, 720p HD, 480p SD, and 360p. For audio-only downloads, we offer MP3 and M4A formats with high-quality bitrates. Whether you need a video for offline viewing or just the audio from a music video, lecture, or podcast — MinusFlow ToolKit has you covered." },
  { title: "Compatible With All Devices & Browsers", content: "MinusFlow ToolKit works seamlessly on Chrome, Firefox, Safari, Edge, and Brave browsers. It's fully responsive and works perfectly on iPhones, Android devices, iPads, and desktop computers. No app download needed — just visit the website and start downloading." },
  { title: "No Watermarks, No Limits", content: "Unlike other tools, MinusFlow ToolKit downloads the original video file without adding any watermarks, logos, or modifications. There are no daily limits, no speed throttling, and no forced waiting times. Download as many videos as you want, whenever you want." },
];

const YouTubeSingleDownloader = () => {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [thumbnail, setThumbnail] = useState("");
  const [formats, setFormats] = useState<MediaItem[]>([]);
  const [swept, setSwept] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handlePaste = () => { setSwept(true); setTimeout(() => setSwept(false), 700); };

  const handleFetch = async () => {
    if (!url.trim()) { toast.error("Please paste a YouTube URL"); return; }
    setLoading(true); setFormats([]); setTitle(""); setThumbnail("");
    const start = Date.now();
    try {
      const result = await fetchAndNormalize(url.trim());
      setTitle(result.title || "");
      setThumbnail(result.thumbnail || "");
      setFormats(result.mediaItems);
      trackToolUsage({ tool_name: "YouTube Single Downloader", tool_slug: "youtube-single-downloader", status: "success", input_url: url.trim(), duration_ms: Date.now() - start });
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch video info");
      trackToolUsage({ tool_name: "YouTube Single Downloader", tool_slug: "youtube-single-downloader", status: "error", input_url: url.trim(), error_message: err.message, duration_ms: Date.now() - start });
    } finally { setLoading(false); }
  };

  return (
    <ToolPageLayout
      icon={FaYoutube}
      title="YouTube Video"
      highlight="Downloader"
      subtitle="Download any YouTube video in MP4, MP3, and more — fast, free, no sign-up required."
      features={features}
      steps={steps}
      faqs={faqs}
      seoBlocks={seoBlocks}
    >
      {/* Input */}
      <div className={`input-glow flex w-full gap-2 rounded-xl p-1 ${swept ? "light-sweep" : ""}`}>
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            ref={inputRef}
            placeholder="Paste YouTube URL here..."
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onPaste={handlePaste}
            onKeyDown={(e) => e.key === "Enter" && handleFetch()}
            className="glass h-12 w-full rounded-xl pl-10 pr-4 text-foreground placeholder:text-muted-foreground outline-none transition-all duration-300 focus:shadow-[0_0_20px_hsl(0,85%,55%,0.15)]"
          />
        </div>
        <Button onClick={handleFetch} disabled={loading} className={`ripple-effect tap-feedback h-12 rounded-xl px-7 text-sm font-semibold transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] ${loading ? "" : "btn-pulse"}`}>
          {loading ? <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" />Fetching…</span> : "Fetch"}
        </Button>
      </div>

      {/* Loading shimmer */}
      <AnimatePresence>
        {loading && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} className="mt-8 w-full space-y-4">
            <div className="glass flex items-start gap-4 rounded-xl p-4">
              <div className="shimmer h-20 w-36 flex-shrink-0 rounded-lg" />
              <div className="flex-1 space-y-2 py-1"><div className="shimmer h-4 w-3/4 rounded" /><div className="shimmer h-4 w-1/2 rounded" /></div>
            </div>
            {[1, 2, 3].map((i) => <div key={i} className="shimmer h-16 w-full rounded-xl" />)}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Results */}
      <AnimatePresence>
        {!loading && (title || formats.length > 0) && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-8 w-full space-y-4">
            {(thumbnail || title) && (
              <div className="glass group flex items-start gap-4 rounded-xl p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-glow)]">
                {thumbnail && <div className="h-20 w-36 flex-shrink-0 overflow-hidden rounded-lg"><img src={thumbnail} alt={title} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" /></div>}
                <h2 className="text-sm font-semibold leading-snug text-foreground line-clamp-3">{title}</h2>
              </div>
            )}
            <div className="grid gap-3">
              {formats.map((f, i) => (
                <motion.div key={i} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 + i * 0.06, duration: 0.4 }}>
                  <FormatCard format={f.formatId} resolution={f.quality} fileSize={f.size || "N/A"} extension={f.extension} downloadUrl={f.url} fileName={f.fileName} isRecommended={i === 0} />
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </ToolPageLayout>
  );
};

export default YouTubeSingleDownloader;
