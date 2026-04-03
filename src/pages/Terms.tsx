import { motion } from "framer-motion";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ParticleBackground from "@/components/ParticleBackground";
import ScrollProgress from "@/components/ScrollProgress";

const sections = [
  {
    title: "Acceptance of Terms",
    content: "By accessing and using YTFetch (\"the Service\"), you agree to be bound by these Terms and Conditions. If you do not agree with any part of these terms, you must not use the Service.",
  },
  {
    title: "Description of Service",
    content: "YTFetch is a free online tool that allows users to fetch downloadable links for YouTube videos. The Service acts as a bridge to third-party APIs and does not host, store, or distribute any copyrighted content.",
  },
  {
    title: "User Responsibilities",
    content: "You are solely responsible for ensuring that your use of the Service complies with all applicable laws, including copyright laws. You agree not to use YTFetch to download content that you do not have the right to download or distribute.",
  },
  {
    title: "Intellectual Property",
    content: "All content available on YouTube is the property of the respective content owners. YTFetch does not claim ownership of any content downloaded through the Service. Users must respect the intellectual property rights of content creators.",
  },
  {
    title: "Limitation of Liability",
    content: "YTFetch is provided \"as is\" without any warranties, express or implied. We shall not be liable for any damages arising from the use or inability to use the Service, including but not limited to direct, indirect, incidental, or consequential damages.",
  },
  {
    title: "Prohibited Uses",
    content: "You agree not to: (a) use the Service for any illegal purpose; (b) attempt to interfere with or disrupt the Service; (c) use automated systems to access the Service in a manner that sends more requests than a human can reasonably produce; (d) redistribute or sell content downloaded through the Service.",
  },
  {
    title: "Service Availability",
    content: "We do not guarantee that the Service will be available at all times. We reserve the right to modify, suspend, or discontinue the Service at any time without prior notice.",
  },
  {
    title: "Changes to Terms",
    content: "We reserve the right to update these Terms and Conditions at any time. Continued use of the Service after changes constitutes acceptance of the modified terms.",
  },
  {
    title: "Governing Law",
    content: "These Terms and Conditions shall be governed by and construed in accordance with applicable international laws. Any disputes shall be resolved through appropriate legal channels.",
  },
];

const Terms = () => (
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
          Terms & Conditions
        </motion.h1>
        <motion.p
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1, duration: 0.5 }}
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

export default Terms;
