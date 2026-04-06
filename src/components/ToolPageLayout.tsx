import { motion } from "framer-motion";
import { ReactNode } from "react";
import { LucideIcon, CheckCircle, ArrowDown, Sparkles, Star, Shield, Globe } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ScrollProgress from "@/components/ScrollProgress";
import ParticleBackground from "@/components/ParticleBackground";

interface Feature {
  icon: LucideIcon;
  title: string;
  desc: string;
}

interface Step {
  title: string;
  desc: string;
}

interface FAQ {
  q: string;
  a: string;
}

interface SEOBlock {
  title: string;
  content: string;
}

interface ToolPageLayoutProps {
  icon: LucideIcon;
  title: string;
  highlight: string;
  subtitle: string;
  badge?: string;
  gradientFrom?: string;
  gradientTo?: string;
  iconBgClass?: string;
  features: Feature[];
  steps: Step[];
  faqs: FAQ[];
  seoBlocks: SEOBlock[];
  children: ReactNode;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] } },
};

const floatingVariants = {
  animate: {
    y: [0, -8, 0],
    transition: { duration: 3, repeat: Infinity, ease: "easeInOut" },
  },
};

const ToolPageLayout = ({
  icon: Icon,
  title,
  highlight,
  subtitle,
  badge = "100% Free — No Sign-up",
  gradientFrom = "from-primary",
  gradientTo = "to-orange-400",
  iconBgClass = "bg-primary/10",
  features,
  steps,
  faqs,
  seoBlocks,
  children,
}: ToolPageLayoutProps) => {
  return (
    <div className="relative flex min-h-screen flex-col bg-animate">
      <ParticleBackground />
      <ScrollProgress />
      <Header />

      <main className="relative z-10 flex flex-1 flex-col items-center pb-8">
        {/* ═══ HERO ═══ */}
        <section className="flex w-full flex-col items-center px-4 pt-10 pb-6 text-center md:pt-16">
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: -15, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.5 }}
            className="mb-5"
          >
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/20 bg-primary/5 px-4 py-1.5 text-xs font-medium tracking-wide text-primary">
              <Sparkles className="h-3.5 w-3.5" />
              {badge}
            </span>
          </motion.div>

          {/* Icon */}
          <motion.div
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.5, type: "spring", stiffness: 200 }}
            className={`mb-5 flex h-20 w-20 items-center justify-center rounded-3xl ${iconBgClass} shadow-lg shadow-primary/20`}
          >
            <motion.div
              animate={{ rotate: [0, 5, -5, 0] }}
              transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
            >
              <Icon className="h-10 w-10 text-primary" />
            </motion.div>
          </motion.div>

          {/* Title */}
          <motion.h1
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
            className="mb-3 max-w-2xl text-4xl font-extrabold leading-tight tracking-tight text-foreground md:text-5xl lg:text-6xl"
          >
            {title}{" "}
            <span className={`bg-gradient-to-r ${gradientFrom} ${gradientTo} bg-clip-text text-transparent`}>
              {highlight}
            </span>
          </motion.h1>

          {/* Subtitle */}
          <motion.p
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.35, duration: 0.5 }}
            className="mb-8 max-w-lg text-base leading-relaxed text-muted-foreground md:text-lg"
          >
            {subtitle}
          </motion.p>

          {/* Scroll indicator */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.5 }}
            className="mt-2"
          >
            <motion.div
              animate={{ y: [0, 8, 0] }}
              transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
            >
              <ArrowDown className="h-5 w-5 text-muted-foreground/50" />
            </motion.div>
          </motion.div>
        </section>

        {/* ═══ TOOL WIDGET — EXPANDED GLOWING CARD ═══ */}
        <motion.section
          initial={{ opacity: 0, y: 30, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.7, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="mx-auto w-full max-w-3xl px-4 py-8"
        >
          <div className="relative overflow-hidden rounded-3xl border border-primary/10 bg-card/80 p-6 shadow-2xl shadow-primary/5 backdrop-blur-xl md:p-10">
            {/* Glow effects */}
            <div className="pointer-events-none absolute -top-24 -right-24 h-48 w-48 rounded-full bg-primary/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-24 -left-24 h-48 w-48 rounded-full bg-primary/5 blur-3xl" />
            
            {/* Corner accents */}
            <div className="pointer-events-none absolute top-0 left-0 h-16 w-16 border-t-2 border-l-2 border-primary/20 rounded-tl-3xl" />
            <div className="pointer-events-none absolute bottom-0 right-0 h-16 w-16 border-b-2 border-r-2 border-primary/20 rounded-br-3xl" />
            
            <div className="relative z-10">
              {children}
            </div>
          </div>
        </motion.section>

        {/* ═══ TRUST INDICATORS ═══ */}
        <motion.section
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="mx-auto mt-8 flex w-full max-w-3xl flex-wrap items-center justify-center gap-6 px-4 md:gap-10"
        >
          {[
            { label: "No Sign-up Required", icon: Shield },
            { label: "100% Free Forever", icon: Star },
            { label: "Works on All Devices", icon: Globe },
          ].map((item, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 10 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.15, duration: 0.4 }}
              className="flex items-center gap-2 text-sm text-muted-foreground"
            >
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                <item.icon className="h-4 w-4 text-primary" />
              </div>
              <span className="font-medium">{item.label}</span>
            </motion.div>
          ))}
        </motion.section>

        {/* ═══ FEATURES GRID ═══ */}
        <motion.section
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          className="mx-auto mt-20 w-full max-w-5xl px-4"
        >
          <motion.div variants={itemVariants} className="mb-10 text-center">
            <span className="mb-3 inline-block rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
              FEATURES
            </span>
            <h2 className="mb-3 text-2xl font-bold text-foreground md:text-4xl">
              Why Choose{" "}
              <span className={`bg-gradient-to-r ${gradientFrom} ${gradientTo} bg-clip-text text-transparent`}>
                YTFetch
              </span>
              ?
            </h2>
            <p className="mx-auto max-w-md text-sm text-muted-foreground">
              Powerful tools designed for speed, privacy, and simplicity.
            </p>
          </motion.div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feat, i) => (
              <motion.div
                key={i}
                variants={itemVariants}
                whileHover={{ y: -8, scale: 1.03 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className="group relative overflow-hidden rounded-2xl border border-white/5 bg-card/60 p-7 backdrop-blur-md transition-all duration-500 hover:border-primary/20 hover:bg-card/90 hover:shadow-[0_0_40px_-12px_hsl(var(--primary)/0.3)]"
              >
                {/* Hover gradient overlay */}
                <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/0 to-primary/0 transition-all duration-500 group-hover:from-primary/5 group-hover:via-transparent group-hover:to-primary/3" />
                
                <motion.div
                  whileHover={{ rotate: 12, scale: 1.15 }}
                  transition={{ type: "spring", stiffness: 400, damping: 15 }}
                  className={`relative z-10 mb-4 flex h-12 w-12 items-center justify-center rounded-xl ${iconBgClass} shadow-lg shadow-primary/10`}
                >
                  <feat.icon className="h-6 w-6 text-primary" />
                </motion.div>
                <h3 className="relative z-10 mb-2 text-base font-bold text-foreground">{feat.title}</h3>
                <p className="relative z-10 text-sm leading-relaxed text-muted-foreground">{feat.desc}</p>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* ═══ HOW IT WORKS ═══ */}
        <motion.section
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          className="mx-auto mt-24 w-full max-w-3xl px-4"
        >
          <motion.div variants={itemVariants} className="mb-12 text-center">
            <span className="mb-3 inline-block rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
              HOW IT WORKS
            </span>
            <h2 className="mb-3 text-2xl font-bold text-foreground md:text-4xl">
              Simple as <span className={`bg-gradient-to-r ${gradientFrom} ${gradientTo} bg-clip-text text-transparent`}>1-2-3</span>
            </h2>
            <p className="mx-auto max-w-md text-sm text-muted-foreground">
              No technical knowledge required. Just paste, click, and download.
            </p>
          </motion.div>
          <div className="relative space-y-0">
            {/* Vertical line */}
            <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-primary/60 via-primary/20 to-transparent" />

            {steps.map((step, i) => (
              <motion.div
                key={i}
                variants={itemVariants}
                whileHover={{ x: 6 }}
                transition={{ type: "spring", stiffness: 300, damping: 25 }}
                className="group relative flex gap-5 pb-10 last:pb-0"
              >
                {/* Step number */}
                <motion.div
                  whileHover={{ scale: 1.25, rotate: 10 }}
                  className="relative z-10 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border-2 border-primary/40 bg-card text-sm font-bold text-primary shadow-lg shadow-primary/10 transition-all duration-300 group-hover:border-primary group-hover:shadow-primary/30"
                >
                  {i + 1}
                </motion.div>
                <div className="pt-2">
                  <h3 className="mb-1.5 text-base font-bold text-foreground transition-colors group-hover:text-primary">{step.title}</h3>
                  <p className="text-sm leading-relaxed text-muted-foreground">{step.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </motion.section>

        {/* ═══ SEO CONTENT ═══ */}
        <motion.section
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          className="mx-auto mt-24 w-full max-w-3xl px-4"
        >
          <motion.div variants={itemVariants} className="mb-10 text-center">
            <span className="mb-3 inline-block rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
              LEARN MORE
            </span>
            <h2 className="text-2xl font-bold text-foreground md:text-3xl">
              Everything You Need to Know
            </h2>
          </motion.div>
          {seoBlocks.map((block, i) => (
            <motion.div
              key={i}
              variants={itemVariants}
              whileHover={{ x: 4 }}
              className="group mb-8 rounded-2xl border border-white/5 bg-card/40 p-6 backdrop-blur-sm transition-all duration-300 hover:border-primary/15 hover:bg-card/60"
            >
              <h2 className="mb-3 flex items-start gap-3 text-lg font-bold text-foreground md:text-xl">
                <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary transition-transform group-hover:scale-110" />
                {block.title}
              </h2>
              <p className="pl-8 text-sm leading-relaxed text-muted-foreground">
                {block.content}
              </p>
            </motion.div>
          ))}
        </motion.section>

        {/* ═══ FAQ ═══ */}
        <motion.section
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-50px" }}
          transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="mx-auto mt-20 w-full max-w-3xl px-4 pb-16"
        >
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="mb-10 text-center"
          >
            <span className="mb-3 inline-block rounded-full border border-primary/20 bg-primary/5 px-3 py-1 text-xs font-medium text-primary">
              FAQ
            </span>
            <h2 className="mb-2 text-2xl font-bold text-foreground md:text-4xl">
              Frequently Asked Questions
            </h2>
            <p className="text-sm text-muted-foreground">
              Got questions? We've got answers.
            </p>
          </motion.div>

          <Accordion type="single" collapsible className="space-y-3">
            {faqs.map((faq, i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: i * 0.06, duration: 0.4 }}
              >
                <AccordionItem
                  value={`faq-${i}`}
                  className="group overflow-hidden rounded-2xl border border-white/5 bg-card/50 px-6 backdrop-blur-sm transition-all duration-300 hover:border-primary/15 hover:bg-card/80 hover:shadow-[0_0_30px_-12px_hsl(var(--primary)/0.2)] data-[state=open]:border-primary/20 data-[state=open]:bg-card/90 data-[state=open]:shadow-[0_0_40px_-12px_hsl(var(--primary)/0.25)]"
                >
                  <AccordionTrigger className="py-5 text-left text-sm font-bold text-foreground hover:no-underline md:text-base [&[data-state=open]>svg]:text-primary">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="pb-5 text-sm leading-relaxed text-muted-foreground">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              </motion.div>
            ))}
          </Accordion>
        </motion.section>
      </main>

      <Footer />
    </div>
  );
};

export default ToolPageLayout;
