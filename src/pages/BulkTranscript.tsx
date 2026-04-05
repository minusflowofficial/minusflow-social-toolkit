import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText, Loader2, Download, CheckCircle2, XCircle,
  ChevronDown, ChevronUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ParticleBackground from "@/components/ParticleBackground";
import { supabase } from "@/integrations/supabase/client";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import {
  TranscriptResult, exportTxt, exportSrt, downloadFile, saveToHistory, formatTime,
} from "@/lib/transcript-utils";

interface BulkResult {
  url: string;
  success: boolean;
  data?: TranscriptResult;
  error?: string;
}

const BulkTranscript = () => {
  const [urls, setUrls] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<BulkResult[]>([]);
  const [progress, setProgress] = useState(0);
  const [total, setTotal] = useState(0);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const processAll = async () => {
    const lines = urls
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length === 0) {
      toast.error("Please enter at least one URL");
      return;
    }
    if (lines.length > 50) {
      toast.error("Maximum 50 URLs allowed");
      return;
    }

    setLoading(true);
    setResults([]);
    setProgress(0);
    setTotal(lines.length);

    const allResults: BulkResult[] = [];

    for (let i = 0; i < lines.length; i++) {
      try {
        const { data, error } = await supabase.functions.invoke("get-transcript", {
          body: { video_url: lines[i] },
        });
        if (error || data?.error) {
          allResults.push({ url: lines[i], success: false, error: data?.error || error?.message });
        } else {
          allResults.push({ url: lines[i], success: true, data });
          saveToHistory(data);
        }
      } catch (err: any) {
        allResults.push({ url: lines[i], success: false, error: err.message });
      }

      setProgress(i + 1);
      setResults([...allResults]);

      if (i < lines.length - 1) {
        await new Promise((r) => setTimeout(r, 1000));
      }
    }

    setLoading(false);
    const successCount = allResults.filter((r) => r.success).length;
    toast.success(`Done! ${successCount}/${lines.length} transcripts extracted`);
  };

  const downloadAllAsZip = async () => {
    const successResults = results.filter((r) => r.success && r.data);
    if (successResults.length === 0) return;

    const zip = new JSZip();
    successResults.forEach((r) => {
      const name = r.data!.title || r.data!.video_id;
      const safeName = name.replace(/[^a-zA-Z0-9_\-\s]/g, "").slice(0, 80);
      zip.file(`MinusFlow.net_${safeName}.txt`, exportTxt(r.data!.transcript));
      zip.file(`MinusFlow.net_${safeName}.srt`, exportSrt(r.data!.transcript));
    });

    const blob = await zip.generateAsync({ type: "blob" });
    saveAs(blob, "MinusFlow.net_Transcripts.zip");
    toast.success("ZIP downloaded!");
  };

  const successCount = results.filter((r) => r.success).length;

  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-hidden">
      <ParticleBackground />
      <div className="relative z-10">
        <Header />
        <main className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-10 text-center"
          >
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
              <FileText className="h-4 w-4" />
              Bulk Transcript Extractor
            </div>
            <h1 className="mb-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Extract <span className="text-primary">Multiple Transcripts</span> at Once
            </h1>
            <p className="mx-auto max-w-xl text-muted-foreground">
              Paste up to 50 YouTube URLs (one per line) and extract all transcripts in bulk.
            </p>
          </motion.div>

          {/* Input */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="mb-6 rounded-2xl border border-border/60 bg-card/80 p-5 backdrop-blur-md"
          >
            <Textarea
              placeholder="Paste YouTube URLs here, one per line (max 50)..."
              value={urls}
              onChange={(e) => setUrls(e.target.value)}
              rows={6}
              className="border-border/60 bg-secondary/50 mb-3"
            />
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {urls.split("\n").filter((l) => l.trim()).length} URL(s)
              </span>
              <Button onClick={processAll} disabled={loading} className="gap-2">
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                {loading ? "Processing..." : "Extract All"}
              </Button>
            </div>
          </motion.div>

          {/* Progress */}
          {(loading || results.length > 0) && total > 0 && (
            <div className="mb-6 rounded-2xl border border-border/60 bg-card/80 p-4 backdrop-blur-md">
              <div className="flex items-center justify-between mb-2 text-sm">
                <span className="text-muted-foreground">
                  {loading ? "Processing..." : "Complete"}
                </span>
                <span className="font-medium">{progress}/{total}</span>
              </div>
              <Progress value={(progress / total) * 100} className="h-2" />
              {!loading && results.length > 0 && (
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {successCount} succeeded, {results.length - successCount} failed
                  </span>
                  {successCount > 0 && (
                    <Button size="sm" variant="outline" onClick={downloadAllAsZip} className="gap-2">
                      <Download className="h-3.5 w-3.5" /> Download All as ZIP
                    </Button>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Results */}
          <AnimatePresence>
            {results.length > 0 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-2">
                {results.map((r, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="rounded-xl border border-border/60 bg-card/80 backdrop-blur-md overflow-hidden"
                  >
                    <button
                      onClick={() => setExpandedIndex(expandedIndex === i ? null : i)}
                      className="flex w-full items-center gap-3 p-3 text-left"
                    >
                      {r.success ? (
                        <CheckCircle2 className="h-4 w-4 shrink-0 text-green-400" />
                      ) : (
                        <XCircle className="h-4 w-4 shrink-0 text-destructive" />
                      )}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">
                          {r.success ? r.data?.title : r.url}
                        </p>
                        {!r.success && (
                          <p className="text-xs text-destructive truncate">{r.error}</p>
                        )}
                        {r.success && (
                          <p className="text-xs text-muted-foreground">
                            {r.data?.transcript.length} lines • {r.data?.author}
                          </p>
                        )}
                      </div>
                      {r.success && (
                        expandedIndex === i
                          ? <ChevronUp className="h-4 w-4 text-muted-foreground" />
                          : <ChevronDown className="h-4 w-4 text-muted-foreground" />
                      )}
                    </button>

                    {expandedIndex === i && r.success && r.data && (
                      <div className="border-t border-border/40 p-3">
                        <div className="flex flex-wrap gap-2 mb-3">
                          <Button
                            size="sm" variant="outline" className="gap-1.5 text-xs"
                            onClick={() => {
                              downloadFile(
                                exportTxt(r.data!.transcript),
                                `MinusFlow.net_${r.data!.title || r.data!.video_id}.txt`,
                                "text/plain"
                              );
                            }}
                          >
                            <Download className="h-3 w-3" /> .txt
                          </Button>
                          <Button
                            size="sm" variant="outline" className="gap-1.5 text-xs"
                            onClick={() => {
                              downloadFile(
                                exportSrt(r.data!.transcript),
                                `MinusFlow.net_${r.data!.title || r.data!.video_id}.srt`,
                                "text/plain"
                              );
                            }}
                          >
                            <Download className="h-3 w-3" /> .srt
                          </Button>
                        </div>
                        <ScrollArea className="h-40">
                          <div className="space-y-0.5 text-xs">
                            {r.data.transcript.slice(0, 50).map((line, j) => (
                              <div key={j} className="flex gap-2 px-2 py-1 rounded hover:bg-secondary/40">
                                <span className="shrink-0 font-mono text-primary/60">
                                  [{formatTime(line.start)}]
                                </span>
                                <span className="text-foreground/80">{line.text}</span>
                              </div>
                            ))}
                            {r.data.transcript.length > 50 && (
                              <p className="text-muted-foreground px-2 py-1">
                                ... and {r.data.transcript.length - 50} more lines
                              </p>
                            )}
                          </div>
                        </ScrollArea>
                      </div>
                    )}
                  </motion.div>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default BulkTranscript;
