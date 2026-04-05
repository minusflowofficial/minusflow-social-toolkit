import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FileText, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ParticleBackground from "@/components/ParticleBackground";
import { extractVideoId } from "@/lib/transcript-utils";

const TranscriptHome = () => {
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [previewId, setPreviewId] = useState<string | null>(null);
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);

  const handleUrlChange = (value: string) => {
    setUrl(value);
    setError("");
    const id = extractVideoId(value.trim());
    setPreviewId(id);
  };

  const handleSubmit = async () => {
    const trimmed = url.trim();
    if (!trimmed) { setError("Please enter a valid YouTube URL or video ID"); return; }
    const videoId = extractVideoId(trimmed);
    if (!videoId) { setError("Please enter a valid YouTube URL or video ID"); return; }

    setLoading(true);
    setError("");
    navigate(`/transcript/${videoId}`);
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    const pasted = e.clipboardData.getData("text");
    const id = extractVideoId(pasted.trim());
    if (id) {
      setTimeout(() => {
        setPreviewId(id);
      }, 50);
    }
  };

  return (
    <div className="relative min-h-screen bg-background text-foreground overflow-hidden">
      <ParticleBackground />
      <div className="relative z-10">
        <Header />
        <main className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary">
              <FileText className="h-4 w-4" />
              YouTube Transcript Extractor
            </div>
            <h1 className="mb-4 text-4xl font-bold tracking-tight sm:text-5xl">
              Extract YouTube <span className="text-primary">Transcripts</span>
            </h1>
            <p className="mx-auto mb-10 max-w-lg text-muted-foreground">
              Get any YouTube video transcript instantly — free, no login required.
              Copy, download, or search through the full text.
            </p>
          </motion.div>

          {/* Input */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="mb-8 rounded-2xl border border-border/60 bg-card/80 p-6 backdrop-blur-md"
          >
            <div className="flex gap-3">
              <Input
                ref={inputRef}
                placeholder="Paste YouTube URL or video ID..."
                value={url}
                onChange={(e) => handleUrlChange(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
                onPaste={handlePaste}
                className="flex-1 border-border/60 bg-secondary/50 h-12 text-base"
              />
              <Button
                onClick={handleSubmit}
                disabled={loading}
                size="lg"
                className="gap-2 bg-primary text-primary-foreground hover:bg-primary/90 h-12 px-6"
              >
                {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
                Extract Transcript
              </Button>
            </div>

            {error && (
              <p className="mt-3 text-sm text-destructive">{error}</p>
            )}
          </motion.div>

          {/* Thumbnail preview */}
          {previewId && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="mx-auto max-w-md rounded-2xl border border-border/60 bg-card/80 p-4 backdrop-blur-md"
            >
              <img
                src={`https://img.youtube.com/vi/${previewId}/hqdefault.jpg`}
                alt="Video preview"
                className="w-full rounded-lg"
              />
              <p className="mt-2 text-center text-xs text-muted-foreground">
                Video ID: {previewId}
              </p>
            </motion.div>
          )}

          {loading && (
            <div className="mt-8 space-y-3">
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-64 w-full rounded-xl" />
            </div>
          )}
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default TranscriptHome;
