import { motion } from "framer-motion";
import { Menu, X, ChevronDown, LogIn, UserPlus, LogOut, User } from "lucide-react";
import logoImg from "@/assets/logo.png";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { usePublicTools } from "@/hooks/useTools";
import { trackPageView } from "@/lib/analytics";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { supabase } from "@/integrations/supabase/client";

const pageLinks = [
  { to: "/about", label: "About Us" },
  { to: "/contact", label: "Contact Us" },
  { to: "/privacy", label: "Privacy Policy" },
  { to: "/terms", label: "Terms & Conditions" },
  { to: "/dmca", label: "DMCA" },
  { to: "/disclaimer", label: "Disclaimer" },
];

const DropdownMenu = ({ label, links, pathname }: { label: string; links: { to: string; label: string }[]; pathname: string }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isActive = links.some((l) => l.to === pathname);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className={`flex items-center gap-1 rounded-lg px-3.5 py-2 text-sm font-medium transition-colors duration-200 ${
          isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        {label}
        <ChevronDown className={`h-3.5 w-3.5 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
          className="absolute left-0 top-full z-50 mt-1 min-w-[200px] rounded-xl border border-white/10 bg-card/95 p-1.5 shadow-xl backdrop-blur-xl"
        >
          {links.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={() => setOpen(false)}
              className={`block rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors ${
                pathname === link.to
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
        </motion.div>
      )}
    </div>
  );
};

const Header = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const { data: tools } = usePublicTools();
  const { data: settings } = useSiteSettings();
  const [user, setUser] = useState<any>(null);

  const authEnabled = true; // Always show auth buttons since tools require login

  useEffect(() => {
    trackPageView(location.pathname);
  }, [location.pathname]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setUser(null);
    navigate("/");
  };

  const downloaderLinks = tools?.map((t) => ({
    to: t.route,
    label: t.name,
  })) ?? [
    { to: "/", label: "YouTube Downloader" },
    { to: "/tiktok", label: "TikTok Downloader" },
    { to: "/instagram", label: "Instagram Downloader" },
    { to: "/transcript", label: "YouTube Transcript" },
    { to: "/thumbnail", label: "Thumbnail Downloader" },
  ];

  return (
    <motion.header
      initial={{ y: -30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="relative z-20 flex items-center justify-between px-6 py-5 md:px-10"
    >
      <Link to="/" className="flex items-center group">
        <img src={logoImg} alt="MinusFlow ToolKit" className="h-9 drop-shadow-[0_0_12px_hsl(0,85%,55%,0.3)] transition-all duration-300 group-hover:drop-shadow-[0_0_20px_hsl(0,85%,55%,0.5)]" />
      </Link>

      {/* Desktop Nav */}
      <div className="hidden items-center gap-1 md:flex">
        <nav className="flex items-center gap-1">
          <DropdownMenu label="Tools" links={downloaderLinks} pathname={location.pathname} />
          <DropdownMenu label="Pages" links={pageLinks} pathname={location.pathname} />
        </nav>

        {authEnabled && (
          <div className="ml-4 flex items-center gap-2 border-l border-border/30 pl-4">
            {user ? (
              <>
                <span className="text-xs text-muted-foreground truncate max-w-[140px]">{user.email}</span>
                <button
                  onClick={handleSignOut}
                  className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <LogOut className="h-3.5 w-3.5" /> Sign Out
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/signin"
                  className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
                >
                  <LogIn className="h-3.5 w-3.5" /> Sign In
                </Link>
                <Link
                  to="/signup"
                  className="flex items-center gap-1.5 rounded-lg bg-primary px-3.5 py-2 text-xs font-semibold text-primary-foreground transition-colors hover:bg-primary/90"
                >
                  <UserPlus className="h-3.5 w-3.5" /> Sign Up
                </Link>
              </>
            )}
          </div>
        )}
      </div>

      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:hidden"
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      <MobileMenu open={mobileOpen} onClose={() => setMobileOpen(false)} pathname={location.pathname} downloaderLinks={downloaderLinks} authEnabled={authEnabled} user={user} onSignOut={handleSignOut} />
    </motion.header>
  );
};

const MobileMenu = ({ open, onClose, pathname, downloaderLinks, authEnabled, user, onSignOut }: { open: boolean; onClose: () => void; pathname: string; downloaderLinks: { to: string; label: string }[]; authEnabled: boolean; user: any; onSignOut: () => void }) => {
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  if (!open) return null;

  const toggleGroup = (group: string) => setExpandedGroup(expandedGroup === group ? null : group);

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex flex-col md:hidden"
      style={{ backgroundColor: "hsl(0 0% 3%)" }}
    >
      <div className="flex items-center justify-between px-6 py-5">
        <Link to="/" onClick={onClose} className="flex items-center">
          <img src={logoImg} alt="MinusFlow ToolKit" className="h-9" />
        </Link>
        <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground">
          <X className="h-5 w-5" />
        </button>
      </div>
      <nav className="flex flex-1 flex-col gap-1 px-6 pt-2">
        <button
          onClick={() => toggleGroup("tools")}
          className="flex items-center justify-between rounded-lg px-4 py-3 text-sm font-semibold text-foreground"
        >
          Tools
          <ChevronDown className={`h-4 w-4 transition-transform ${expandedGroup === "tools" ? "rotate-180" : ""}`} />
        </button>
        {expandedGroup === "tools" &&
          downloaderLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={onClose}
              className={`rounded-lg px-8 py-2.5 text-sm font-medium transition-colors ${
                pathname === link.to ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}

        <button
          onClick={() => toggleGroup("pages")}
          className="flex items-center justify-between rounded-lg px-4 py-3 text-sm font-semibold text-foreground"
        >
          Pages
          <ChevronDown className={`h-4 w-4 transition-transform ${expandedGroup === "pages" ? "rotate-180" : ""}`} />
        </button>
        {expandedGroup === "pages" &&
          pageLinks.map((link) => (
            <Link
              key={link.to}
              to={link.to}
              onClick={onClose}
              className={`rounded-lg px-8 py-2.5 text-sm font-medium transition-colors ${
                pathname === link.to ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {link.label}
            </Link>
          ))}
      </nav>

      {/* Mobile Auth Buttons */}
      {authEnabled && (
        <div className="border-t border-border/30 px-6 py-4">
          {user ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3 rounded-lg bg-muted/30 px-4 py-3">
                <User className="h-4 w-4 text-primary" />
                <span className="truncate text-sm text-foreground">{user.email}</span>
              </div>
              <button
                onClick={() => { onSignOut(); onClose(); }}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-muted/50 px-4 py-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
              >
                <LogOut className="h-4 w-4" /> Sign Out
              </button>
            </div>
          ) : (
            <div className="flex gap-3">
              <Link
                to="/signin"
                onClick={onClose}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-muted/50 px-4 py-3 text-sm font-medium text-foreground"
              >
                <LogIn className="h-4 w-4" /> Sign In
              </Link>
              <Link
                to="/signup"
                onClick={onClose}
                className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-primary px-4 py-3 text-sm font-semibold text-primary-foreground"
              >
                <UserPlus className="h-4 w-4" /> Sign Up
              </Link>
            </div>
          )}
        </div>
      )}
    </motion.div>,
    document.body
  );
};

export default Header;
