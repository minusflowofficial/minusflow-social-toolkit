import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Search, Loader2, Download, Youtube } from "lucide-react";
import { Button } from "@/components/ui/button";
import FormatCard from "@/components/FormatCard";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ScrollProgress from "@/components/ScrollProgress";
import ParticleBackground from "@/components/ParticleBackground";
import { trackToolUsage } from "@/lib/analytics";
import { toast } from "sonner";

interface MediaItem {
  formatId: string;
  quality: string;
  extension: string;
  size: string;
  url: string;
  fileName?: string;
}

const YouTubeSingleDownloader = () => {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [thumbnail, setThumbnail] = useState("");
  const [formats, setFormats] = useState<MediaItem[]>([]);
  const [swept, setSwept] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handlePaste = () => {
    setSwept(true);
    setTimeout(() => setSwept(false), 700);
  };

  const handleFetch = async () => {
    if (!url.trim()) {
      toast.error("Please paste a YouTube URL");
      return;
    }
    setLoading(true);
    setFormats([]);
    setTitle("");
    setThumbnail("");
    const start = Date.now();

    try {
      const { data, error } = await supabase.functions.invoke("youtube-download", {
        body: { url: url.trim() },
      });
      if (error) throw error;
      if (!data || !data.mediaItems?.length) {
        toast.error("No downloadable formats found");
        trackToolUsage({ tool_name: "YouTube Single Downloader", tool_slug: "youtube-single-downloader", status: "error", input_url: url.trim(), error_message: "No formats found", duration_ms: Date.now() - start });
        return;
      }
      setTitle(data.title || "");
      setThumbnail(data.thumbnail || "");
      setFormats(data.mediaItems);
      trackToolUsage({ tool_name: "YouTube Single Downloader", tool_slug: "youtube-single-downloader", status: "success", input_url: url.trim(), duration_ms: Date.now() - start });
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch video info");
      trackToolUsage({ tool_name: "YouTube Single Downloader", tool_slug: "youtube-single-downloader", status: "error", input_url: url.trim(), error_message: err.message, duration_ms: Date.now() - start });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-animate">
      <ParticleBackground />
      <ScrollProgress />
      <Header />

      <main className="relative z-10 mx-auto flex w-full max-w-2xl flex-1 flex-col items-center px-4 pb-20 pt-8">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <Youtube className="h-8 w-8 text-primary" />
          </div>
          <h1 className="mb-2 text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
            YouTube Video{" "}
            <span className="bg-gradient-to-r from-primary to-orange-400 bg-clip-text text-transparent">
              Downloader
            </span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Download any YouTube video in MP4, MP3, and more — fast, free, no sign-up.
          </p>
        </motion.div>

        {/* Input */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2, duration: 0.5 }}
          className={`input-glow flex w-full gap-2 rounded-xl p-1 ${swept ? "light-sweep" : ""}`}
        >
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
          <Button
            onClick={handleFetch}
            disabled={loading}
            className={`ripple-effect tap-feedback h-12 rounded-xl px-7 text-sm font-semibold transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] ${loading ? "" : "btn-pulse"}`}
          >
            {loading ? (
              <span className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Fetching…
              </span>
            ) : (
              "Fetch"
            )}
          </Button>
        </motion.div>

        {/* Loading shimmer */}
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-10 w-full space-y-4"
            >
              <div className="glass flex items-start gap-4 rounded-xl p-4">
                <div className="shimmer h-20 w-36 flex-shrink-0 rounded-lg" />
                <div className="flex-1 space-y-2 py-1">
                  <div className="shimmer h-4 w-3/4 rounded" />
                  <div className="shimmer h-4 w-1/2 rounded" />
                </div>
              </div>
              {[1, 2, 3].map((i) => (
                <div key={i} className="shimmer h-16 w-full rounded-xl" />
              ))}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Results */}
        <AnimatePresence>
          {!loading && (title || formats.length > 0) && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="mt-10 w-full space-y-4"
            >
              {(thumbnail || title) && (
                <div className="glass group flex items-start gap-4 rounded-xl p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-glow)]">
                  {thumbnail && (
                    <div className="h-20 w-36 flex-shrink-0 overflow-hidden rounded-lg">
                      <img src={thumbnail} alt={title} loading="lazy" className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110" />
                    </div>
                  )}
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

        {/* SEO Content */}
        <section className="mt-16 space-y-6 text-sm leading-relaxed text-muted-foreground">
          <h2 className="text-xl font-bold text-foreground">Free YouTube Video Downloader — Download MP4, MP3 & More</h2>
          <p>
            YTFetch YouTube Video Downloader lets you save any YouTube video directly to your device in seconds.
            Simply paste the video URL, choose your preferred format (MP4 video or MP3 audio), and download instantly.
            No sign-up, no software installation, and completely free — works on desktop, tablet, and mobile.
          </p>
          <h3 className="text-lg font-semibold text-foreground">Supported Formats & Quality</h3>
          <p>
            Download YouTube videos in MP4 at resolutions up to 1080p Full HD, 720p HD, 480p SD, and 360p.
            For audio-only downloads, we offer MP3 and M4A formats with high-quality bitrates.
            Whether you need a video for offline viewing or just the audio from a music video, lecture, or podcast — we've got you covered.
          </p>
          <h3 className="text-lg font-semibold text-foreground">How to Download a YouTube Video</h3>
          <ol className="list-decimal list-inside space-y-1">
            <li>Copy the YouTube video URL from your browser or the YouTube app</li>
            <li>Paste the URL into the input field above</li>
            <li>Click "Fetch" to see all available download options</li>
            <li>Choose your preferred quality and format</li>
            <li>Click the download button — your file starts instantly</li>
          </ol>
          <h3 className="text-lg font-semibold text-foreground">Supported YouTube URL Formats</h3>
          <p>We accept all standard YouTube URLs including youtube.com/watch?v=, youtu.be/ short links, youtube.com/shorts/, and even embed URLs.</p>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default YouTubeSingleDownloader;
