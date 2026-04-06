import { useState } from "react";
import { motion } from "framer-motion";
import { Download, Loader2, AlertCircle, Instagram, Zap, Shield, Globe, Image, Heart, Camera } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ToolPageLayout from "@/components/ToolPageLayout";

const FUNCTION_BASE = `https://uphyqimrsclstdumeuwf.supabase.co/functions/v1/fetch-reel`;
interface DownloadLink { quality: string; url: string; format: string; }
interface FetchResult { success: boolean; download_links?: DownloadLink[]; thumbnail?: string; title?: string; hashtags?: string[]; error?: string | null; }

function sanitizeFilename(name: string) { return name.replace(/[^a-zA-Z0-9_\-. #]/g, "").replace(/\s+/g, "_").slice(0, 120) || "reel"; }
function buildFilename(result: FetchResult, quality: string, format: string) { return `MinusFlow.net${result.title ? `_${sanitizeFilename(result.title)}` : "_reel"}_${quality}.${format}`; }
function triggerDownload(mediaUrl: string, filename: string) { const params = new URLSearchParams({ url: mediaUrl, filename }); const iframe = document.createElement("iframe"); iframe.style.display = "none"; iframe.src = `${FUNCTION_BASE}?${params}`; document.body.appendChild(iframe); setTimeout(() => iframe.remove(), 30000); }
async function fetchReel(url: string): Promise<FetchResult> { const res = await fetch(FUNCTION_BASE, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ url }) }); return res.json(); }

const features = [
  { icon: Image, title: "Reels & Videos", desc: "Download Instagram Reels, video posts, and IGTV content in full HD quality." },
  { icon: Heart, title: "Original Quality", desc: "Files are saved in their original resolution — no compression, no quality loss." },
  { icon: Camera, title: "Multiple Formats", desc: "Choose from multiple quality options when available — pick the best one for you." },
  { icon: Zap, title: "Instant Processing", desc: "Videos are fetched and ready to download in just 2-3 seconds." },
  { icon: Shield, title: "No Login Required", desc: "You don't need an Instagram account or any login. Just paste the URL and download." },
  { icon: Globe, title: "Works Everywhere", desc: "Compatible with all devices and browsers — desktop, mobile, tablet." },
];

const steps = [
  { title: "Find the Instagram Content", desc: "Open Instagram and navigate to the reel or video post you want to download." },
  { title: "Copy the Link", desc: "Tap the three dots (⋯) on the post and select 'Copy Link', or copy the URL from your browser." },
  { title: "Paste & Process", desc: "Paste the copied URL into the input field above and click the Download button." },
  { title: "Choose Quality & Save", desc: "Select your preferred quality from the dropdown and click Download to save the file." },
];

const faqs = [
  { q: "What Instagram content can I download?", a: "You can download Instagram Reels, video posts, IGTV videos, and some carousel video content. The content must be from a public Instagram profile — private account content cannot be accessed." },
  { q: "Do I need an Instagram account to use this?", a: "No! YTFetch Instagram Downloader works without any login or Instagram account. Just paste the URL of any public Instagram content and download it instantly." },
  { q: "What quality are the downloads?", a: "We download Instagram content in the highest quality available — typically 1080p for Reels and up to 4K for some video posts. The exact quality depends on what the creator originally uploaded." },
  { q: "Can I download Instagram Stories?", a: "Currently, our tool is optimized for Reels and video posts. Instagram Stories have different access methods and are not supported at this time. We're exploring adding this feature in the future." },
  { q: "Why does the download sometimes fail?", a: "Common reasons include: the account is private, the URL is incorrect, or the content has been deleted. Make sure you're copying the correct URL from a public Instagram profile." },
  { q: "Can I download Instagram photos?", a: "Our tool is optimized for video content (Reels, video posts). For photo downloads, right-clicking and 'Save Image' in your browser usually works for public photos." },
  { q: "Are hashtags preserved in the filename?", a: "Yes! When available, we include relevant hashtags in the downloaded filename along with the post title. This makes it easy to organize and find your downloaded content later." },
  { q: "Is this tool safe to use?", a: "Absolutely. YTFetch is a web-based tool that never stores your data, URLs, or downloaded files. We don't require any permissions, logins, or personal information. Your privacy is guaranteed." },
];

const seoBlocks = [
  { title: "Free Instagram Reels Downloader — HD Quality", content: "YTFetch Instagram Downloader lets you save Instagram Reels and video posts in high definition quality. No Instagram login needed, no app to install — just paste the URL and download instantly. Works with all public Instagram content." },
  { title: "Save Instagram Content for Offline Viewing", content: "Want to watch your favorite Reels offline? Our tool downloads the original video file to your device. Watch anytime without internet, save mobile data, and build your personal content library." },
  { title: "Multiple Quality Options Available", content: "When available, our tool offers multiple quality levels for each download. Choose between HD and SD based on your storage needs and viewing preferences. All downloads preserve the original quality without re-encoding." },
];

const InstagramSingleDownloader = () => {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<FetchResult | null>(null);
  const [selectedIdx, setSelectedIdx] = useState(0);

  const handleSubmit = async () => {
    const trimmed = url.trim(); if (!trimmed) return;
    setLoading(true); setResult(null);
    try { const data = await fetchReel(trimmed); setResult(data); }
    catch { setResult({ success: false, error: "Something went wrong. Please try again." }); }
    finally { setLoading(false); }
  };

  return (
    <ToolPageLayout
      icon={Instagram}
      title="Instagram Reels"
      highlight="Downloader"
      subtitle="Download Instagram reels, videos, and posts in HD — fast, free, no login required."
      badge="HD Quality — No Login Needed"
      gradientFrom="from-[#833ab4]"
      gradientTo="to-[#fcb045]"
      iconBgClass="bg-gradient-to-br from-[#833ab4]/10 via-[#fd1d1d]/10 to-[#fcb045]/10"
      features={features}
      steps={steps}
      faqs={faqs}
      seoBlocks={seoBlocks}
    >
      <div className="space-y-6">
        <div className="flex gap-3">
          <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://www.instagram.com/reel/..." className="flex-1 border-white/10 bg-card text-foreground placeholder:text-muted-foreground" onKeyDown={(e) => e.key === "Enter" && handleSubmit()} />
          <Button onClick={handleSubmit} disabled={loading || !url.trim()} className="bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] px-6 text-white hover:opacity-90">
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
            <span className="ml-2 hidden sm:inline">{loading ? "Fetching..." : "Download"}</span>
          </Button>
        </div>

        {result && !result.success && result.error && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full rounded-xl border border-destructive/30 bg-destructive/10 p-4 text-sm text-destructive flex items-center gap-3">
            <AlertCircle className="h-5 w-5 shrink-0" /> {result.error}
          </motion.div>
        )}

        {result && result.success && result.download_links?.length && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full rounded-xl border border-border bg-card p-4 space-y-4">
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
                <SelectContent>{result.download_links.map((link, i) => <SelectItem key={i} value={String(i)}>{link.quality} — {link.format.toUpperCase()}</SelectItem>)}</SelectContent>
              </Select>
              <Button onClick={() => { const link = result.download_links![selectedIdx]; triggerDownload(link.url, buildFilename(result, link.quality, link.format)); }} className="bg-gradient-to-r from-[#833ab4] via-[#fd1d1d] to-[#fcb045] text-white hover:opacity-90 px-6">
                <Download className="h-4 w-4 mr-1.5" /> Download
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </ToolPageLayout>
  );
};

export default InstagramSingleDownloader;
