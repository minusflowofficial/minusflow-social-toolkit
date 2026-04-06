import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

const HeroSection = () => {
  return (
    <section className="relative flex flex-col items-center px-4 pt-12 pb-4 text-center md:pt-20">
      {/* Badge */}
      <motion.div
        initial={{ opacity: 0, y: -15, scale: 0.9 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.1, duration: 0.5 }}
        className="mb-6"
      >
        <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium tracking-wide text-primary">
          <Sparkles className="h-3.5 w-3.5" />
          YouTube · TikTok · Instagram · Facebook · Douyin & More
        </span>
      </motion.div>

      {/* Main heading */}
      <motion.h1
        initial={{ opacity: 0, y: 25 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="mb-4 max-w-3xl text-4xl font-bold leading-tight tracking-tight text-foreground md:text-6xl"
      >
        Your Ultimate{" "}
        <span className="relative inline-block">
          <span className="bg-gradient-to-r from-primary via-orange-400 to-primary bg-[length:200%_auto] bg-clip-text text-transparent animate-[gradient-shift_4s_ease_infinite]">
            Media ToolKit
          </span>
          <motion.span
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ delay: 0.8, duration: 0.6, ease: "easeOut" }}
            className="absolute -bottom-1 left-0 h-[3px] w-full origin-left rounded-full bg-gradient-to-r from-primary to-orange-400"
          />
        </span>
      </motion.h1>

      {/* Subtitle */}
      <motion.p
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        className="mb-8 max-w-xl text-base leading-relaxed text-muted-foreground md:text-lg"
      >
        Download videos, extract transcripts, grab thumbnails — all from one place.
        Fast, free, and works with YouTube, TikTok, Instagram, Facebook, Douyin & more.
      </motion.p>

      {/* Powered by */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.6, duration: 0.5 }}
      >
        <span className="text-xs text-muted-foreground">
          ⚡ Powered by{" "}
          <a
            href="https://minusflow.net"
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold text-primary hover:underline"
          >
            MinusFlow.net
          </a>
        </span>
      </motion.div>
    </section>
  );
};

export default HeroSection;
