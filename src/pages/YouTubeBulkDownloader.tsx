import { motion } from "framer-motion";
import { List } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ScrollProgress from "@/components/ScrollProgress";
import ParticleBackground from "@/components/ParticleBackground";
import BulkDownload from "@/components/BulkDownload";

const YouTubeBulkDownloader = () => {
  return (
    <div className="relative flex min-h-screen flex-col bg-animate">
      <ParticleBackground />
      <ScrollProgress />
      <Header />

      <main className="relative z-10 mx-auto flex w-full max-w-2xl flex-1 flex-col items-center px-4 pb-20 pt-8">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8 text-center"
        >
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10">
            <List className="h-8 w-8 text-primary" />
          </div>
          <h1 className="mb-2 text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
            YouTube Bulk{" "}
            <span className="bg-gradient-to-r from-primary to-orange-400 bg-clip-text text-transparent">
              Downloader
            </span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Download up to 10 YouTube videos at once — paste multiple URLs and batch download instantly.
          </p>
        </motion.div>

        <BulkDownload />

        {/* SEO Content */}
        <section className="mt-16 space-y-6 text-sm leading-relaxed text-muted-foreground">
          <h2 className="text-xl font-bold text-foreground">Batch Download Multiple YouTube Videos at Once</h2>
          <p>
            Need to download several YouTube videos quickly? YTFetch Bulk Downloader processes up to 10 YouTube URLs simultaneously.
            Just paste your list of URLs, choose a format, and let our tool handle the rest — no waiting around for each video individually.
          </p>
          <h3 className="text-lg font-semibold text-foreground">How Bulk Download Works</h3>
          <ol className="list-decimal list-inside space-y-1">
            <li>Paste up to 10 YouTube URLs (one per line)</li>
            <li>Select your preferred video or audio format</li>
            <li>Click "Process All" — each video is fetched sequentially</li>
            <li>Download each file individually or use batch download</li>
          </ol>
          <h3 className="text-lg font-semibold text-foreground">Why Use Bulk Download?</h3>
          <p>
            Perfect for saving entire course series, music collections, or tutorial playlists.
            Save time by processing multiple videos in one session instead of downloading them one by one.
            All downloads are free, fast, and require no sign-up.
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default YouTubeBulkDownloader;
