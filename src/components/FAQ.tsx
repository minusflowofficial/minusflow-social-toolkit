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
    a: "Yes, YTFetch is 100% free for personal use — no hidden charges, no subscriptions, and no sign-up required. Simply paste your YouTube video URL, choose a format, and download instantly. We believe everyone should have access to a fast and reliable YouTube downloader without any barriers. Our service is supported entirely so that users can enjoy unlimited downloads at no cost whatsoever.",
  },
  {
    q: "What video and audio formats does YTFetch support?",
    a: "YTFetch supports a wide range of formats to meet every need. For video, you can download in MP4 at resolutions including 1080p Full HD, 720p HD, 480p SD, and 360p. For audio-only downloads, we offer MP3 and M4A formats with high-quality bitrates up to 128kbps and beyond. Whether you need a video for offline viewing or just the audio track from a music video, podcast, or lecture — YTFetch has you covered with the best quality options available.",
  },
  {
    q: "Is YTFetch safe to use? Does it store my data?",
    a: "Your privacy and security are our top priorities. YTFetch does not store, log, or track any of your personal data, search history, or downloaded files. We don't use cookies for tracking, and we never ask for your personal information. The entire process happens in real-time: we fetch the available download links for your video, present them to you, and that's it. No data is saved on our servers after your session ends. You can use YTFetch with complete peace of mind.",
  },
  {
    q: "Why is my download not starting or failing?",
    a: "There are a few common reasons why a download might not start. First, make sure the YouTube URL you pasted is correct and complete. Some videos may be age-restricted, region-locked, or set to private by the uploader — these restrictions can prevent downloads. Additionally, very long videos (over 2-3 hours) may take extra time to process. If you're still facing issues, try refreshing the page, clearing your browser cache, or using a different browser. Our system works with the vast majority of publicly available YouTube videos.",
  },
  {
    q: "Do I need to install any software or browser extension?",
    a: "No, absolutely not! YTFetch is a fully web-based tool that works directly in your browser — no downloads, installations, plugins, or browser extensions required. It works seamlessly on all modern browsers including Chrome, Firefox, Safari, Edge, and Brave. You can even use it on your mobile phone or tablet without installing any app. Just visit the website, paste your link, and download. It's that simple.",
  },
  {
    q: "Can I download YouTube playlists or multiple videos at once?",
    a: "Currently, YTFetch supports downloading one video at a time for the best performance and reliability. Playlist or batch downloading is not supported at this time, but it's a feature we're actively considering for future updates. For now, you can download individual videos quickly — most downloads are processed within seconds. Stay tuned for upcoming features by bookmarking our site!",
  },
  {
    q: "Is downloading YouTube videos legal?",
    a: "Downloading YouTube videos for personal, offline viewing is generally acceptable in many regions, but it's important to respect copyright laws and YouTube's Terms of Service. YTFetch is intended strictly for personal use — such as saving educational content, lectures, tutorials, or your own uploaded videos for offline access. We do not encourage or support downloading copyrighted content for redistribution, commercial use, or any purpose that violates intellectual property rights. Always ensure you have the right to download and use the content.",
  },
  {
    q: "What is the maximum video quality I can download?",
    a: "YTFetch allows you to download videos in the highest quality available for that particular video, up to 1080p Full HD. The available quality options depend on what the original uploader has provided. If a video was uploaded in 1080p, you'll see that option. For audio, we provide the best available bitrate to ensure crystal-clear sound quality. We always aim to give you the closest experience to the original upload quality.",
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
    <h2 className="mb-8 text-center text-2xl font-bold text-foreground">
      Frequently Asked Questions
    </h2>
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
