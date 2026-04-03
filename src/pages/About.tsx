import { motion } from "framer-motion";
import { Zap, Globe, Lock, Download, Users, Target } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ParticleBackground from "@/components/ParticleBackground";
import ScrollProgress from "@/components/ScrollProgress";

const features = [
  { icon: Zap, title: "Lightning Fast", desc: "Our backend processes your request in seconds, delivering download links instantly." },
  { icon: Globe, title: "Works Everywhere", desc: "Use YTFetch from any device — desktop, tablet, or mobile. No app install needed." },
  { icon: Lock, title: "Privacy First", desc: "We never store your data, search history, or downloaded content. Zero tracking." },
  { icon: Download, title: "Multiple Formats", desc: "Choose from MP4, MP3, M4A and various resolutions from 360p to 1080p." },
  { icon: Users, title: "Built for Everyone", desc: "Whether you're a student, creator, or casual user — YTFetch is designed to be simple and accessible." },
  { icon: Target, title: "Reliable & Accurate", desc: "We ensure the best quality links are fetched every time with smart fallback mechanisms." },
];

const About = () => (
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
          About Us
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="mb-6 text-center text-lg text-muted-foreground"
        >
          YTFetch is a free, fast, and private YouTube video downloader built by{" "}
          <a href="https://minusflow.net" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
            MinusFlow.net
          </a>.
        </motion.p>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="mb-16 text-center text-sm leading-relaxed text-muted-foreground"
        >
          Our mission is to provide the simplest and most reliable way to save YouTube content for offline viewing. 
          We believe in transparency, speed, and user privacy above all else.
        </motion.p>

        <div className="grid gap-6 sm:grid-cols-2">
          {features.map((f, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.1, duration: 0.5 }}
              whileHover={{ y: -4, scale: 1.02 }}
              className="glass rounded-xl p-6 transition-shadow duration-300 hover:shadow-[var(--shadow-glow)]"
            >
              <f.icon className="mb-3 h-8 w-8 text-primary" />
              <h2 className="mb-2 text-lg font-semibold text-foreground">{f.title}</h2>
              <p className="text-sm leading-relaxed text-muted-foreground">{f.desc}</p>
            </motion.div>
          ))}
        </div>

        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mt-16 glass rounded-xl p-8"
        >
          <h2 className="mb-4 text-2xl font-bold text-foreground">How It Works</h2>
          <ol className="space-y-4 text-muted-foreground">
            {[
              "Paste any YouTube video URL into the input field.",
              "Click \"Fetch\" to retrieve available download formats.",
              "Choose your preferred quality and format.",
              "Click download — your file saves instantly.",
            ].map((step, i) => (
              <motion.li
                key={i}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.1, duration: 0.4 }}
                className="flex items-start gap-3"
              >
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-primary/20 text-xs font-bold text-primary">
                  {i + 1}
                </span>
                <span className="text-sm leading-relaxed">{step}</span>
              </motion.li>
            ))}
          </ol>
        </motion.section>
      </div>
    </main>

    <Footer />
  </div>
);

export default About;
