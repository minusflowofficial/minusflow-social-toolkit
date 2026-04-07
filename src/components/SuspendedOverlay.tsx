import { motion } from "framer-motion";
import { ShieldAlert, MessageCircle, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import ParticleBackground from "@/components/ParticleBackground";

const WHATSAPP_NUMBER = "923444947136"; // 03444947136 → international format
const WHATSAPP_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=Hi%2C%20my%20account%20has%20been%20suspended%20on%20MinusFlow%20ToolKit.%20Please%20help%20me%20get%20unblocked.`;

const SuspendedOverlay = () => {
  const handleSignOut = async () => {
    await supabase.auth.signOut();
    window.location.href = "/";
  };

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-background px-4">
      <ParticleBackground />
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative z-10 w-full max-w-md text-center"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ type: "spring", stiffness: 200, delay: 0.2 }}
          className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-destructive/10"
        >
          <ShieldAlert className="h-10 w-10 text-destructive" />
        </motion.div>

        <h1 className="mb-2 text-2xl font-bold text-foreground">Account Suspended</h1>
        <p className="mb-2 text-sm text-muted-foreground">
          Your account has been suspended due to too many simultaneous logins from different devices.
        </p>
        <p className="mb-6 text-xs text-muted-foreground">
          Please contact the admin to get your account unsuspended.
        </p>

        <div className="flex flex-col gap-3">
          <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">
            <Button className="w-full gap-2 bg-green-600 hover:bg-green-700">
              <MessageCircle className="h-4 w-4" /> Contact Admin on WhatsApp
            </Button>
          </a>
          <Button variant="outline" onClick={handleSignOut} className="w-full gap-2">
            <LogOut className="h-4 w-4" /> Sign Out
          </Button>
        </div>
      </motion.div>
    </div>
  );
};

export default SuspendedOverlay;
