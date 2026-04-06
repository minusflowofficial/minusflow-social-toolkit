import { useState } from "react";
import { motion } from "framer-motion";
import { Mail, MessageSquare, Send, User, Globe, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import Header from "@/components/Header";
import Footer from "@/components/Footer";
import ParticleBackground from "@/components/ParticleBackground";
import ScrollProgress from "@/components/ScrollProgress";
import { toast } from "sonner";

const Contact = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim() || !message.trim()) {
      toast.error("Please fill in all fields");
      return;
    }
    setSending(true);
    setTimeout(() => {
      setSending(false);
      toast.success("Message sent! We'll get back to you soon.");
      setName("");
      setEmail("");
      setMessage("");
    }, 1500);
  };

  return (
    <div className="relative flex min-h-screen flex-col bg-animate">
      <ParticleBackground />
      <ScrollProgress />
      <Header />

      <main className="relative z-10 flex-1 px-6 py-16 md:px-10">
        <div className="mx-auto max-w-2xl">
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-4 text-center text-4xl font-bold text-foreground"
          >
            Contact <span className="text-primary">Us</span>
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="mb-12 text-center text-muted-foreground"
          >
            Have a question about MinusFlow ToolKit, want to suggest a new platform, or report an issue? We'd love to hear from you.
          </motion.p>

          {/* Quick info cards */}
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15, duration: 0.5 }}
            className="mb-8 grid grid-cols-1 gap-3 sm:grid-cols-3"
          >
            {[
              { icon: Mail, label: "Email", value: "contact@minusflow.net" },
              { icon: Clock, label: "Response Time", value: "Within 48 hours" },
              { icon: Globe, label: "Platforms", value: "YouTube, TikTok, IG & more" },
            ].map((item, i) => (
              <div key={i} className="glass flex flex-col items-center gap-2 rounded-xl p-4 text-center">
                <item.icon className="h-5 w-5 text-primary" />
                <p className="text-xs font-semibold text-foreground">{item.label}</p>
                <p className="text-[11px] text-muted-foreground">{item.value}</p>
              </div>
            ))}
          </motion.div>

          <motion.form
            onSubmit={handleSubmit}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="glass space-y-5 rounded-xl p-8"
          >
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                <User className="h-4 w-4 text-primary" /> Name
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name"
                className="glass h-11 w-full rounded-lg px-4 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all duration-300 focus:shadow-[0_0_20px_hsl(0,85%,55%,0.15)]"
              />
            </div>
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                <Mail className="h-4 w-4 text-primary" /> Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="glass h-11 w-full rounded-lg px-4 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all duration-300 focus:shadow-[0_0_20px_hsl(0,85%,55%,0.15)]"
              />
            </div>
            <div>
              <label className="mb-2 flex items-center gap-2 text-sm font-medium text-foreground">
                <MessageSquare className="h-4 w-4 text-primary" /> Message
              </label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Tell us what's on your mind... feature request, bug report, or just say hi!"
                rows={5}
                className="glass w-full rounded-lg px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all duration-300 focus:shadow-[0_0_20px_hsl(0,85%,55%,0.15)] resize-none"
              />
            </div>
            <Button
              type="submit"
              disabled={sending}
              className="ripple-effect tap-feedback h-11 w-full rounded-xl text-sm font-semibold transition-all duration-300 hover:scale-[1.02] active:scale-[0.98]"
            >
              {sending ? (
                <span className="flex items-center gap-2">
                  <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                    <Send className="h-4 w-4" />
                  </motion.div>
                  Sending…
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <Send className="h-4 w-4" /> Send Message
                </span>
              )}
            </Button>
          </motion.form>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay: 0.3, duration: 0.5 }}
            className="mt-10 text-center text-sm text-muted-foreground"
          >
            You can also reach us at{" "}
            <a href="mailto:contact@minusflow.net" className="text-primary hover:underline">
              contact@minusflow.net
            </a>
          </motion.div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default Contact;
