import { motion } from "framer-motion";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ParticleBackground from "@/components/ParticleBackground";
import ScrollProgress from "@/components/ScrollProgress";

const sections = [
  {
    title: "Information We Collect",
    content: "YTFetch does not collect, store, or track any personal information. We do not require account creation or sign-up. The YouTube URLs you submit are processed in real-time and are never stored on our servers.",
  },
  {
    title: "How We Use Information",
    content: "The only data processed is the YouTube URL you provide, which is used solely to fetch available download formats. This data is processed in memory and discarded immediately after your request is complete.",
  },
  {
    title: "Cookies & Tracking",
    content: "YTFetch does not use cookies, analytics trackers, or any third-party tracking scripts. Your browsing activity on our site is completely private.",
  },
  {
    title: "Third-Party Services",
    content: "We use third-party APIs to process video download requests. These services may have their own privacy policies. We do not share any personally identifiable information with these services.",
  },
  {
    title: "Data Security",
    content: "All communications between your browser and our servers are encrypted using HTTPS. Since we don't store any data, there is no risk of data breaches affecting your personal information.",
  },
  {
    title: "Changes to This Policy",
    content: "We may update this privacy policy from time to time. Any changes will be reflected on this page with an updated revision date.",
  },
  {
    title: "Contact Us",
    content: "If you have any questions about this privacy policy, please reach out to us through MinusFlow.net.",
  },
];

const Privacy = () => (
  <div className="relative flex min-h-screen flex-col bg-animate">
    <ParticleBackground />
    <ScrollProgress />
    <Header />

    <main className="relative z-10 flex-1 px-6 py-16 md:px-10">
      <div className="mx-auto max-w-3xl">
        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-4 text-center text-4xl font-bold text-foreground"
        >
          Privacy Policy
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="mb-12 text-center text-sm text-muted-foreground"
        >
          Last updated: {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </motion.p>

        <div className="space-y-6">
          {sections.map((section, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.05, duration: 0.4 }}
              className="glass rounded-xl p-6"
            >
              <h2 className="mb-3 text-lg font-semibold text-foreground">{section.title}</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">{section.content}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </main>

    <Footer />
  </div>
);

export default Privacy;
