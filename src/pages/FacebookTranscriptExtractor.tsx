import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, Loader2, Copy, Download, AlertCircle, Search, X,
  Zap, Globe, Shield, Brain, Languages, Clock,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import ToolPageLayout from "@/components/ToolPageLayout";

type Stage = "idle" | "processing" | "done" | "error";

const stages = [
  { pct: 15, label: "Detecting platform..." },
  { pct: 40, label: "Fetching video..." },
  { pct: 75, label: "Transcribing with AI..." },
  { pct: 95, label: "Finalizing..." },
];

const FacebookTranscriptExtractor = () => {
  const [url, setUrl] = useState("");
  const [stage, setStage] = useState<Stage>("idle");
  const [progress, setProgress] = useState(0);
  const [stageLabel, setStageLabel] = useState("");
  const [error, setError] = useState("");
  const [transcript, setTranscript] = useState("");
  const [videoTitle, setVideoTitle] = useState("");
  const [searchQuery, setSearchQuery] = useState("");

  const isProcessing = stage === "processing";

  const animateProgress = () => {
    let i = 0;
    const interval = setInterval(() => {
      if (i < stages.length) {
        setProgress(stages[i].pct);
        setStageLabel(stages[i].label);
        i++;
      } else {
        clearInterval(interval);
      }
    }, 1500);
    return interval;
  };

  const handleSubmit = async () => {
    if (!url.trim()) { toast.error("Please paste a video URL"); return; }
    setError(""); setTranscript(""); setVideoTitle("");
    setStage("processing"); setProgress(5); setStageLabel("Starting...");

    const interval = animateProgress();

    try {
      const { data, error: fnError } = await supabase.functions.invoke("facebook-transcript", {
        body: { url: url.trim() },
      });
      clearInterval(interval);

      if (fnError) throw new Error(fnError.message);
      if (!data?.success) throw new Error(data?.error || "Transcription failed");

      setProgress(100);
      setStageLabel("Done!");
      setTranscript(data.transcript);
      setVideoTitle(data.title || "Video Transcript");
      setStage("done");
      toast.success("Transcript ready!");
    } catch (err) {
      clearInterval(interval);
      const msg = err instanceof Error ? err.message : "Something went wrong";
      setError(msg);
      setStage("error");
      toast.error(msg);
    }
  };

  const copyTranscript = () => {
    navigator.clipboard.writeText(transcript);
    toast.success("Copied to clipboard!");
  };

  const downloadTxt = () => {
    const blob = new Blob([transcript], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `MinusFlow.net_${videoTitle.replace(/[^\w\s]/g, "").slice(0, 40)}.txt`;
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
    { icon: Brain, title: "AI-Powered", desc: "Powered by Google Gemini for accurate, context-aware transcription." },
    { icon: Globe, title: "Multi-Platform", desc: "Works with Facebook, YouTube, TikTok, Instagram & more." },
    { icon: Zap, title: "Lightning Fast", desc: "Get your transcript in seconds, not minutes. No waiting." },
    { icon: Shield, title: "Privacy First", desc: "No login. No tracking. Your URLs are never stored." },
    { icon: Languages, title: "100+ Languages", desc: "Auto-detects and transcribes content in any language." },
    { icon: FileText, title: "Export Ready", desc: "Download as plain text, copy line-by-line, or grab the full transcript." },
  ];

  const steps = [
    { title: "Paste Video URL", desc: "Copy any video link from Facebook, YouTube, TikTok, or Instagram and paste it in the box." },
    { title: "Click Transcribe", desc: "Hit the button — our AI will fetch the video and generate a full transcript automatically." },
    { title: "Copy or Download", desc: "Search through the transcript, copy individual lines, or download the entire text as a .txt file." },
  ];

  const faqs = [
    { q: "Which platforms are supported?", a: "We support Facebook, YouTube, TikTok, Instagram, and most public video platforms. Just paste the link and we'll handle the rest." },
    { q: "Is this really free?", a: "Yes — 100% free, no signup required, no hidden fees. Use it as much as you want." },
    { q: "How accurate is the transcription?", a: "We use Google's Gemini AI for transcription, which delivers industry-leading accuracy across 100+ languages and dialects." },
    { q: "Are there video length limits?", a: "Yes — videos must be under 25MB in size to fit our AI processing limits. For most short videos and reels, this works perfectly." },
    { q: "Can I transcribe private videos?", a: "No, only publicly accessible videos can be transcribed. The video must be viewable without login." },
    { q: "Do you store my videos or transcripts?", a: "Never. We process everything in real-time and don't store any data on our servers. Your privacy is fully protected." },
    { q: "What languages are supported?", a: "Over 100 languages including English, Spanish, Hindi, Arabic, French, German, Mandarin, Urdu, and many more — auto-detected." },
    { q: "Can I download the transcript?", a: "Yes, you can download as a plain .txt file or copy the full text or individual lines to your clipboard with one click." },
  ];

  const seoBlocks = [
    {
      title: "Transcribe Facebook, YouTube, TikTok & Instagram Videos to Text Instantly",
      content: "MinusFlow's AI Video Transcript Extractor converts spoken content from any public video into clean, readable text. Whether you need to transcribe a Facebook Reel, a YouTube tutorial, a TikTok clip, or an Instagram video, our tool handles it in seconds — no downloads, no installs, no signup required.",
    },
    {
      title: "Why Use an AI Transcript Generator?",
      content: "Video transcripts make content searchable, accessible, and reusable. Use them for SEO content, blog posts, subtitles, study notes, research, accessibility compliance, or simply to read what you'd rather not watch. Our AI handles accents, multiple speakers, and background noise far better than basic auto-captions.",
    },
    {
      title: "Powered by Google Gemini AI",
      content: "Unlike basic speech-to-text tools, we use Google's Gemini multimodal AI which understands context, punctuation, and natural speech patterns. The result is a transcript that reads like it was written by a human, not garbled by an algorithm.",
    },
    {
      title: "Perfect for Creators, Students & Marketers",
      content: "Content creators repurpose video into blog posts. Students convert lectures into notes. Marketers extract quotes for social media. Researchers analyze interviews. Whatever your use case, transcripts unlock the value hidden inside video content.",
    },
    {
      title: "100% Free, No Signup, No Limits",
      content: "Most transcription tools charge per minute or lock features behind paywalls. MinusFlow is completely free with no account required. Just paste, transcribe, and download — as many videos as you need.",
    },
  ];

  return (
    <ToolPageLayout
      icon={FileText}
      title="AI Video Transcript"
      highlight="Extractor"
      subtitle="Transcribe any Facebook, YouTube, TikTok, or Instagram video to text in seconds — powered by Google Gemini AI."
      badge="✨ Free AI Transcription"
      gradientFrom="from-[#1877F2]"
      gradientTo="to-[#42b72a]"
      iconBgClass="bg-[#1877F2]/10"
      features={features}
      steps={steps}
      faqs={faqs}
      seoBlocks={seoBlocks}
    >
      {/* Input */}
      <div className="space-y-4">
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
            disabled={isProcessing}
            size="lg"
            className="gap-2 bg-gradient-to-r from-[#1877F2] to-[#42b72a] hover:opacity-90 text-white h-12 px-8 font-semibold"
          >
            {isProcessing ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
            Transcribe
          </Button>
        </div>

        <div className="flex flex-wrap justify-center gap-2 pt-2">
          {["Facebook", "YouTube", "TikTok", "Instagram", "Reels", "Shorts"].map((p) => (
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
                  {stageLabel}
                </span>
                <span className="text-muted-foreground">{progress}%</span>
              </div>
              <Progress value={progress} className="h-2" />
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
                <span className="font-medium text-foreground text-sm truncate max-w-xs">{videoTitle}</span>
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
