import { List, Zap, Shield, Globe, Layers, Clock, Download } from "lucide-react";
import ToolPageLayout from "@/components/ToolPageLayout";
import BulkDownload from "@/components/BulkDownload";

const features = [
  { icon: Layers, title: "Up to 10 Videos", desc: "Process up to 10 YouTube URLs in a single batch — no need to download one at a time." },
  { icon: Zap, title: "Sequential Processing", desc: "Each video is processed one after another with smart delays for maximum reliability." },
  { icon: Download, title: "Format Selection", desc: "Choose your preferred format and quality for each video individually or use global settings." },
  { icon: Clock, title: "Save Hours of Time", desc: "What would take 30 minutes manually now takes under 2 minutes with bulk processing." },
  { icon: Shield, title: "No Data Stored", desc: "We don't save your URLs, videos, or any personal information. Total privacy guaranteed." },
  { icon: Globe, title: "Works on All Devices", desc: "Use on desktop, tablet, or mobile — no app needed, just your web browser." },
];

const steps = [
  { title: "Collect Your URLs", desc: "Gather all the YouTube video URLs you want to download. You can get them from your browser, the YouTube app, or a shared playlist." },
  { title: "Paste All URLs", desc: "Paste up to 10 YouTube URLs in the text area — one URL per line. Our tool validates each URL automatically." },
  { title: "Select Format", desc: "Choose a global download format (MP4/MP3) and quality that applies to all videos, or customize each one individually." },
  { title: "Process & Download", desc: "Click 'Process All' and watch as each video is fetched. Download files individually or use batch download when everything's ready." },
];

const faqs = [
  { q: "How many videos can I download at once?", a: "You can process up to 10 YouTube videos in a single batch. This limit ensures reliable processing and prevents timeouts. For more than 10 videos, simply run another batch after the first one completes." },
  { q: "Can I choose different formats for each video?", a: "Yes! After processing, each video shows its available formats and quality options. You can select different formats for different videos — for example, MP4 for some and MP3 for others." },
  { q: "What happens if one video fails?", a: "If a video fails (due to being private, age-restricted, or unavailable), the tool continues processing the remaining URLs. Failed videos are clearly marked so you can retry them individually." },
  { q: "Is there a daily limit on bulk downloads?", a: "No, there are no daily limits. You can run as many batch downloads as you want throughout the day. Each batch can contain up to 10 URLs." },
  { q: "Does bulk download support Shorts and live streams?", a: "YouTube Shorts URLs are fully supported in bulk mode. However, ongoing live streams cannot be downloaded until after they end and are available as regular videos." },
  { q: "Why is there a delay between each video?", a: "We add a small delay (about 1 second) between processing each video to ensure reliable results and avoid rate limiting. This ensures every video in your batch is processed successfully." },
  { q: "Can I cancel a bulk download in progress?", a: "Yes, you can stop the batch processing at any time. Videos that have already been processed will keep their download links, so you won't lose any progress." },
  { q: "What's the maximum video length supported?", a: "There's no strict length limit, but very long videos (over 3 hours) may take longer to process. Most standard-length videos are processed in just a few seconds each." },
];

const seoBlocks = [
  { title: "Batch Download Multiple YouTube Videos Simultaneously", content: "MinusFlow ToolKit Bulk Downloader processes up to 10 YouTube URLs in a single session. Perfect for saving entire course series, music collections, or tutorial playlists without the tedium of downloading each video individually. Simply paste your URLs, choose your format, and let our tool do the heavy lifting." },
  { title: "Smart Sequential Processing for Maximum Reliability", content: "Unlike tools that try to download everything at once (and often fail), MinusFlow ToolKit processes each video sequentially with intelligent delays. This approach ensures every video in your batch is handled reliably, with clear status indicators showing you exactly what's happening at each step." },
  { title: "Perfect for Content Creators, Students & Educators", content: "Whether you're a student archiving lecture series, a content creator saving reference material, or an educator building an offline resource library — MinusFlow ToolKit Bulk Downloader saves you hours of repetitive work. Back up your favorite content collections in minutes, not hours." },
];

const YouTubeBulkDownloader = () => {
  return (
    <ToolPageLayout
      icon={List}
      title="YouTube Bulk"
      highlight="Downloader"
      subtitle="Download up to 10 YouTube videos at once — paste multiple URLs and batch download instantly."
      badge="Batch Download — Up to 10 Videos"
      features={features}
      steps={steps}
      faqs={faqs}
      seoBlocks={seoBlocks}
    >
      <BulkDownload />
    </ToolPageLayout>
  );
};

export default YouTubeBulkDownloader;
