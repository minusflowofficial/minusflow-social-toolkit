import { motion, AnimatePresence } from "framer-motion";
import { Youtube, Menu, X } from "lucide-react";
import { Link, useLocation } from "react-router-dom";
import { useState } from "react";
import { createPortal } from "react-dom";

const navLinks = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About Us" },
  { to: "/contact", label: "Contact Us" },
  { to: "/privacy", label: "Privacy Policy" },
  { to: "/terms", label: "Terms & Conditions" },
  { to: "/dmca", label: "DMCA" },
  { to: "/disclaimer", label: "Disclaimer" },
];

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
      {/* Logo */}
      <Link to="/" className="flex items-center gap-2.5 group">
        <motion.div
          animate={{ rotate: [0, 5, -5, 0] }}
          transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        >
          <Youtube className="h-8 w-8 text-primary drop-shadow-[0_0_12px_hsl(0,85%,55%,0.5)] transition-all duration-300 group-hover:drop-shadow-[0_0_20px_hsl(0,85%,55%,0.7)]" />
        </motion.div>
        <span className="text-2xl font-bold tracking-tight text-foreground">
          YTFetch
        </span>
      </Link>

      {/* Desktop Nav */}
      <nav className="hidden items-center gap-1 md:flex">
        {navLinks.map((link) => {
          const isActive = location.pathname === link.to;
          return (
            <Link
              key={link.to}
              to={link.to}
              className={`relative rounded-lg px-3.5 py-2 text-sm font-medium transition-colors duration-200 ${
                isActive
                  ? "text-primary"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {link.label}
              {isActive && (
                <motion.div
                  layoutId="nav-underline"
                  className="absolute bottom-0 left-1/2 h-0.5 w-5 -translate-x-1/2 rounded-full bg-primary"
                  transition={{ type: "spring", stiffness: 500, damping: 30 }}
                />
              )}
            </Link>
          );
        })}
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
  if (!open) return null;
  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex flex-col md:hidden"
      style={{ backgroundColor: 'hsl(0 0% 3%)' }}
    >
      <div className="flex items-center justify-between px-6 py-5">
        <Link to="/" onClick={onClose} className="flex items-center gap-2.5">
          <Youtube className="h-8 w-8 text-primary" />
          <span className="text-2xl font-bold tracking-tight text-foreground">YTFetch</span>
        </Link>
        <button
          onClick={onClose}
          className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground hover:text-foreground"
        >
          <X className="h-5 w-5" />
        </button>
      </div>
      <nav className="flex flex-col gap-1 px-6 pt-2">
        {navLinks.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            onClick={onClose}
            className={`rounded-lg px-4 py-3 text-sm font-medium transition-colors ${
              pathname === link.to
                ? "text-primary bg-primary/10"
                : "text-muted-foreground hover:text-foreground"
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
