import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, Copy, Download, Search, Clock, ExternalLink,
  RotateCcw, Loader2, CheckCircle2, X, ArrowLeft,
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
  downloadFile, saveToHistory, getWordCount, formatDuration,
} from "@/lib/transcript-utils";

const TranscriptView = () => {
  const { videoId } = useParams<{ videoId: string }>();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState<TranscriptResult | null>(null);
  const [error, setError] = useState("");
  const [showTimestamps, setShowTimestamps] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [copiedLine, setCopiedLine] = useState<number | null>(null);

  useEffect(() => {
    if (videoId) fetchTranscript(videoId);
  }, [videoId]);

  const fetchTranscript = async (id: string) => {
    setLoading(true);
    setError("");
    setResult(null);

    try {
      const { data, error: fnError } = await supabase.functions.invoke("get-transcript", {
        body: { videoId: id },
      });
      if (fnError) throw new Error(fnError.message);
      if (!data?.success) throw new Error(data?.error || "Could not fetch transcript");
      setResult(data);
      saveToHistory(data);
    } catch (err: any) {
      setError(err.message || "Could not fetch transcript. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const copyAll = () => {
    if (!result) return;
    const text = result.transcript
      .map((l) => (showTimestamps ? `[${formatTime(l.start)}] ${l.text}` : l.text))
      .join("\n");
    navigator.clipboard.writeText(text);
    toast.success("Full transcript copied!");
  };

  const copyLine = (text: string, index: number) => {
    navigator.clipboard.writeText(text);
    setCopiedLine(index);
    toast.success("Line copied!");
    setTimeout(() => setCopiedLine(null), 1500);
  };

  const filteredLines = result?.transcript.filter((l) =>
    l.text.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const wordCount = result ? getWordCount(result.transcript) : 0;

  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-hidden">
      <ParticleBackground />
      <div className="relative z-10">
        <Header />
        <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
          {/* Back button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate("/transcript")}
            className="mb-4 gap-2 text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" /> New Transcript
          </Button>

          {/* Loading */}
          {loading && (
            <div className="flex flex-col gap-5 lg:flex-row">
              <div className="w-full shrink-0 space-y-4 lg:w-72">
                <Skeleton className="h-40 w-full rounded-2xl" />
                <Skeleton className="h-48 w-full rounded-2xl" />
              </div>
              <div className="flex-1 space-y-4">
                <Skeleton className="h-12 w-full rounded-2xl" />
                <Skeleton className="h-96 w-full rounded-2xl" />
              </div>
            </div>
          )}

          {/* Error */}
          <AnimatePresence>
            {error && !loading && (
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                className="rounded-xl border border-destructive/40 bg-destructive/10 p-6 text-center"
              >
                <p className="mb-3 text-sm text-destructive">{error}</p>
                <div className="flex justify-center gap-3">
                  <Button size="sm" variant="outline" onClick={() => videoId && fetchTranscript(videoId)} className="gap-2">
                    <RotateCcw className="h-3.5 w-3.5" /> Try Again
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => navigate("/transcript")} className="gap-2">
                    <ArrowLeft className="h-3.5 w-3.5" /> Go Back
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Result */}
          {result && !loading && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="flex flex-col gap-5 lg:flex-row"
            >
              {/* LEFT PANEL - Sidebar */}
              <div className="w-full shrink-0 space-y-4 lg:w-72">
                {/* Video info */}
                <div className="rounded-2xl border border-border/60 bg-card/80 p-4 backdrop-blur-md">
                  <a
                    href={`https://www.youtube.com/watch?v=${result.videoId}`}
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
                  <h2 className="mt-3 text-sm font-semibold leading-tight line-clamp-3">{result.title}</h2>
                  {result.author && <p className="mt-1 text-xs text-muted-foreground">{result.author}</p>}

                  <div className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Language</span>
                      <span className="font-medium text-foreground">{result.language}</span>
                    </div>
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
                      downloadFile(exportTxt(result.transcript), `MinusFlow.net_${result.title || result.videoId}.txt`, "text/plain");
                      toast.success("Downloaded .txt");
                    }}
                  >
                    <Download className="h-3.5 w-3.5" /> Download .txt
                  </Button>
                  <Button
                    size="sm" variant="outline" className="w-full gap-2 justify-start"
                    onClick={() => {
                      downloadFile(exportSrt(result.transcript), `MinusFlow.net_${result.title || result.videoId}.srt`, "text/plain");
                      toast.success("Downloaded .srt");
                    }}
                  >
                    <Download className="h-3.5 w-3.5" /> Download .srt
                  </Button>
                </div>
              </div>

              {/* RIGHT PANEL - Transcript */}
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
                </div>

                {searchQuery && (
                  <p className="text-xs text-muted-foreground px-1">
                    {filteredLines.length} result{filteredLines.length !== 1 ? "s" : ""}
                  </p>
                )}

                {/* Transcript lines */}
                <div className="rounded-2xl border border-border/60 bg-card/80 backdrop-blur-md">
                  <ScrollArea className="h-[520px] p-4">
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
                                href={`https://www.youtube.com/watch?v=${result.videoId}&t=${Math.floor(line.start)}`}
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
                      {result.transcript.length === 0 && (
                        <p className="py-8 text-center text-sm text-muted-foreground">
                          No transcript lines found. The caption data may be empty.
                        </p>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </div>
            </motion.div>
          )}
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default TranscriptView;
