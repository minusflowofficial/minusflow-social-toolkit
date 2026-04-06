import { ListVideo, Zap, Shield, Globe, Layers, Music, Download } from "lucide-react";
import ToolPageLayout from "@/components/ToolPageLayout";
import PlaylistDownload from "@/components/PlaylistDownload";

const features = [
  { icon: Layers, title: "Full Playlist Support", desc: "Extract and download every video from any public YouTube playlist — courses, albums, collections." },
  { icon: Download, title: "Individual Control", desc: "Choose format and quality for each video separately, or apply a global setting to all." },
  { icon: Music, title: "Audio Extraction", desc: "Grab just the audio from playlist videos — perfect for downloading music albums or podcast series." },
  { icon: Zap, title: "Fast Extraction", desc: "Playlist video IDs are extracted instantly. Individual video processing happens sequentially for reliability." },
  { icon: Shield, title: "Privacy First", desc: "We don't store playlist data, video files, or any personal information. Zero tracking." },
  { icon: Globe, title: "Cross-Platform", desc: "Works on any device with a modern browser — desktop, tablet, or mobile phone." },
];

const steps = [
  { title: "Copy the Playlist URL", desc: "Go to YouTube, open the playlist you want to download, and copy the full URL from your browser's address bar. It must contain the 'list=' parameter." },
  { title: "Paste & Extract", desc: "Paste the playlist URL into the input field and click 'Extract'. Our tool will identify all videos in the playlist." },
  { title: "Review & Configure", desc: "See all playlist videos listed with titles and thumbnails. Choose format and quality for each video or apply global settings." },
  { title: "Download Everything", desc: "Click download on individual videos, or use batch download to save the entire playlist at once." },
];

const faqs = [
  { q: "What types of playlists are supported?", a: "We support standard YouTube playlists, user-created playlists, Mix playlists, channel uploads, 'Watch Later' (if public), and auto-generated playlists. Both public and unlisted playlists work — private playlists require you to be logged into YouTube first." },
  { q: "Is there a limit on playlist size?", a: "We can extract videos from playlists of any size. However, for very large playlists (100+ videos), the extraction process may take a bit longer. We recommend processing large playlists in segments for the best experience." },
  { q: "Can I download an entire music album from YouTube?", a: "Yes! If the album exists as a YouTube playlist (which most do), you can paste the playlist URL and download all tracks. Use the MP3 format option to get audio-only files — perfect for music listening." },
  { q: "What if some videos in the playlist are unavailable?", a: "Unavailable, private, or deleted videos will be skipped automatically with a clear error message. The rest of the playlist will continue downloading normally without interruption." },
  { q: "Can I download YouTube course playlists for offline study?", a: "Absolutely! This is one of the most popular use cases. Paste the course playlist URL, and download all lectures for offline viewing. Perfect for studying without internet access or saving mobile data." },
  { q: "Does it preserve the playlist order?", a: "Yes, videos are extracted in the exact same order they appear in the YouTube playlist. This is especially useful for sequential content like courses, tutorials, or series." },
  { q: "How long does playlist extraction take?", a: "Extracting video IDs from a playlist takes just a few seconds. The actual download processing happens video by video, with each video typically taking 2-5 seconds to process depending on its length." },
  { q: "Can I select specific videos from a playlist?", a: "Yes! After extraction, all videos are listed individually. You can choose to download specific videos rather than the entire playlist — picking only the ones you need." },
];

const seoBlocks = [
  { title: "Download Complete YouTube Playlists for Free", content: "YTFetch Playlist Downloader extracts all videos from any YouTube playlist and lets you download them in your preferred format and quality. Perfect for saving entire course series, music compilations, lecture collections, or video archives. No sign-up required — just paste and download." },
  { title: "Ideal for Students, Educators & Content Archivists", content: "Whether you're a student saving an online course for offline study, an educator building a resource library, or a music lover archiving your favorite albums — YTFetch Playlist Downloader handles it all. Download entire playlists with individual format control for each video." },
  { title: "All URL Formats Supported", content: "We accept standard playlist URLs (youtube.com/playlist?list=...), video URLs with playlist parameters, channel upload pages, and mix playlists. If YouTube recognizes it as a playlist, so do we. Just paste and extract." },
];

const YouTubePlaylistDownloader = () => {
  return (
    <ToolPageLayout
      icon={ListVideo}
      title="YouTube Playlist"
      highlight="Downloader"
      subtitle="Download entire YouTube playlists — paste the playlist URL and save all videos at once."
      badge="Full Playlist Support"
      features={features}
      steps={steps}
      faqs={faqs}
      seoBlocks={seoBlocks}
    >
      <PlaylistDownload />
    </ToolPageLayout>
  );
};

export default YouTubePlaylistDownloader;
