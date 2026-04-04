import { useState } from "react";
import { motion } from "framer-motion";
import { Download, Loader2, AlertCircle, Instagram, CheckCircle2 } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ScrollProgress from "@/components/ScrollProgress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const FUNCTION_BASE = `https://uphyqimrsclstdumeuwf.supabase.co/functions/v1/fetch-reel`;

interface DownloadLink {
  quality: string;
  url: string;
  format: string;
}

interface FetchResult {
  success: boolean;
  download_links?: DownloadLink[];
  thumbnail?: string;
  error?: string | null;
}

function triggerDownload(mediaUrl: string, filename: string) {
  const params = new URLSearchParams({ url: mediaUrl, filename });
  const iframe = document.createElement("iframe");
  iframe.style.display = "none";
  iframe.src = `${FUNCTION_BASE}?${params}`;
  document.body.appendChild(iframe);
  setTimeout(() => iframe.remove(), 30000);
}

const InstagramDownloader = () => {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FetchResult | null>(null);

  const handleSubmit = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(FUNCTION_BASE, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed }),
      });
      const data: FetchResult = await res.json();
      setResult(data);
    } catch {
      setResult({ success: false, error: "Something went wrong. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-[hsl(var(--background))]">
      <ScrollProgress />
      <Header />

      <main className="relative z-10 mx-auto flex min-h-[70vh] max-w-xl flex-col items-center justify-center px-4 pb-20 pt-8">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#833ab4] via-[#fd1d1d] to-[#fcb045]">
            <Instagram className="h-8 w-8 text-white" />
          </div>
          <h1 className="mb-2 text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
            Instagram Reels{" "}
            <span className="bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] bg-clip-text text-transparent">
              Downloader
            </span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Paste a public Instagram Reel URL and download in HD — fast &amp; free.
          </p>
        </motion.div>

        {/* Input */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6 w-full"
        >
          <div className="flex gap-3">
            <Input
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://www.instagram.com/reel/..."
              className="flex-1 border-white/10 bg-card text-foreground placeholder:text-muted-foreground"
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
            />
            <Button
              onClick={handleSubmit}
              disabled={loading || !url.trim()}
              className="bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] px-6 text-white hover:opacity-90"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              <span className="ml-2 hidden sm:inline">
                {loading ? "Fetching..." : "Download"}
              </span>
            </Button>
          </div>
        </motion.div>

        {/* Results */}
        {result && !result.success && result.error && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive flex items-center gap-3"
          >
            <AlertCircle className="h-5 w-5 shrink-0" />
            {result.error}
          </motion.div>
        )}

        {result?.success && result.download_links && result.download_links.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full space-y-4"
          >
            {/* Thumbnail */}
            {result.thumbnail && (
              <div className="mx-auto w-48 overflow-hidden rounded-xl border border-white/5">
                <img
                  src={result.thumbnail}
                  alt="Reel thumbnail"
                  className="h-auto w-full object-cover"
                />
              </div>
            )}

            {/* Download links */}
            <div className="rounded-xl border border-white/5 bg-card/80 p-4 backdrop-blur space-y-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-foreground">
                <CheckCircle2 className="h-4 w-4 text-green-400" />
                {result.download_links.length} download option
                {result.download_links.length > 1 ? "s" : ""} found
              </div>

              <div className="grid gap-2">
                {result.download_links.map((link, i) => (
                  <Button
                    key={i}
                    onClick={() =>
                      triggerDownload(
                        link.url,
                        `MinusFlow.net_reel_${link.quality}.${link.format}`
                      )
                    }
                    className="w-full bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] text-white hover:opacity-90"
                  >
                    <Download className="mr-2 h-4 w-4" />
                    Download {link.quality} ({link.format.toUpperCase()})
                  </Button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </main>

      <Footer />
    </div>
  );
};

export default InstagramDownloader;
