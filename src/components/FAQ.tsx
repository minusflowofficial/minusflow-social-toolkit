import { motion } from "framer-motion";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const faqs = [
  {
    q: "Is YTFetch free to use?",
    a: "Yes, YTFetch is 100% free for personal use — no hidden charges, no subscriptions, and no sign-up required. All tools including YouTube, TikTok, Instagram downloaders, transcript generator, and thumbnail downloader are completely free.",
  },
  {
    q: "What tools does YTFetch offer?",
    a: "YTFetch is a complete media toolkit. We offer: YouTube Video Downloader (MP4/MP3 in multiple qualities), TikTok Downloader (watermark-free), Instagram Downloader (reels, stories, posts), YouTube Transcript Generator, and Thumbnail Downloader. More tools are being added regularly!",
  },
  {
    q: "What video and audio formats are supported?",
    a: "For YouTube videos, you can download in MP4 at resolutions up to 1080p Full HD, plus MP3 and M4A audio formats. TikTok videos are downloaded in MP4 without watermark. Instagram content is saved in its original format and quality.",
  },
  {
    q: "Is YTFetch safe? Does it store my data?",
    a: "Your privacy is our top priority. YTFetch does not store, log, or track any personal data, search history, or downloaded files. We don't use tracking cookies and never ask for personal information. Everything happens in real-time with no data saved on our servers.",
  },
  {
    q: "Why is my download not starting or failing?",
    a: "Make sure the URL is correct and complete. Some videos may be age-restricted, region-locked, or private. Very long videos may take extra time to process. Try refreshing the page, clearing browser cache, or using a different browser. Our system works with the vast majority of publicly available content.",
  },
  {
    q: "Do I need to install any software?",
    a: "No! YTFetch is fully web-based — no downloads, installations, plugins, or extensions required. It works on all modern browsers (Chrome, Firefox, Safari, Edge, Brave) and on mobile devices without any app. Just visit, paste, download.",
  },
  {
    q: "Is downloading content legal?",
    a: "Downloading content for personal, offline viewing is generally acceptable, but always respect copyright laws and platform Terms of Service. YTFetch is intended for personal use — saving educational content, tutorials, or your own uploads. We don't support redistribution or commercial use of copyrighted material.",
  },
];

const FAQ = () => (
  <motion.section
    initial={{ opacity: 0, y: 30 }}
    whileInView={{ opacity: 1, y: 0 }}
    viewport={{ once: true, margin: "-50px" }}
    transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
    className="mx-auto w-full max-w-2xl px-4 py-16"
  >
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      transition={{ duration: 0.5 }}
      className="mb-10 text-center"
    >
      <h2 className="mb-2 text-2xl font-bold text-foreground md:text-3xl">
        Frequently Asked Questions
      </h2>
      <p className="text-sm text-muted-foreground">
        Everything you need to know about YTFetch
      </p>
    </motion.div>
    <Accordion type="single" collapsible className="space-y-2">
      {faqs.map((faq, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 10 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.08, duration: 0.4 }}
        >
          <AccordionItem
            value={`faq-${i}`}
            className="glass rounded-xl px-4 transition-all duration-300 hover:shadow-[var(--shadow-glow)]"
          >
            <AccordionTrigger className="text-left text-foreground hover:no-underline">
              {faq.q}
            </AccordionTrigger>
            <AccordionContent className="text-muted-foreground">
              {faq.a}
            </AccordionContent>
          </AccordionItem>
        </motion.div>
      ))}
    </Accordion>
  </motion.section>
);

export default FAQ;
