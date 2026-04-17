import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, Loader2, Copy, Download, AlertCircle, Search, X,
  Zap, Globe, Shield, Brain, Languages, CheckCircle2, Clock, Film,
} from "lucide-react";
import HCaptcha from "@hcaptcha/react-hcaptcha";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import ToolPageLayout from "@/components/ToolPageLayout";

const FUNCTION_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/facebook-transcript`;
const HCAPTCHA_SITEKEY = "ec0a1d1c-0142-40fc-b62a-9b94774065fc";

type Stage = "idle" | "creating" | "transcribing" | "polling" | "fetching" | "done" | "error";

interface VideoInfo {
  file_id: string;
  title: string;
  duration: number;
}

const formatDuration = (sec: number) => {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  if (h > 0) return `${h}h ${m}m ${s}s`;
  if (m > 0) return `${m}m ${s}s`;
  return `${s}s`;
};

const stageLabels: Record<Stage, string> = {
  idle: "",
  creating: "Fetching video info...",
  transcribing: "Starting transcription...",
  polling: "Processing audio...",
  fetching: "Downloading transcript...",
  done: "Done!",
  error: "Error",
};

const stageProgress: Record<Stage, number> = {
  idle: 0, creating: 15, transcribing: 30, polling: 65, fetching: 90, done: 100, error: 0,
};

const FacebookTranscriptExtractor = () => {
  const [url, setUrl] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState("");
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [transcript, setTranscript] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<HCaptcha>(null);

  const isProcessing = ["creating", "transcribing", "polling", "fetching"].includes(stage);

  const callFn = async (body: Record<string, unknown>) => {
    const res = await fetch(FUNCTION_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok || data.success === false || data.error) {
      throw new Error(data.error || "Request failed");
    }
    return data;
  };

  const resetCaptcha = () => {
    captchaRef.current?.resetCaptcha();
    setCaptchaToken(null);
  };

  const startTranscription = useCallback(async (token: string) => {
    try {
      setStage("creating");
      const createData = await callFn({ action: "create", url: url.trim(), hcaptchaToken: token });
      const fileId = createData.file_id;
      if (!fileId) throw new Error("No file ID returned. Please try a different URL.");
      setVideoInfo({
        file_id: fileId,
        title: createData.title || "Video",
        duration: createData.duration || 0,
      });

      setStage("transcribing");
      await callFn({ action: "transcribe", fileId });

      setStage("polling");
      const maxAttempts = 120;
      for (let i = 0; i < maxAttempts; i++) {
        await new Promise((r) => setTimeout(r, 5000));
        const s = await callFn({ action: "status", fileId });
        if (s.status === "ok" && s.url) {
          setStage("fetching");
          const t = await callFn({ action: "fetch-text", url: s.url });
          setTranscript(t.text || "");
          setStage("done");
          toast.success("Transcript ready!");
          resetCaptcha();
          return;
        }
        if (s.status === "error") throw new Error(s.error || "Transcription failed");
      }
      throw new Error("Transcription timed out. Please try again.");
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(msg);
      setStage("error");
      toast.error(msg);
      resetCaptcha();
    }
  }, [url]);

  const handleSubmit = async () => {
    if (!url.trim()) { toast.error("Please paste a video URL"); return; }
    if (!captchaToken) { toast.error("Please solve the captcha first"); return; }
    setError(""); setTranscript(""); setVideoInfo(null);
    await startTranscription(captchaToken);
  };

  const copyTranscript = () => {
    navigator.clipboard.writeText(transcript);
    toast.success("Copied!");
  };

  const downloadTxt = () => {
    const blob = new Blob([transcript], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `MinusFlow.net_${(videoInfo?.title || "transcript").replace(/[^\w\s]/g, "").slice(0, 40)}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success("Downloaded!");
  };

  const lines = transcript.split(/\n+/).filter(Boolean);
  const filteredLines = searchQuery
    ? lines.filter((l) => l.toLowerCase().includes(searchQuery.toLowerCase()))
    : lines;
  const wordCount = transcript.split(/\s+/).filter(Boolean).length;

  const features = [
    { icon: Brain, title: "AI-Powered", desc: "Advanced AI transcription delivers accurate, context-aware results every time." },
    { icon: Globe, title: "Multi-Platform", desc: "Works with Facebook, YouTube, TikTok, Instagram, SoundCloud & more." },
    { icon: Zap, title: "Lightning Fast", desc: "Transcripts ready in under a minute for most videos. No waiting around." },
    { icon: Shield, title: "Privacy First", desc: "No login required. Your URLs and transcripts are never stored on our servers." },
    { icon: Languages, title: "100+ Languages", desc: "Auto-detects and transcribes content in over 100 languages and dialects." },
    { icon: FileText, title: "Export Ready", desc: "Copy individual lines, the full text, or download as a clean .txt file." },
  ];

  const steps = [
    { title: "Paste Video URL", desc: "Copy any video link from Facebook, YouTube, TikTok, Instagram, or SoundCloud and paste it in the input box." },
    { title: "Solve Quick Captcha", desc: "Click the captcha checkbox to verify you're human — takes one second, keeps the service free for everyone." },
    { title: "Click Transcribe", desc: "Hit the Transcribe button and watch the progress bar. Your full transcript appears as soon as it's ready." },
  ];

  const faqs = [
    { q: "Which platforms are supported?", a: "Facebook, YouTube, TikTok, Instagram, SoundCloud, Twitter/X, and most public video platforms. Just paste the link." },
    { q: "Is this really free?", a: "Yes — 100% free, no signup, no hidden fees. The captcha keeps the service free by preventing abuse." },
    { q: "How long does transcription take?", a: "Usually 20–60 seconds depending on video length. Longer videos may take a few minutes." },
    { q: "Are there video length limits?", a: "Maximum video duration is 2 hours. For best results, use videos with clear audio and minimal background noise." },
    { q: "Can I transcribe private videos?", a: "No — only publicly accessible videos can be transcribed. The video must be viewable without login." },
    { q: "Why do I need to solve a captcha?", a: "The captcha prevents bots from abusing the service, which keeps it fast and free for real users like you." },
    { q: "Do you store my videos or transcripts?", a: "No. Everything is processed in real-time and never saved on our servers. Full privacy guaranteed." },
    { q: "What languages are supported?", a: "Over 100 languages including English, Spanish, Hindi, Urdu, Arabic, French, German, Mandarin, and more — auto-detected." },
    { q: "Can I download the transcript?", a: "Yes — download as a plain .txt file, copy the full text, or copy individual lines with one click." },
    { q: "What if transcription fails?", a: "Try refreshing the captcha and submitting again. If it persists, the video may have no audio or be inaccessible." },
  ];

  const seoBlocks = [
    {
      title: "Transcribe Facebook, YouTube, TikTok & Instagram Videos to Text",
      content: "MinusFlow's AI Video Transcript Extractor instantly converts spoken content from any public video into clean, readable text. Whether it's a Facebook Reel, YouTube tutorial, TikTok clip, or Instagram video, our tool handles it in seconds — no software downloads, no installations, no signup required.",
    },
    {
      title: "Why Use an AI Transcript Generator?",
      content: "Video transcripts make content searchable, accessible, and reusable. Use them for SEO blog posts, subtitles, study notes, research, accessibility compliance, content repurposing, or simply to read what you'd rather not watch. Our AI handles accents, multiple speakers, music, and background noise far better than basic auto-captions.",
    },
    {
      title: "Powered by Advanced AI Speech Recognition",
      content: "Unlike basic speech-to-text tools that produce garbled output, our AI understands context, punctuation, and natural speech patterns. The result is a transcript that reads like it was professionally written, complete with proper formatting and language detection.",
    },
    {
      title: "Perfect for Creators, Students & Marketers",
      content: "Content creators repurpose videos into blog posts and articles. Students convert lectures into searchable study notes. Marketers extract powerful quotes for social media campaigns. Researchers analyze interviews efficiently. Whatever your use case, transcripts unlock the value hidden inside video content.",
    },
    {
      title: "100% Free, No Signup, No Limits",
      content: "Most transcription tools charge per minute or hide features behind expensive paywalls. MinusFlow is completely free with no account required. Just paste your URL, solve a quick captcha, and get your transcript — as many videos as you need, every day.",
    },
  ];

  return (
    <ToolPageLayout
      icon={FileText}
      title="AI Video Transcript"
      highlight="Extractor"
      subtitle="Transcribe any Facebook, YouTube, TikTok, or Instagram video to text in seconds — free, accurate, and powered by AI."
      badge="✨ Free AI Transcription"
      gradientFrom="from-[#1877F2]"
      gradientTo="to-[#42b72a]"
      iconBgClass="bg-[#1877F2]/10"
      features={features}
      steps={steps}
      faqs={faqs}
      seoBlocks={seoBlocks}
    >
      <div className="space-y-4">
        {/* Input row */}
        <div className="flex flex-col sm:flex-row gap-3">
          <Input
            placeholder="Paste video URL (Facebook, YouTube, TikTok, Instagram...)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && !isProcessing && handleSubmit()}
            disabled={isProcessing}
            className="flex-1 border-border/60 bg-secondary/50 h-12 text-base"
          />
          <Button
            onClick={handleSubmit}
            disabled={isProcessing || !captchaToken}
            size="lg"
            className="gap-2 bg-gradient-to-r from-[#1877F2] to-[#42b72a] hover:opacity-90 text-white h-12 px-8 font-semibold disabled:opacity-50"
          >
            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            Transcribe
          </Button>
        </div>

        {/* Captcha */}
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border/40 bg-secondary/20 p-3">
          <div className="text-xs text-muted-foreground">
            {captchaToken ? (
              <span className="flex items-center gap-1.5 text-green-500 font-medium">
                <CheckCircle2 className="h-4 w-4" /> Captcha verified — ready to transcribe
              </span>
            ) : (
              <span>👉 Solve the captcha to enable the Transcribe button</span>
            )}
          </div>
          <HCaptcha
            ref={captchaRef}
            sitekey={HCAPTCHA_SITEKEY}
            size="compact"
            theme="dark"
            onVerify={(token) => setCaptchaToken(token)}
            onError={() => { setCaptchaToken(null); toast.error("Captcha failed, please retry"); }}
            onExpire={() => setCaptchaToken(null)}
          />
        </div>

        {/* Platform chips */}
        <div className="flex flex-wrap justify-center gap-2 pt-1">
          {["Facebook", "YouTube", "TikTok", "Instagram", "SoundCloud", "Reels"].map((p) => (
            <span key={p} className="rounded-full border border-border/60 bg-card/40 px-3 py-1 text-xs text-muted-foreground backdrop-blur-sm">{p}</span>
          ))}
        </div>

        {/* Progress */}
        <AnimatePresence>
          {isProcessing && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="rounded-xl border border-border/60 bg-secondary/30 p-4 space-y-3"
            >
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin text-[#1877F2]" />
                  {stageLabels[stage]}
                </span>
                <span className="text-muted-foreground">{stageProgress[stage]}%</span>
              </div>
              <Progress value={stageProgress[stage]} className="h-2" />

              {videoInfo && (
                <div className="flex items-center gap-3 rounded-lg border border-border/40 bg-card/40 p-3 mt-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#1877F2]/10">
                    <Film className="h-5 w-5 text-[#1877F2]" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{videoInfo.title}</p>
                    {videoInfo.duration > 0 && (
                      <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                        <Clock className="h-3 w-3" /> {formatDuration(videoInfo.duration)}
                      </p>
                    )}
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Error */}
        {stage === "error" && error && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-start gap-3 rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
            <AlertCircle className="h-5 w-5 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="font-medium">Transcription failed</p>
              <p className="text-xs mt-1 opacity-90">{error}</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => { setStage("idle"); setError(""); }}>Retry</Button>
          </motion.div>
        )}

        {/* Result */}
        {stage === "done" && transcript && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-3 pt-2">
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border/60 bg-secondary/30 p-3">
              <div className="flex-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground min-w-0">
                <span className="font-medium text-foreground text-sm truncate max-w-xs">{videoInfo?.title}</span>
                <span>•</span>
                <span>{wordCount.toLocaleString()} words</span>
                <span>•</span>
                <span>{lines.length} lines</span>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={copyTranscript} className="gap-1.5">
                  <Copy className="h-3.5 w-3.5" /> Copy
                </Button>
                <Button size="sm" variant="outline" onClick={downloadTxt} className="gap-1.5">
                  <Download className="h-3.5 w-3.5" /> .txt
                </Button>
              </div>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search transcript..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm border-border/60 bg-secondary/30"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            <div className="rounded-xl border border-border/60 bg-secondary/20">
              <ScrollArea className="h-[480px] p-3">
                <div className="space-y-1">
                  {filteredLines.map((line, i) => (
                    <div key={i} className="group flex items-start gap-2 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-secondary/60">
                      <span className="flex-1 text-foreground/90 whitespace-pre-wrap leading-relaxed">{line}</span>
                      <button
                        onClick={() => { navigator.clipboard.writeText(line); toast.success("Line copied!"); }}
                        className="mt-0.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                        title="Copy line"
                      >
                        <Copy className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                      </button>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </motion.div>
        )}
      </div>
    </ToolPageLayout>
  );
};

export default FacebookTranscriptExtractor;
