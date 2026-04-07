import { motion } from "framer-motion";
import { Zap, Shield, Clock } from "lucide-react";
import FAQ from "@/components/FAQ";
import ParticleBackground from "@/components/ParticleBackground";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ScrollProgress from "@/components/ScrollProgress";
import AnimatedCounter from "@/components/AnimatedCounter";
import HeroSection from "@/components/HeroSection";
import ToolShowcase from "@/components/ToolShowcase";
import useDownloadCount from "@/hooks/useDownloadCount";

const trustItems = [
  { icon: Zap, label: "Lightning Fast", desc: "Instant processing on all tools" },
  { icon: Shield, label: "100% Safe", desc: "No data stored, ever" },
  { icon: Clock, label: "Always Free", desc: "Free for all registered users" },
];

const Index = () => {
  const downloadCount = useDownloadCount();

  return (
    <div className="relative flex min-h-screen flex-col bg-animate">
      <ParticleBackground />
      <ScrollProgress />
      <Header />

      <main className="relative z-10 flex flex-1 flex-col items-center pb-8">
        <HeroSection />
        <ToolShowcase />

        {/* Stats counters */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mt-8 grid w-full max-w-2xl grid-cols-3 gap-6 px-4"
        >
          <AnimatedCounter target={downloadCount} suffix="+" label="Downloads" />
          <AnimatedCounter target={10} suffix="+" label="Formats" />
          <AnimatedCounter target={99} suffix="%" label="Uptime" />
        </motion.section>

        {/* Trust section */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6 }}
          className="mt-16 grid w-full max-w-2xl grid-cols-1 gap-4 px-4 sm:grid-cols-3"
        >
          {trustItems.map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.12, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
              whileHover={{ y: -4, scale: 1.02 }}
              className="glass tap-feedback flex flex-col items-center gap-2 rounded-xl p-6 text-center transition-shadow duration-300 hover:shadow-[var(--shadow-glow)]"
            >
              <motion.div whileHover={{ rotate: 10 }} transition={{ type: "spring", stiffness: 300 }}>
                <item.icon className="h-7 w-7 text-primary" />
              </motion.div>
              <p className="font-semibold text-foreground">{item.label}</p>
              <p className="text-xs text-muted-foreground">{item.desc}</p>
            </motion.div>
          ))}
        </motion.section>

        <FAQ />
      </main>

      <Footer />
    </div>
  );
};

export default Index;
