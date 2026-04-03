import { motion } from "framer-motion";
import { Youtube, Heart } from "lucide-react";
import { Link } from "react-router-dom";

const footerLinks = [
  { to: "/about", label: "About Us" },
  { to: "/contact", label: "Contact Us" },
  { to: "/privacy", label: "Privacy Policy" },
  { to: "/terms", label: "Terms & Conditions" },
  { to: "/dmca", label: "DMCA" },
  { to: "/disclaimer", label: "Disclaimer" },
];

const Footer = () => (
  <motion.footer
    initial={{ opacity: 0 }}
    whileInView={{ opacity: 1 }}
    viewport={{ once: true }}
    transition={{ duration: 0.6 }}
    className="relative z-10 border-t border-border/30 px-6 py-10 md:px-10"
  >
    <div className="mx-auto max-w-4xl">
      {/* Top row */}
      <div className="flex flex-col items-center gap-6 md:flex-row md:justify-between">
        <Link to="/" className="flex items-center gap-2 group">
          <Youtube className="h-5 w-5 text-primary" />
          <span className="text-lg font-bold text-foreground">YTFetch</span>
        </Link>

        <p className="flex items-center gap-1 text-xs text-muted-foreground">
          Made with <Heart className="h-3 w-3 text-primary" /> by{" "}
          <a
            href="https://minusflow.net"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-foreground hover:text-primary transition-colors"
          >
            MinusFlow.net
          </a>
        </p>
      </div>

      {/* Links grid */}
      <nav className="mt-6 flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm">
        {footerLinks.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            {link.label}
          </Link>
        ))}
      </nav>

      <p className="mt-6 text-center text-xs text-muted-foreground/60">
        Free tool, for personal use only. © {new Date().getFullYear()} YTFetch
      </p>
    </div>
  </motion.footer>
);

export default Footer;
