import { motion } from "framer-motion";
import { Youtube, Menu, X, ChevronDown } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";

const downloaderLinks = [
  { to: "/", label: "YouTube Downloader" },
  { to: "/tiktok", label: "TikTok Downloader" },
  { to: "/instagram", label: "Instagram Downloader" },
];

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
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <motion.header
      initial={{ y: -30, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }}
      className="relative z-20 flex items-center justify-between px-6 py-5 md:px-10"
    >
      <Link to="/" className="flex items-center gap-2.5 group">
        <motion.div
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          <Youtube className="h-8 w-8 text-primary drop-shadow-[0_0_12px_hsl(0,85%,55%,0.5)] transition-all duration-300 group-hover:drop-shadow-[0_0_20px_hsl(0,85%,55%,0.7)]" />
        </motion.div>
        <span className="text-2xl font-bold tracking-tight text-foreground">YTFetch</span>
      </Link>

      {/* Desktop Nav */}
      <nav className="hidden items-center gap-1 md:flex">
        <DropdownMenu label="Downloaders" links={downloaderLinks} pathname={location.pathname} />
        <DropdownMenu label="Pages" links={pageLinks} pathname={location.pathname} />
      </nav>

      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:hidden"
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      <MobileMenu open={mobileOpen} onClose={() => setMobileOpen(false)} pathname={location.pathname} />
    </motion.header>
  );
};

const MobileMenu = ({ open, onClose, pathname }: { open: boolean; onClose: () => void; pathname: string }) => {
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
        <Link to="/" onClick={onClose} className="flex items-center gap-2.5">
          <Youtube className="h-8 w-8 text-primary" />
          <span className="text-2xl font-bold tracking-tight text-foreground">YTFetch</span>
        </Link>
        <button onClick={onClose} className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground">
          <X className="h-5 w-5" />
        </button>
      </div>
      <nav className="flex flex-col gap-1 px-6 pt-2">
        {/* Downloaders group */}
        <button
          onClick={() => toggleGroup("downloaders")}
          className="flex items-center justify-between rounded-lg px-4 py-3 text-sm font-semibold text-foreground"
        >
          Downloaders
          <ChevronDown className={`h-4 w-4 transition-transform ${expandedGroup === "downloaders" ? "rotate-180" : ""}`} />
        </button>
        {expandedGroup === "downloaders" &&
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

        {/* Pages group */}
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
    </motion.div>,
    document.body
  );
};

export default Header;
