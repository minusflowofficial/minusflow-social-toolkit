import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FileText, Copy, Clock, ExternalLink, RotateCcw, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ParticleBackground from "@/components/ParticleBackground";
import { supabase } from "@/integrations/supabase/client";

interface TranscriptLine {
  text: string;
  start: number;
  duration: number;
}

interface TranscriptResult {
  video_id: string;
  title: string;
  author: string;
  thumbnail: string;
  language: string;
  available_languages: { code: string; name: string }[];
  transcript: TranscriptLine[];
}

const formatTime = (seconds: number): string => {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
};

const TranscriptGenerator = () => {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TranscriptResult | null>(null);
  const [error, setError] = useState("");
  const [showTimestamps, setShowTimestamps] = useState(true);
  const [copiedType, setCopiedType] = useState<string | null>(null);

  const fetchTranscript = async () => {
    const trimmed = url.trim();
    if (!trimmed) {
      toast.error("Please enter a YouTube URL");
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("get-transcript", {
        body: { video_url: trimmed },
      });

      if (fnError) throw new Error(fnError.message);
      if (data?.error) throw new Error(data.error);

      setResult(data);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const copyText = (withTimestamps: boolean) => {
    if (!result) return;
    const text = result.transcript
      .map((l) => (withTimestamps ? `[${formatTime(l.start)}] ${l.text}` : l.text))
      .join("\n");
    navigator.clipboard.writeText(text);
    const type = withTimestamps ? "timestamps" : "text";
    setCopiedType(type);
    toast.success(withTimestamps ? "Copied with timestamps!" : "Copied plain text!");
    setTimeout(() => setCopiedType(null), 2000);
  };

  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-hidden">
      <ParticleBackground />
      <div className="relative z-10">
        <Header />

        <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
          {/* Hero */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-10 text-center"
          >
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
              <FileText className="h-4 w-4" />
              YouTube Transcript Generator
            </div>
            <h1 className="mb-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Extract YouTube <span className="text-primary">Transcripts</span> Instantly
            </h1>
            <p className="mx-auto max-w-xl text-muted-foreground">
              Paste any YouTube video URL and get the full transcript — free, no API key required.
            </p>
          </motion.div>

          {/* Input */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="mb-8 rounded-2xl border border-border/60 bg-card/80 p-5 backdrop-blur-md"
          >
            <div className="flex gap-3">
              <Input
                placeholder="Paste YouTube URL or video ID..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchTranscript()}
                className="flex-1 border-border/60 bg-secondary/50"
              />
              <Button
                onClick={fetchTranscript}
                disabled={loading}
                className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                {loading ? "Fetching..." : "Get Transcript"}
              </Button>
            </div>
          </motion.div>

          {/* Error */}
          <AnimatePresence>
            {error && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="mb-8 rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-center"
              >
                <p className="mb-2 text-sm text-destructive">{error}</p>
                <Button size="sm" variant="outline" onClick={fetchTranscript} className="gap-2">
                  <RotateCcw className="h-3.5 w-3.5" /> Try Again
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Result */}
          <AnimatePresence>
            {result && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="space-y-5"
              >
                {/* Video info */}
                <div className="flex gap-4 rounded-2xl border border-border/60 bg-card/80 p-4 backdrop-blur-md">
                  <img
                    src={result.thumbnail}
                    alt={result.title}
                    className="h-20 w-36 shrink-0 rounded-lg object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <h2 className="truncate text-lg font-semibold">{result.title}</h2>
                    <p className="text-sm text-muted-foreground">{result.author}</p>
                    <span className="mt-1.5 inline-block rounded-full bg-primary/15 px-2.5 py-0.5 text-xs font-medium text-primary">
                      {result.available_languages.find((l) => l.code === result.language)?.name || result.language}
                    </span>
                  </div>
                </div>

                {/* Controls */}
                <div className="flex flex-wrap items-center gap-3 rounded-2xl border border-border/60 bg-card/80 p-4 backdrop-blur-md">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyText(false)}
                    className="gap-2"
                  >
                    {copiedType === "text" ? <CheckCircle2 className="h-3.5 w-3.5 text-green-400" /> : <Copy className="h-3.5 w-3.5" />}
                    Copy All Text
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => copyText(true)}
                    className="gap-2"
                  >
                    {copiedType === "timestamps" ? <CheckCircle2 className="h-3.5 w-3.5 text-green-400" /> : <Clock className="h-3.5 w-3.5" />}
                    Copy with Timestamps
                  </Button>
                  <div className="ml-auto flex items-center gap-2">
                    <span className="text-xs text-muted-foreground">Show Timestamps</span>
                    <Switch checked={showTimestamps} onCheckedChange={setShowTimestamps} />
                  </div>
                </div>

                {/* Transcript lines */}
                <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-md">
                  <ScrollArea className="h-[420px] p-4">
                    <div className="space-y-1">
                      {result.transcript.map((line, i) => (
                        <a
                          key={i}
                          href={`https://www.youtube.com/watch?v=${result.video_id}&t=${Math.floor(line.start)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="group flex items-start gap-3 rounded-lg px-3 py-2 text-sm transition-colors hover:bg-secondary/60"
                        >
                          {showTimestamps && (
                            <span className="shrink-0 pt-0.5 font-mono text-xs text-primary/70">
                              [{formatTime(line.start)}]
                            </span>
                          )}
                          <span className="flex-1 text-foreground/90">{line.text}</span>
                          <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground/0 transition-colors group-hover:text-muted-foreground" />
                        </a>
                      ))}
                    </div>
                  </ScrollArea>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        <Footer />
      </div>
    </div>
  );
};

export default TranscriptGenerator;
