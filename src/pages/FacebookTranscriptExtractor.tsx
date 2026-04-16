import { useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, Loader2, Copy, Download, CheckCircle2,
  Clock, Film, AlertCircle, Search, X,
} from "lucide-react";
import HCaptcha from "@hcaptcha/react-hcaptcha";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ParticleBackground from "@/components/ParticleBackground";

const FUNCTION_BASE = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/facebook-transcript`;
const HCAPTCHA_SITEKEY = "ec0a1d1c-0142-40fc-b62a-9b94774065fc";

type Stage = "idle" | "captcha" | "creating" | "transcribing" | "polling" | "fetching" | "done" | "error";

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
  captcha: "Verifying...",
  creating: "Fetching video info...",
  transcribing: "Starting transcription...",
  polling: "Processing audio...",
  fetching: "Downloading transcript...",
  done: "Done!",
  error: "Error",
};

const stageProgress: Record<Stage, number> = {
  idle: 0, captcha: 5, creating: 15, transcribing: 30, polling: 55, fetching: 85, done: 100, error: 0,
};

const platforms = ["YouTube", "Facebook", "TikTok", "Instagram", "SoundCloud", "Twitter/X"];

const FacebookTranscriptExtractor = () => {
  const [url, setUrl] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [error, setError] = useState("");
  const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
  const [transcript, setTranscript] = useState("");
  const [showTimestamps, setShowTimestamps] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const captchaRef = useRef<HCaptcha>(null);

  const callFunction = async (body: Record<string, unknown>) => {
    const res = await fetch(FUNCTION_BASE, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok || data.error) throw new Error(data.error || "Request failed");
    return data;
  };

  const handleSubmit = async () => {
    if (!url.trim()) { toast.error("Please paste a video URL"); return; }
    if (!captchaToken) { toast.error("Please complete the captcha first"); return; }
    setError(""); setTranscript(""); setVideoInfo(null);
    await startTranscription(captchaToken);
  };

  const startTranscription = useCallback(async (token: string) => {
    try {
      // Step 1: Create
      setStage("creating");
      const createData = await callFunction({ action: "create", url: url.trim(), hcaptchaToken: token });
      const fileId = createData.file_id;
      const info: VideoInfo = { file_id: fileId, title: createData.title || "Video", duration: createData.duration || 0 };
      setVideoInfo(info);

      // Step 2: Transcribe
      setStage("transcribing");
      await callFunction({ action: "transcribe", fileId });

      // Step 3: Poll status
      setStage("polling");
      let attempts = 0;
      const maxAttempts = 120;
      while (attempts < maxAttempts) {
        await new Promise((r) => setTimeout(r, 5000));
        const statusData = await callFunction({ action: "status", fileId });
        if (statusData.status === "ok" && statusData.url) {
          setStage("fetching");
          const textData = await callFunction({ action: "fetch-text", url: statusData.url });
          setTranscript(textData.text || "");
          setStage("done");
          toast.success("Transcript ready!");
          // Reset captcha for next use
          captchaRef.current?.resetCaptcha();
          setCaptchaToken(null);
          return;
        }
        if (statusData.status === "error") {
          throw new Error(statusData.error || "Transcription failed");
        }
        attempts++;
      }
      throw new Error("Transcription timed out. Please try again.");
    } catch (err: any) {
      setError(err.message || "Something went wrong");
      setStage("error");
      captchaRef.current?.resetCaptcha();
      setCaptchaToken(null);
    }
  }, [url]);

  const copyTranscript = () => {
    navigator.clipboard.writeText(transcript);
    toast.success("Transcript copied!");
  };

  const downloadTxt = () => {
    const blob = new Blob([transcript], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `MinusFlow.net_${videoInfo?.title || "transcript"}.txt`;
    a.click();
    URL.revokeObjectURL(a.href);
    toast.success("Downloaded!");
  };

  const lines = transcript.split("\n").filter(Boolean);
  const filteredLines = searchQuery
    ? lines.filter((l) => l.toLowerCase().includes(searchQuery.toLowerCase()))
    : lines;
  const wordCount = transcript.split(/\s+/).filter(Boolean).length;
  const isProcessing = ["captcha", "creating", "transcribing", "polling", "fetching"].includes(stage);

  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-hidden">
      <ParticleBackground />
      <div className="relative z-10">
        <Header />
        <main className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
          {/* Hero */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="text-center">
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#1877F2]/30 bg-[#1877F2]/10 px-4 py-1.5 text-sm font-medium text-[#1877F2]">
              <FileText className="h-4 w-4" />
              AI Video Transcription
            </div>
            <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
              Transcribe Any Video to{" "}
              <span className="bg-gradient-to-r from-[#1877F2] to-[#42b72a] bg-clip-text text-transparent">Text</span>
            </h1>
            <p className="mx-auto mb-6 max-w-lg text-muted-foreground">
              YouTube, TikTok, Instagram, Facebook, SoundCloud & more — powered by AI.
            </p>

            {/* Platform badges */}
            <div className="mb-10 flex flex-wrap justify-center gap-2">
              {platforms.map((p) => (
                <span key={p} className="rounded-full border border-border/60 bg-card/60 px-3 py-1 text-xs text-muted-foreground backdrop-blur-sm">{p}</span>
              ))}
            </div>
          </motion.div>

          {/* Input */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="mb-8 rounded-2xl border border-border/60 bg-card/80 p-6 backdrop-blur-md">
            <div className="flex gap-3">
              <Input
                placeholder="Paste any video URL (YouTube, Facebook, TikTok, Instagram...)"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && !isProcessing && handleSubmit()}
                disabled={isProcessing}
                className="flex-1 border-border/60 bg-secondary/50 h-12 text-base"
              />
              <Button
                onClick={handleSubmit}
                disabled={isProcessing}
                size="lg"
                className="gap-2 bg-[#1877F2] hover:bg-[#1565c0] text-white h-12 px-6"
              >
                {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                Transcribe
              </Button>
            </div>

            {/* hCaptcha - visible compact */}
            <div className="mt-4 flex items-center gap-3">
              <HCaptcha
                ref={captchaRef}
                sitekey={HCAPTCHA_SITEKEY}
                size="compact"
                theme="dark"
                onVerify={(token) => setCaptchaToken(token)}
                onError={() => { setCaptchaToken(null); toast.error("Captcha failed"); }}
                onExpire={() => { setCaptchaToken(null); }}
              />
              {captchaToken && (
                <span className="text-xs text-green-500 flex items-center gap-1">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Verified
                </span>
              )}
            </div>
          </motion.div>

          {/* Progress */}
          <AnimatePresence>
            {isProcessing && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mb-8 rounded-2xl border border-border/60 bg-card/80 p-6 backdrop-blur-md space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium text-foreground">{stageLabels[stage]}</span>
                  <span className="text-muted-foreground">{stageProgress[stage]}%</span>
                </div>
                <Progress value={stageProgress[stage]} className="h-2" />

                {/* Video info card */}
                {videoInfo && (
                  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-4 rounded-xl border border-border/40 bg-muted/30 p-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-[#1877F2]/10">
                      <Film className="h-6 w-6 text-[#1877F2]" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{videoInfo.title}</p>
                      {videoInfo.duration > 0 && (
                        <p className="text-xs text-muted-foreground flex items-center gap-1 mt-0.5">
                          <Clock className="h-3 w-3" /> {formatDuration(videoInfo.duration)}
                        </p>
                      )}
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Error */}
          {stage === "error" && error && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-8 flex items-center gap-3 rounded-xl border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <span className="flex-1">{error}</span>
              <Button size="sm" variant="outline" onClick={() => { setStage("idle"); setError(""); }} className="shrink-0">Try Again</Button>
            </motion.div>
          )}

          {/* Result */}
          {stage === "done" && transcript && (
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-4">
              {/* Stats + Actions */}
              <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/60 bg-card/80 p-4 backdrop-blur-md">
                <div className="flex-1 flex items-center gap-4 text-xs text-muted-foreground">
                  {videoInfo && <span className="font-medium text-foreground text-sm truncate max-w-xs">{videoInfo.title}</span>}
                  <span>{wordCount.toLocaleString()} words</span>
                  <span>{lines.length} lines</span>
                </div>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={copyTranscript} className="gap-1.5">
                    <Copy className="h-3.5 w-3.5" /> Copy
                  </Button>
                  <Button size="sm" variant="outline" onClick={downloadTxt} className="gap-1.5">
                    <Download className="h-3.5 w-3.5" /> Download .txt
                  </Button>
                </div>
              </div>

              {/* Search + Timestamps */}
              <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/60 bg-card/80 p-3 backdrop-blur-md">
                <div className="relative flex-1 min-w-[180px]">
                  <Search className="absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search transcript..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9 h-8 text-sm border-border/60 bg-secondary/50"
                  />
                  {searchQuery && (
                    <button onClick={() => setSearchQuery("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {searchQuery && (
                <p className="text-xs text-muted-foreground px-1">{filteredLines.length} result{filteredLines.length !== 1 ? "s" : ""}</p>
              )}

              {/* Transcript */}
              <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-md">
                <ScrollArea className="h-[520px] p-4">
                  <div className="space-y-0.5">
                    {filteredLines.map((line, i) => (
                      <div key={i} className="group flex items-start gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors hover:bg-secondary/60">
                        <span className="flex-1 text-foreground/90 whitespace-pre-wrap">{line}</span>
                        <button
                          onClick={() => { navigator.clipboard.writeText(line); toast.success("Line copied!"); }}
                          className="mt-0.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
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
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default FacebookTranscriptExtractor;
