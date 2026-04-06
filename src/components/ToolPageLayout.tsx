import { motion } from "framer-motion";
import { ReactNode } from "react";
import { LucideIcon, CheckCircle, ArrowDown, Sparkles } from "lucide-react";
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
            className={`mb-5 flex h-20 w-20 items-center justify-center rounded-3xl ${iconBgClass} shadow-lg`}
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
            className="mb-3 max-w-2xl text-4xl font-extrabold leading-tight tracking-tight text-foreground md:text-5xl"
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
            className="mb-6 max-w-lg text-base leading-relaxed text-muted-foreground"
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

        {/* ═══ TOOL WIDGET ═══ */}
        <motion.section
          initial={{ opacity: 0, y: 30, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ delay: 0.4, duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
          className="mx-auto w-full max-w-2xl px-4 py-6"
        >
          {children}
        </motion.section>

        {/* ═══ FEATURES GRID ═══ */}
        <motion.section
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-60px" }}
          className="mx-auto mt-16 w-full max-w-4xl px-4"
        >
          <motion.h2
            variants={itemVariants}
            className="mb-8 text-center text-2xl font-bold text-foreground md:text-3xl"
          >
            Why Choose{" "}
            <span className={`bg-gradient-to-r ${gradientFrom} ${gradientTo} bg-clip-text text-transparent`}>
              YTFetch
            </span>
            ?
          </motion.h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {features.map((feat, i) => (
              <motion.div
                key={i}
                variants={itemVariants}
                whileHover={{ y: -6, scale: 1.02 }}
                className="glass group flex flex-col gap-3 rounded-2xl p-6 transition-all duration-300 hover:shadow-[var(--shadow-glow)]"
              >
                <motion.div
                  whileHover={{ rotate: 12, scale: 1.1 }}
                  transition={{ type: "spring", stiffness: 400, damping: 15 }}
                  className={`flex h-11 w-11 items-center justify-center rounded-xl ${iconBgClass}`}
                >
                  <feat.icon className="h-5 w-5 text-primary" />
                </motion.div>
                <h3 className="text-base font-semibold text-foreground">{feat.title}</h3>
                <p className="text-sm leading-relaxed text-muted-foreground">{feat.desc}</p>
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
          className="mx-auto mt-20 w-full max-w-2xl px-4"
        >
          <motion.h2
            variants={itemVariants}
            className="mb-10 text-center text-2xl font-bold text-foreground md:text-3xl"
          >
            How It Works
          </motion.h2>
          <div className="relative space-y-0">
            {/* Vertical line */}
            <div className="absolute left-6 top-0 bottom-0 w-px bg-gradient-to-b from-primary/60 via-primary/20 to-transparent" />

            {steps.map((step, i) => (
              <motion.div
                key={i}
                variants={itemVariants}
                className="relative flex gap-5 pb-8 last:pb-0"
              >
                {/* Step number */}
                <motion.div
                  whileHover={{ scale: 1.2 }}
                  className="relative z-10 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border-2 border-primary/40 bg-card text-sm font-bold text-primary shadow-lg"
                >
                  {i + 1}
                </motion.div>
                <div className="pt-2">
                  <h3 className="mb-1 text-base font-semibold text-foreground">{step.title}</h3>
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
          className="mx-auto mt-20 w-full max-w-2xl px-4"
        >
          {seoBlocks.map((block, i) => (
            <motion.div key={i} variants={itemVariants} className="mb-8">
              <h2 className="mb-3 flex items-start gap-2 text-xl font-bold text-foreground">
                <CheckCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
                {block.title}
              </h2>
              <p className="pl-7 text-sm leading-relaxed text-muted-foreground">
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
          className="mx-auto mt-16 w-full max-w-2xl px-4 pb-16"
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
                  className="glass rounded-xl px-5 transition-all duration-300 hover:shadow-[var(--shadow-glow)]"
                >
                  <AccordionTrigger className="py-5 text-left text-sm font-semibold text-foreground hover:no-underline md:text-base">
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
