import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { FaFacebook, FaWhatsapp, FaUsers } from "react-icons/fa";

const SOCIAL_LINKS = [
  {
    label: "Follow on Facebook",
    handle: "@minusflowofficial",
    href: "https://www.facebook.com/minusflowofficial",
    Icon: FaFacebook,
    color: "#1877F2",
  },
  {
    label: "Join WhatsApp Channel",
    handle: "Get update notifications",
    href: "https://whatsapp.com/channel/0029VaDStim4o7qLfFl6ct1S",
    Icon: FaWhatsapp,
    color: "#25D366",
  },
  {
    label: "Join WhatsApp Group",
    handle: "Chat with the community",
    href: "https://chat.whatsapp.com/HpgtLRlW6ASGzqephtg5Ck",
    Icon: FaUsers,
    color: "#25D366",
  },
];

const SOCIAL_POPUP_EVENT = "mf-social-popup-trigger";

export const triggerSocialPopup = () => {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(SOCIAL_POPUP_EVENT));
};

const SocialPopup = () => {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    // No cooldown — popup appears every download and stays until user closes it.
    const handler = () => setOpen(true);
    window.addEventListener(SOCIAL_POPUP_EVENT, handler);
    return () => window.removeEventListener(SOCIAL_POPUP_EVENT, handler);
  }, []);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 backdrop-blur-sm p-4"
        >
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.95 }}
            transition={{ type: "spring", damping: 22, stiffness: 280 }}
            onClick={(e) => e.stopPropagation()}
            className="glass relative w-full max-w-md rounded-2xl border border-border/40 p-6 shadow-2xl"
          >
            <button
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-muted/20 hover:text-foreground"
              aria-label="Close"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="mb-5 text-center">
              <div className="mb-2 inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-[10px] font-bold uppercase tracking-wider text-primary">
                Download started
              </div>
              <h3 className="text-lg font-bold text-foreground">
                Stay connected with MinusFlow
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Join our community for updates, support &amp; new tools.
              </p>
            </div>

            <div className="space-y-2">
              {SOCIAL_LINKS.map(({ label, handle, href, Icon, color }) => (
                <a
                  key={href}
                  href={href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="group flex items-center gap-3 rounded-xl border border-border/30 bg-muted/5 p-3 transition-all hover:-translate-y-0.5 hover:border-border/60 hover:shadow-[var(--shadow-glow)]"
                >
                  <div
                    className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-lg"
                    style={{ backgroundColor: `${color}1a`, color }}
                  >
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-foreground">
                      {label}
                    </p>
                    <p className="truncate text-[11px] text-muted-foreground">
                      {handle}
                    </p>
                  </div>
                  <span className="text-xs font-medium text-primary opacity-0 transition-opacity group-hover:opacity-100">
                    Open →
                  </span>
                </a>
              ))}
            </div>

            <button
              onClick={() => setOpen(false)}
              className="mt-4 w-full rounded-lg py-2 text-xs text-muted-foreground transition-colors hover:text-foreground"
            >
              Maybe later
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SocialPopup;
