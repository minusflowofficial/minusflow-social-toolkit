import { motion } from "framer-motion";
import { Info } from "lucide-react";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ParticleBackground from "@/components/ParticleBackground";
import ScrollProgress from "@/components/ScrollProgress";

const sections = [
  {
    title: "General Disclaimer",
    content: "The information and services provided by YTFetch are for general informational and personal use purposes only. While we strive to keep the Service functional and up-to-date, we make no representations or warranties of any kind, express or implied, about the completeness, accuracy, reliability, or availability of the Service.",
  },
  {
    title: "No Endorsement",
    content: "YTFetch does not endorse, promote, or encourage the downloading of copyrighted content without permission. Users are solely responsible for ensuring they have the legal right to download any content accessed through the Service.",
  },
  {
    title: "Third-Party Content",
    content: "All videos and content accessible through YTFetch are hosted on third-party platforms (such as YouTube) and are the intellectual property of their respective owners. YTFetch has no control over and assumes no responsibility for the content, privacy policies, or practices of any third-party sites or services.",
  },
  {
    title: "Use at Your Own Risk",
    content: "Any reliance you place on the Service is strictly at your own risk. We shall not be liable for any loss or damage, including without limitation, indirect or consequential loss or damage arising from the use of the Service.",
  },
  {
    title: "Service Interruptions",
    content: "YTFetch may experience downtime, errors, or interruptions. We do not guarantee uninterrupted access to the Service and are not liable for any inconvenience caused by temporary unavailability.",
  },
  {
    title: "External Links",
    content: "The Service may contain links to external websites that are not provided or maintained by YTFetch. We do not guarantee the accuracy, relevance, timeliness, or completeness of any information on these external websites.",
  },
  {
    title: "Fair Use",
    content: "YTFetch is intended to be used in accordance with fair use principles. Users should only download content for personal, non-commercial, educational, or research purposes where permitted by applicable law.",
  },
];

const Disclaimer = () => (
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
            <Info className="h-8 w-8 text-primary" />
          </div>
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
          className="mb-4 text-center text-4xl font-bold text-foreground"
        >
          Disclaimer
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

export default Disclaimer;
