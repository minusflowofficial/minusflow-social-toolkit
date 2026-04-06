import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Search, Loader2, Zap, Shield, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import FormatCard from "@/components/FormatCard";
import BulkDownload from "@/components/BulkDownload";
import PlaylistDownload from "@/components/PlaylistDownload";
import FAQ from "@/components/FAQ";
import ParticleBackground from "@/components/ParticleBackground";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ScrollProgress from "@/components/ScrollProgress";
import AnimatedCounter from "@/components/AnimatedCounter";
import useDownloadCount from "@/hooks/useDownloadCount";
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

const headlineWords = ["Download", "YouTube", "videos", "in", "any", "format"];

const trustItems = [
  { icon: Zap, label: "Lightning Fast", desc: "Instant video processing" },
  { icon: Shield, label: "100% Safe", desc: "No data stored ever" },
  { icon: Clock, label: "Always Free", desc: "No sign-up required" },
];

const Index = () => {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [thumbnail, setThumbnail] = useState("");
  const [formats, setFormats] = useState<MediaItem[]>([]);
  const [swept, setSwept] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const downloadCount = useDownloadCount();

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
        trackToolUsage({ tool_name: "YouTube Downloader", tool_slug: "youtube-downloader", status: "error", input_url: url.trim(), error_message: "No formats found", duration_ms: Date.now() - start });
        return;
      }
      setTitle(data.title || "");
      setThumbnail(data.thumbnail || "");
      setFormats(data.mediaItems);
      trackToolUsage({ tool_name: "YouTube Downloader", tool_slug: "youtube-downloader", status: "success", input_url: url.trim(), duration_ms: Date.now() - start });
    } catch (err: any) {
      toast.error(err.message || "Failed to fetch video info");
      trackToolUsage({ tool_name: "YouTube Downloader", tool_slug: "youtube-downloader", status: "error", input_url: url.trim(), error_message: err.message, duration_ms: Date.now() - start });
    } finally {
      setLoading(false);
    }
  };

  const createRipple = (e: React.MouseEvent<HTMLButtonElement>) => {
    const button = e.currentTarget;
    const circle = document.createElement("span");
    const diameter = Math.max(button.clientWidth, button.clientHeight);
    const radius = diameter / 2;
    circle.style.width = circle.style.height = `${diameter}px`;
    circle.style.left = `${e.clientX - button.getBoundingClientRect().left - radius}px`;
    circle.style.top = `${e.clientY - button.getBoundingClientRect().top - radius}px`;
    circle.className = "ripple";
    button.appendChild(circle);
    setTimeout(() => circle.remove(), 600);
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-animate">
      <ParticleBackground />
      <ScrollProgress />
      <Header />

      {/* Powered by banner */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        className="relative z-20 flex items-center justify-center py-2"
      >
        <span className="glass rounded-full px-5 py-1.5 text-xs font-medium tracking-wide text-muted-foreground">
          ⚡ Powered by{" "}
          <a
            href="https://minusflow.net"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-primary hover:underline"
          >
            MinusFlow.net
          </a>
        </span>
      </motion.div>

      <main className="relative z-10 flex flex-1 flex-col items-center px-4 pt-4 pb-8">
        {/* Staggered headline */}
        <div className="mb-8 flex flex-wrap items-center justify-center gap-x-2 gap-y-1">
          {headlineWords.map((word, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{
                delay: 0.3 + i * 0.08,
                duration: 0.5,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
              className="text-lg text-muted-foreground md:text-xl"
            >
              {word}
            </motion.span>
          ))}
          <motion.span
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 + headlineWords.length * 0.08, duration: 0.5 }}
            className="text-lg text-muted-foreground md:text-xl"
          >
            — fast, free, no&nbsp;sign-up.
          </motion.span>
        </div>

        {/* Input */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.7, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
          className={`input-glow flex w-full max-w-xl gap-2 rounded-xl p-1 ${swept ? "light-sweep" : ""}`}
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
            onClick={(e) => {
              createRipple(e);
              handleFetch();
            }}
            disabled={loading}
            className={`ripple-effect tap-feedback h-12 rounded-xl px-7 text-sm font-semibold transition-all duration-300 hover:scale-[1.03] active:scale-[0.97] ${
              loading ? "" : "btn-pulse"
            }`}
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

        {/* Bulk Download */}
        <BulkDownload />
        <PlaylistDownload />

        {/* Loading shimmer */}
        <AnimatePresence>
          {loading && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="mt-10 w-full max-w-xl space-y-4"
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
              transition={{ duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
              className="mt-10 w-full max-w-xl space-y-4"
            >
              {(thumbnail || title) && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
                  className="glass group flex items-start gap-4 rounded-xl p-4 transition-all duration-300 hover:-translate-y-1 hover:shadow-[var(--shadow-glow)]"
                >
                  {thumbnail && (
                    <div className="h-20 w-36 flex-shrink-0 overflow-hidden rounded-lg">
                      <img
                        src={thumbnail}
                        alt={title}
                        loading="lazy"
                        className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
                      />
                    </div>
                  )}
                  <h2 className="text-sm font-semibold leading-snug text-foreground line-clamp-3">
                    {title}
                  </h2>
                </motion.div>
              )}

              <div className="grid gap-3">
                {formats.map((f, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{
                      delay: 0.1 + i * 0.06,
                      duration: 0.4,
                      ease: [0.25, 0.46, 0.45, 0.94],
                    }}
                  >
                    <FormatCard
                      format={f.formatId}
                      resolution={f.quality}
                      fileSize={f.size || "N/A"}
                      extension={f.extension}
                      downloadUrl={f.url}
                      fileName={f.fileName}
                      isRecommended={i === 0}
                    />
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats counters */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mt-20 grid w-full max-w-2xl grid-cols-3 gap-6 px-4"
        >
          <AnimatedCounter target={downloadCount} suffix="+" label="Downloads" />
          <AnimatedCounter target={10} suffix="+" label="Formats" />
          <AnimatedCounter target={99} suffix="%" label="Uptime" />
        </motion.section>

        {/* Trust section */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6 }}
          className="mt-16 grid w-full max-w-2xl grid-cols-1 gap-4 px-4 sm:grid-cols-3"
        >
          {trustItems.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
              whileHover={{ y: -4, scale: 1.02 }}
              className="glass tap-feedback flex flex-col items-center gap-2 rounded-xl p-6 text-center transition-shadow duration-300 hover:shadow-[var(--shadow-glow)]"
            >
              <motion.div whileHover={{ rotate: 10 }} transition={{ type: "spring", stiffness: 300 }}>
                <item.icon className="h-7 w-7 text-primary" />
              </motion.div>
              <p className="font-semibold text-foreground">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </motion.div>
          ))}
        </motion.section>

        <FAQ />
      </main>

      <Footer />
    </div>
  );
};

export default Index;
