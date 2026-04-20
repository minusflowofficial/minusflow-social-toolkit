import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  FileText,
  Image,
  Download,
  ArrowRight,
  List,
  ListVideo,
  DownloadCloud,
} from "lucide-react";
import {
  FaYoutube,
  FaTiktok,
  FaInstagram,
  FaFacebookF,
} from "react-icons/fa";
import { SiDouyin } from "react-icons/si";
import { usePublicTools } from "@/hooks/useTools";

const iconMap: Record<string, React.ElementType> = {
  // Brand icons (real platform logos)
  Youtube: FaYoutube,
  Music: FaTiktok, // legacy mapping for TikTok single
  Tiktok: FaTiktok,
  Instagram: FaInstagram,
  Facebook: FaFacebookF,
  Globe: SiDouyin, // legacy mapping for Douyin
  Douyin: SiDouyin,
  // Generic icons (non-brand)
  FileText,
  Image,
  Download,
  List,
  ListVideo,
  DownloadCloud,
};

const gradients = [
  "from-red-500/20 to-orange-500/20",
  "from-pink-500/20 to-rose-500/20",
  "from-purple-500/20 to-fuchsia-500/20",
  "from-blue-500/20 to-cyan-500/20",
  "from-emerald-500/20 to-teal-500/20",
  "from-amber-500/20 to-yellow-500/20",
];

const glowColors = [
  "group-hover:shadow-[0_0_40px_hsl(0,85%,55%,0.3)]",
  "group-hover:shadow-[0_0_40px_hsl(330,80%,55%,0.3)]",
  "group-hover:shadow-[0_0_40px_hsl(270,80%,55%,0.3)]",
  "group-hover:shadow-[0_0_40px_hsl(210,80%,55%,0.3)]",
  "group-hover:shadow-[0_0_40px_hsl(150,80%,55%,0.3)]",
  "group-hover:shadow-[0_0_40px_hsl(40,80%,55%,0.3)]",
];

const iconColors = [
  "text-red-400",
  "text-pink-400",
  "text-purple-400",
  "text-blue-400",
  "text-emerald-400",
  "text-amber-400",
];

const fallbackTools = [
  { name: "YouTube Downloader", route: "/youtube-downloader", icon: "Youtube", description: "Download videos in MP4, MP3 & more", slug: "yt-single" },
  { name: "YouTube Bulk Downloader", route: "/youtube-bulk-downloader", icon: "List", description: "Download up to 10 YouTube videos at once", slug: "yt-bulk" },
  { name: "YouTube Playlist Downloader", route: "/youtube-playlist-downloader", icon: "ListVideo", description: "Download entire YouTube playlists", slug: "yt-playlist" },
  { name: "TikTok Downloader", route: "/tiktok-downloader", icon: "Music", description: "Save TikTok videos without watermark", slug: "tt-single" },
  { name: "TikTok Bulk Downloader", route: "/tiktok-bulk-downloader", icon: "DownloadCloud", description: "Download up to 20 TikTok videos at once", slug: "tt-bulk" },
  { name: "Instagram Downloader", route: "/instagram-downloader", icon: "Instagram", description: "Download reels, videos & posts in HD", slug: "ig-single" },
  { name: "Instagram Bulk Downloader", route: "/instagram-bulk-downloader", icon: "DownloadCloud", description: "Download up to 20 Instagram reels at once", slug: "ig-bulk" },
  { name: "Douyin Downloader", route: "/douyin-downloader", icon: "Globe", description: "Download Douyin videos in HD quality", slug: "dy-single" },
  { name: "Douyin Bulk Downloader", route: "/douyin-bulk-downloader", icon: "DownloadCloud", description: "Download multiple Douyin videos at once", slug: "dy-bulk" },
  { name: "Transcript Generator", route: "/transcript", icon: "FileText", description: "Extract YouTube video transcripts", slug: "tr" },
  { name: "Thumbnail Downloader", route: "/thumbnail", icon: "Image", description: "Get HD thumbnails from any video", slug: "th" },
];

const ToolShowcase = () => {
  const { data: dbTools, isLoading } = usePublicTools();

  const tools = dbTools?.length
    ? dbTools.map((t) => ({
        name: t.name,
        route: t.route,
        icon: t.icon || "Download",
        description: t.description || "",
        slug: t.slug,
      }))
    : fallbackTools;

  return (
    <motion.section
      initial={{ opacity: 0 }}
      whileInView={{ opacity: 1 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.6 }}
      className="mx-auto w-full max-w-5xl px-4 py-16"
    >
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true }}
        transition={{ duration: 0.5 }}
        className="mb-12 text-center"
      >
        <h2 className="mb-3 text-3xl font-bold tracking-tight text-foreground md:text-4xl">
          All Your Tools,{" "}
          <span className="bg-gradient-to-r from-primary to-orange-400 bg-clip-text text-transparent">
            One Place
          </span>
        </h2>
        <p className="text-muted-foreground">
          Free, fast, no sign-up. Pick a tool and get started.
        </p>
      </motion.div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(isLoading ? Array.from({ length: 5 }) : tools).map((tool, i) => {
          if (isLoading) {
            return (
              <div
                key={i}
                className="shimmer h-40 rounded-2xl"
              />
            );
          }

          const t = tool as (typeof fallbackTools)[0];
          const Icon = iconMap[t.icon] || Download;
          const gradient = gradients[i % gradients.length];
          const glow = glowColors[i % glowColors.length];
          const iconColor = iconColors[i % iconColors.length];

          return (
            <motion.div
              key={t.slug}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              whileInView={{ opacity: 1, y: 0, scale: 1 }}
              viewport={{ once: true }}
              transition={{
                delay: i * 0.1,
                duration: 0.5,
                ease: [0.25, 0.46, 0.45, 0.94],
              }}
            >
              <Link
                to={t.route}
                className={`group relative flex flex-col gap-4 rounded-2xl border border-border/50 bg-gradient-to-br ${gradient} p-6 backdrop-blur-sm transition-all duration-500 hover:-translate-y-2 hover:border-primary/30 ${glow}`}
              >
                {/* Animated border glow */}
                <div className="absolute inset-0 rounded-2xl opacity-0 transition-opacity duration-500 group-hover:opacity-100"
                  style={{
                    background: "linear-gradient(135deg, hsl(0 85% 55% / 0.05), transparent, hsl(0 85% 55% / 0.05))",
                  }}
                />

                <div className="relative flex items-center justify-between">
                  <motion.div
                    whileHover={{ rotate: 12, scale: 1.15 }}
                    transition={{ type: "spring", stiffness: 400, damping: 15 }}
                    className={`flex h-12 w-12 items-center justify-center rounded-xl bg-card/80 ${iconColor} shadow-lg`}
                  >
                    <Icon className="h-6 w-6" />
                  </motion.div>

                  <motion.div
                    initial={{ x: -5, opacity: 0 }}
                    whileHover={{ x: 0, opacity: 1 }}
                    className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10 text-primary opacity-0 transition-opacity duration-300 group-hover:opacity-100"
                  >
                    <ArrowRight className="h-4 w-4" />
                  </motion.div>
                </div>

                <div className="relative">
                  <h3 className="mb-1 text-lg font-semibold text-foreground transition-colors duration-300 group-hover:text-primary">
                    {t.name}
                  </h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">
                    {t.description}
                  </p>
                </div>

                {/* Bottom accent line */}
                <div className="absolute bottom-0 left-6 right-6 h-[2px] scale-x-0 rounded-full bg-gradient-to-r from-transparent via-primary to-transparent transition-transform duration-500 group-hover:scale-x-100" />
              </Link>
            </motion.div>
          );
        })}
      </div>
    </motion.section>
  );
};

export default ToolShowcase;
