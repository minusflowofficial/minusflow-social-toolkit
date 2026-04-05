import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Clock, Trash2, Eye, FileText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ParticleBackground from "@/components/ParticleBackground";
import { HistoryItem, getHistory, removeFromHistory, clearHistory } from "@/lib/transcript-utils";

const TranscriptHistory = () => {
  const [items, setItems] = useState<HistoryItem[]>([]);
  const navigate = useNavigate();

  useEffect(() => { setItems(getHistory()); }, []);

  const handleDelete = (videoId: string) => {
    removeFromHistory(videoId);
    setItems(getHistory());
    toast.success("Removed from history");
  };

  const formatDate = (iso: string) =>
    new Date(iso).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });

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
              <Clock className="h-4 w-4" />
              Transcript History
            </div>
            <h1 className="mb-3 text-3xl font-bold tracking-tight sm:text-4xl">
              Your <span className="text-primary">Recent</span> Transcripts
            </h1>
            <p className="mx-auto max-w-xl text-muted-foreground">
              Quick access to previously extracted transcripts, stored locally.
            </p>
          </motion.div>

          {items.length > 0 && (
            <div className="mb-6 flex justify-end">
              <Button
                size="sm" variant="outline"
                onClick={() => { clearHistory(); setItems([]); toast.success("History cleared"); }}
                className="gap-2 text-destructive hover:text-destructive"
              >
                <Trash2 className="h-3.5 w-3.5" /> Clear All
              </Button>
            </div>
          )}

          {items.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="rounded-2xl border border-border/60 bg-card/80 p-12 text-center backdrop-blur-md"
            >
              <FileText className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
              <h3 className="text-lg font-medium text-muted-foreground">No transcripts yet</h3>
              <p className="mt-1 text-sm text-muted-foreground/70">
                Go extract a transcript and it will appear here!
              </p>
              <Button className="mt-4 gap-2" onClick={() => navigate("/transcript")}>
                <FileText className="h-4 w-4" /> Extract a Transcript
              </Button>
            </motion.div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {items.map((item, i) => (
                <motion.div
                  key={item.videoId}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.04 }}
                  className="rounded-xl border border-border/60 bg-card/80 p-3 backdrop-blur-md"
                >
                  <div className="flex gap-3">
                    <img
                      src={item.thumbnail}
                      alt={item.title}
                      className="h-16 w-28 shrink-0 rounded-lg object-cover"
                    />
                    <div className="min-w-0 flex-1">
                      <h3 className="text-sm font-medium leading-tight line-clamp-2">{item.title}</h3>
                      <div className="mt-1 flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{item.wordCount.toLocaleString()} words</span>
                        <span>•</span>
                        <span>{formatDate(item.fetchedAt)}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-2 flex gap-2">
                    <Button
                      size="sm" variant="outline" className="flex-1 gap-1.5 text-xs"
                      onClick={() => navigate(`/transcript/${item.videoId}`)}
                    >
                      <Eye className="h-3 w-3" /> View
                    </Button>
                    <Button
                      size="sm" variant="outline" className="gap-1.5 text-xs text-destructive hover:text-destructive"
                      onClick={() => handleDelete(item.videoId)}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default TranscriptHistory;
