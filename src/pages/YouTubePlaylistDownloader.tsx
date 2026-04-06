import { motion } from "framer-motion";
import { ListVideo } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ScrollProgress from "@/components/ScrollProgress";
import ParticleBackground from "@/components/ParticleBackground";
import PlaylistDownload from "@/components/PlaylistDownload";

const YouTubePlaylistDownloader = () => {
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
            <ListVideo className="h-8 w-8 text-primary" />
          </div>
          <h1 className="mb-2 text-3xl font-extrabold tracking-tight text-foreground md:text-4xl">
            YouTube Playlist{" "}
            <span className="bg-gradient-to-r from-primary to-orange-400 bg-clip-text text-transparent">
              Downloader
            </span>
          </h1>
          <p className="text-sm text-muted-foreground">
            Download entire YouTube playlists — paste the playlist URL and save all videos at once.
          </p>
        </motion.div>

        <PlaylistDownload />

        {/* SEO Content */}
        <section className="mt-16 space-y-6 text-sm leading-relaxed text-muted-foreground">
          <h2 className="text-xl font-bold text-foreground">Download Full YouTube Playlists for Free</h2>
          <p>
            YTFetch Playlist Downloader extracts all videos from a YouTube playlist and lets you download them one by one
            in your preferred format and quality. Perfect for saving entire course series, music compilations, or video collections.
          </p>
          <h3 className="text-lg font-semibold text-foreground">How to Download a YouTube Playlist</h3>
          <ol className="list-decimal list-inside space-y-1">
            <li>Copy the YouTube playlist URL (must contain "list=" parameter)</li>
            <li>Paste the URL in the input field above</li>
            <li>Click "Extract" to load all videos in the playlist</li>
            <li>Choose format and quality for each video</li>
            <li>Download individually or batch download all videos</li>
          </ol>
          <h3 className="text-lg font-semibold text-foreground">Supported Playlist Types</h3>
          <p>
            We support standard YouTube playlists, user-created playlists, Mix playlists, and channel uploads.
            Both public and unlisted playlists are supported — private playlists require you to be logged in on YouTube.
          </p>
        </section>
      </main>

      <Footer />
    </div>
  );
};

export default YouTubePlaylistDownloader;
