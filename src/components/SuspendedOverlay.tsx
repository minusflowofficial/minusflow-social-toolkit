import { useState } from "react";
import { motion } from "framer-motion";
import { ShieldAlert, MessageCircle, LogOut, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import ParticleBackground from "@/components/ParticleBackground";

const WHATSAPP_NUMBER = "923444947136";

const SuspendedOverlay = () => {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [reason, setReason] = useState("");

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  const buildWhatsAppUrl = () => {
    const message = [
      "🔒 *Account Unsuspend Request*",
      "",
      `👤 *Name:* ${name || "N/A"}`,
      `📧 *Email:* ${email || "N/A"}`,
      `📝 *Reason:* ${reason || "Please unsuspend my account"}`,
      "",
      "— Sent from MinusFlow ToolKit",
    ].join("\n");
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-background px-4">
      <ParticleBackground />
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-md"
      >
        <div className="rounded-2xl border border-destructive/20 bg-card p-6 shadow-2xl">
          <div className="mb-5 text-center">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
              className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10"
            >
              <ShieldAlert className="h-8 w-8 text-destructive" />
            </motion.div>
            <h1 className="text-xl font-bold text-foreground">Account Suspended</h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Your account has been suspended. Fill the form below to request unsuspension.
            </p>
          </div>

          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Your Name *</label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="bg-muted/30"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Your Email *</label>
              <Input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@email.com"
                className="bg-muted/30"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Why should we unsuspend?</label>
              <textarea
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Explain your situation..."
                rows={3}
                className="w-full rounded-md border border-input bg-muted/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>

          <div className="mt-5 flex flex-col gap-2.5">
            <a href={buildWhatsAppUrl()} target="_blank" rel="noopener noreferrer">
              <Button
                className="w-full gap-2 bg-green-600 hover:bg-green-700"
                disabled={!name.trim() || !email.trim()}
              >
                <MessageCircle className="h-4 w-4" /> Send Request on WhatsApp
              </Button>
            </a>
            <Button variant="outline" onClick={handleSignOut} className="w-full gap-2">
              <LogOut className="h-4 w-4" /> Sign Out
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default SuspendedOverlay;
