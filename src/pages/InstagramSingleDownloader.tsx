import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Loader2, AlertCircle, Instagram } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ScrollProgress from "@/components/ScrollProgress";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const FUNCTION_BASE = `https://uphyqimrsclstdumeuwf.supabase.co/functions/v1/fetch-reel`;

interface DownloadLink { quality: string; url: string; format: string; }
interface FetchResult { success: boolean; download_links?: DownloadLink[]; thumbnail?: string; title?: string; hashtags?: string[]; error?: string | null; }

function sanitizeFilename(name: string) {
  return name.replace(/[^a-zA-Z0-9_\-. #]/g, "").replace(/\s+/g, "_").slice(0, 120) || "reel";
}

function buildFilename(result: FetchResult, quality: string, format: string) {
  let name = "MinusFlow.net";
  name += result.title ? `_${sanitizeFilename(result.title)}` : "_reel";
  name += `_${quality}.${format}`;
  return name;
}

function triggerDownload(mediaUrl: string, filename: string) {
  const params = new URLSearchParams({ url: mediaUrl, filename });
  const iframe = document.createElement("iframe");
  iframe.style.display = "none";
  iframe.src = `${FUNCTION_BASE}?${params}`;
  document.body.appendChild(iframe);
  setTimeout(() => iframe.remove(), 30000);
}

async function fetchReel(url: string): Promise<FetchResult> {
  const res = await fetch(FUNCTION_BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ url }),
  });
  return res.json();
}

const InstagramSingleDownloader = () => {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FetchResult | null>(null);
  const [selectedIdx, setSelectedIdx] = useState(0);

  const handleSubmit = async () => {
    const trimmed = url.trim();
    if (!trimmed) return;
    setLoading(true);
    setResult(null);
    try {
      const data = await fetchReel(trimmed);
      setResult(data);
    } catch {
      setResult({ success: false, error: "Something went wrong. Please try again." });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen bg-[hsl(var(--background))]">
      <ScrollProgress />
      <Header />

      <main className="relative z-10 mx-auto max-w-2xl px-4 pb-20 pt-8">
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mb-8 text-center">
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
            Download Instagram reels, videos, and posts in HD — fast & free.
          </p>
        </motion.div>

        <div className="space-y-6">
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
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
              <span className="ml-2 hidden sm:inline">{loading ? "Fetching..." : "Download"}</span>
            </Button>
          </div>

          {/* Result */}
          {result && !result.success && result.error && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="w-full rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive flex items-center gap-3">
              <AlertCircle className="h-5 w-5 shrink-0" /> {result.error}
            </motion.div>
          )}

          {result && result.success && result.download_links?.length && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
              className="w-full rounded-xl border border-border bg-card p-4 space-y-4">
              <div className="flex gap-4 items-start">
                {result.thumbnail && <img src={result.thumbnail} alt="Reel" className="h-24 w-24 flex-shrink-0 rounded-lg object-cover" />}
                <div className="flex-1 min-w-0">
                  {result.title && <p className="font-semibold text-foreground line-clamp-2 text-sm">{result.title}</p>}
                  {result.hashtags?.length ? <p className="text-xs text-muted-foreground mt-1 line-clamp-1">{result.hashtags.slice(0, 5).map(t => `#${t}`).join(" ")}</p> : null}
                </div>
              </div>
              <div className="flex gap-2 items-center">
                <Select value={String(selectedIdx)} onValueChange={(v) => setSelectedIdx(Number(v))}>
                  <SelectTrigger className="flex-1 bg-background border-border"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {result.download_links.map((link, i) => (
                      <SelectItem key={i} value={String(i)}>{link.quality} — {link.format.toUpperCase()}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  onClick={() => {
                    const link = result.download_links![selectedIdx];
                    triggerDownload(link.url, buildFilename(result, link.quality, link.format));
                  }}
                  className="bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] text-white hover:opacity-90 px-6"
                >
                  <Download className="h-4 w-4 mr-1.5" /> Download
                </Button>
              </div>
            </motion.div>
          )}
        </div>

        {/* SEO Content */}
        <section className="mt-16 space-y-6 text-sm leading-relaxed text-muted-foreground">
          <h2 className="text-xl font-bold text-foreground">Download Instagram Reels & Videos — Free HD Downloader</h2>
          <p>
            YTFetch Instagram Downloader lets you save Instagram reels, videos, and posts in high quality.
            Simply paste the Instagram URL and download instantly — no login or app required.
          </p>
          <h3 className="text-lg font-semibold text-foreground">How to Download Instagram Reels</h3>
          <ol className="list-decimal list-inside space-y-1">
            <li>Open Instagram and go to the reel/video you want to download</li>
            <li>Tap the three dots (⋯) and select "Copy Link"</li>
            <li>Paste the URL in the input field above</li>
            <li>Click "Download" and choose your preferred quality</li>
            <li>Your download starts instantly</li>
          </ol>
          <h3 className="text-lg font-semibold text-foreground">What Can You Download?</h3>
          <ul className="list-disc list-inside space-y-1">
            <li>Instagram Reels in HD quality</li>
            <li>Instagram video posts</li>
            <li>IGTV videos</li>
            <li>Public profile content</li>
          </ul>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default InstagramSingleDownloader;
