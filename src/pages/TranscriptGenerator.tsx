import { useState, useEffect, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, Copy, Clock, ExternalLink, RotateCcw, Loader2,
  CheckCircle2, Download, Search, AlignLeft, Type, X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ParticleBackground from "@/components/ParticleBackground";
import { supabase } from "@/integrations/supabase/client";
import {
  TranscriptResult, formatTime, exportTxt, exportSrt,
  exportJson, downloadFile, saveToHistory, getWordCount, formatDuration,
} from "@/lib/transcript-utils";

const TranscriptGenerator = () => {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<TranscriptResult | null>(null);
  const [error, setError] = useState("");
  const [showTimestamps, setShowTimestamps] = useState(true);
  const [paragraphMode, setParagraphMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedLine, setCopiedLine] = useState<number | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const v = searchParams.get("v");
    if (v) { setUrl(v); fetchTranscript(v); }
  }, []);

  const fetchTranscript = async (videoUrl?: string) => {
    const trimmed = (videoUrl || url).trim();
    if (!trimmed) { toast.error("Please enter a YouTube URL"); return; }

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
      saveToHistory(data);
    } catch (err: any) {
      setError(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text");
    if (pasted && (pasted.includes("youtube.com") || pasted.includes("youtu.be"))) {
      setTimeout(() => fetchTranscript(pasted), 100);
    }
  };

  const copyLine = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedLine(index);
    toast.success("Line copied!");
    setTimeout(() => setCopiedLine(null), 1500);
  };

  const copyAll = () => {
    if (!result) return;
    const text = result.transcript
      .map((l) => (showTimestamps ? `[${formatTime(l.start)}] ${l.text}` : l.text))
      .join("\n");
    navigator.clipboard.writeText(text);
    toast.success("Full transcript copied!");
  };

  const filteredLines = result?.transcript.filter((l) =>
    l.text.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const paragraphText = result
    ? result.transcript.map((l) => l.text).join(" ")
    : "";

  const wordCount = result ? getWordCount(result.transcript) : 0;

  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-hidden">
      <ParticleBackground />
      <div className="relative z-10">
        <Header />

        <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
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
              Paste any YouTube video URL and get the full transcript with timestamps, search, and export — free, no API key required.
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
                ref={inputRef}
                placeholder="Paste YouTube URL or video ID..."
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && fetchTranscript()}
                onPaste={handlePaste}
                className="flex-1 border-border/60 bg-secondary/50"
              />
              <Button
                onClick={() => fetchTranscript()}
                disabled={loading}
                className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                {loading ? "Fetching..." : "Get Transcript"}
              </Button>
            </div>
          </motion.div>

          {/* Loading skeleton */}
          {loading && (
            <div className="space-y-4">
              <Skeleton className="h-24 w-full rounded-2xl" />
              <Skeleton className="h-12 w-full rounded-2xl" />
              <Skeleton className="h-96 w-full rounded-2xl" />
            </div>
          )}

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
                <Button size="sm" variant="outline" onClick={() => fetchTranscript()} className="gap-2">
                  <RotateCcw className="h-3.5 w-3.5" /> Try Again
                </Button>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Result */}
          <AnimatePresence>
            {result && !loading && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="flex flex-col gap-5 lg:flex-row"
              >
                {/* Sidebar */}
                <div className="w-full shrink-0 space-y-4 lg:w-72">
                  {/* Video info card */}
                  <div className="rounded-2xl border border-border/60 bg-card/80 p-4 backdrop-blur-md">
                    <a
                      href={`https://www.youtube.com/watch?v=${result.video_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block overflow-hidden rounded-lg"
                    >
                      <img
                        src={result.thumbnail}
                        alt={result.title}
                        className="w-full rounded-lg object-cover transition-transform hover:scale-105"
                      />
                    </a>
                    <h2 className="mt-3 text-sm font-semibold leading-tight line-clamp-2">{result.title}</h2>
                    <p className="mt-1 text-xs text-muted-foreground">{result.author}</p>

                    <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                      <div className="flex justify-between">
                        <span>Words</span>
                        <span className="font-medium text-foreground">{wordCount.toLocaleString()}</span>
                      </div>
                      {result.duration > 0 && (
                        <div className="flex justify-between">
                          <span>Duration</span>
                          <span className="font-medium text-foreground">{formatDuration(result.duration)}</span>
                        </div>
                      )}
                      <div className="flex justify-between">
                        <span>Language</span>
                        <span className="font-medium text-foreground">
                          {result.available_languages.find((l) => l.code === result.language)?.name || result.language}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Lines</span>
                        <span className="font-medium text-foreground">{result.transcript.length}</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="rounded-2xl border border-border/60 bg-card/80 p-3 backdrop-blur-md space-y-2">
                    <Button size="sm" variant="outline" onClick={copyAll} className="w-full gap-2 justify-start">
                      <Copy className="h-3.5 w-3.5" /> Copy All
                    </Button>
                    <Button
                      size="sm" variant="outline" className="w-full gap-2 justify-start"
                      onClick={() => {
                        downloadFile(exportTxt(result.transcript), `MinusFlow.net_${result.title || result.video_id}.txt`, "text/plain");
                        toast.success("Downloaded .txt");
                      }}
                    >
                      <Download className="h-3.5 w-3.5" /> Download .txt
                    </Button>
                    <Button
                      size="sm" variant="outline" className="w-full gap-2 justify-start"
                      onClick={() => {
                        downloadFile(exportSrt(result.transcript), `MinusFlow.net_${result.title || result.video_id}.srt`, "text/plain");
                        toast.success("Downloaded .srt");
                      }}
                    >
                      <Download className="h-3.5 w-3.5" /> Download .srt
                    </Button>
                    <Button
                      size="sm" variant="outline" className="w-full gap-2 justify-start"
                      onClick={() => {
                        downloadFile(exportJson(result.transcript), `MinusFlow.net_${result.title || result.video_id}.json`, "application/json");
                        toast.success("Downloaded .json");
                      }}
                    >
                      <Download className="h-3.5 w-3.5" /> Download .json
                    </Button>
                    <Button
                      size="sm" variant="outline" className="w-full gap-2 justify-start"
                      onClick={() => { setResult(null); setUrl(""); inputRef.current?.focus(); }}
                    >
                      <RotateCcw className="h-3.5 w-3.5" /> New Transcript
                    </Button>
                  </div>
                </div>

                {/* Main transcript area */}
                <div className="flex-1 space-y-4">
                  {/* Controls */}
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
                        <button
                          onClick={() => setSearchQuery("")}
                          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Clock className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Timestamps</span>
                      <Switch checked={showTimestamps} onCheckedChange={setShowTimestamps} />
                    </div>
                    <div className="flex items-center gap-2">
                      <AlignLeft className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="text-xs text-muted-foreground">Paragraph</span>
                      <Switch checked={paragraphMode} onCheckedChange={setParagraphMode} />
                    </div>
                  </div>

                  {searchQuery && (
                    <p className="text-xs text-muted-foreground px-1">
                      {filteredLines.length} result{filteredLines.length !== 1 ? "s" : ""} found
                    </p>
                  )}

                  {/* Transcript lines */}
                  <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-md">
                    <ScrollArea className="h-[520px] p-4">
                      {paragraphMode ? (
                        <p className="text-sm leading-relaxed text-foreground/90 whitespace-pre-wrap">
                          {paragraphText}
                        </p>
                      ) : (
                        <div className="space-y-0.5">
                          {filteredLines.map((line, i) => {
                            const origIndex = result.transcript.indexOf(line);
                            return (
                              <div
                                key={origIndex}
                                className="group flex items-start gap-2 rounded-lg px-3 py-1.5 text-sm transition-colors hover:bg-secondary/60"
                              >
                                {showTimestamps && (
                                  <a
                                    href={`https://www.youtube.com/watch?v=${result.video_id}&t=${Math.floor(line.start)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="shrink-0 pt-0.5 font-mono text-xs text-primary/70 hover:text-primary"
                                  >
                                    [{formatTime(line.start)}]
                                  </a>
                                )}
                                <span className="flex-1 text-foreground/90">{line.text}</span>
                                <button
                                  onClick={() => copyLine(line.text, origIndex)}
                                  className="mt-0.5 shrink-0 opacity-0 transition-opacity group-hover:opacity-100"
                                >
                                  {copiedLine === origIndex ? (
                                    <CheckCircle2 className="h-3.5 w-3.5 text-green-400" />
                                  ) : (
                                    <Copy className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground" />
                                  )}
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </ScrollArea>
                  </div>
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
