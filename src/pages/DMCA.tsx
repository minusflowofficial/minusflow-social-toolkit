import { motion } from "framer-motion";
import { AlertTriangle } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ParticleBackground from "@/components/ParticleBackground";
import ScrollProgress from "@/components/ScrollProgress";

const sections = [
  {
    title: "DMCA Compliance",
    content: "MinusFlow ToolKit respects the intellectual property rights of others and complies with the Digital Millennium Copyright Act (DMCA). We do not host, store, or distribute any copyrighted content. Our service merely provides links to publicly available content from YouTube, TikTok, Instagram, and other supported platforms through third-party APIs.",
  },
  {
    title: "How MinusFlow ToolKit Works",
    content: "MinusFlow ToolKit does not download, cache, or store any video or audio files on its servers. When a user submits a URL from any supported platform, our service fetches publicly available metadata and download links from third-party services. The actual content is served directly from those third-party servers.",
  },
  {
    title: "Filing a DMCA Takedown Notice",
    content: "If you believe that content accessible through MinusFlow ToolKit infringes your copyright, you may submit a DMCA takedown notice. Your notice must include: (1) identification of the copyrighted work; (2) identification of the infringing material and its URL; (3) your contact information; (4) a statement of good faith belief; (5) a statement of accuracy under penalty of perjury; and (6) your physical or electronic signature.",
  },
  {
    title: "Where to Send Notices",
    content: "DMCA takedown notices should be sent to our designated agent at: dmca@minusflow.net. Please include \"DMCA Notice\" in the subject line. We will respond to valid notices within 48 business hours.",
  },
  {
    title: "Counter-Notification",
    content: "If you believe your content was wrongly removed or disabled as a result of a DMCA notice, you may file a counter-notification. The counter-notification must include your contact information, identification of the removed material, a statement under penalty of perjury, and your consent to jurisdiction.",
  },
  {
    title: "Repeat Infringers",
    content: "MinusFlow ToolKit reserves the right to terminate access for users who are found to be repeat infringers. We take copyright violations seriously and cooperate fully with rights holders across all supported platforms.",
  },
];

const DMCA = () => (
  <div className="relative flex min-h-screen flex-col bg-animate">
    <ParticleBackground />
    <ScrollProgress />
    <Header />

    <main className="relative z-10 flex-1 px-6 py-16 md:px-10">
      <div className="mx-auto max-w-3xl">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5 }}
          className="mb-8 flex justify-center"
        >
          <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/15">
            <AlertTriangle className="h-8 w-8 text-primary" />
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="mb-4 text-center text-4xl font-bold text-foreground"
        >
          DMCA <span className="text-primary">Policy</span>
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15, duration: 0.5 }}
          className="mb-12 text-center text-sm text-muted-foreground"
        >
          Last updated: {new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}
        </motion.p>

        <div className="space-y-5">
          {sections.map((section, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.04, duration: 0.4 }}
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

export default DMCA;
