import { motion } from "framer-motion";
import { Menu, X, ChevronDown, ChevronRight } from "lucide-react";
import logoImg from "@/assets/logo.png";
import { Link, useLocation } from "react-router-dom";
import { useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import { usePublicTools } from "@/hooks/useTools";
import { trackPageView } from "@/lib/analytics";
import { useSiteSettings } from "@/hooks/useSiteSettings";

const pageLinks = [
  { to: "/about", label: "About Us" },
  { to: "/contact", label: "Contact Us" },
  { to: "/privacy", label: "Privacy Policy" },
  { to: "/terms", label: "Terms & Conditions" },
  { to: "/dmca", label: "DMCA" },
  { to: "/disclaimer", label: "Disclaimer" },
];

interface PlatformGroup {
  platform: string;
  emoji: string;
  links: { to: string; label: string }[];
}

const fallbackGroups: PlatformGroup[] = [
  {
    platform: "YouTube",
    links: [
      { to: "/youtube-downloader", label: "YouTube Video Downloader" },
      { to: "/youtube-bulk-downloader", label: "YouTube Bulk Video Downloader" },
      { to: "/youtube-playlist-downloader", label: "YouTube Playlist Downloader" },
      { to: "/thumbnail", label: "YouTube Thumbnail Download" },
      { to: "/transcript", label: "YouTube Transcript Extractor" },
    ],
  },
  {
    platform: "TikTok",
    links: [
      { to: "/tiktok-downloader", label: "TikTok Video Downloader" },
      { to: "/tiktok-bulk-downloader", label: "TikTok Bulk Video Downloader" },
    ],
  },
  {
    platform: "Instagram",
    links: [
      { to: "/instagram-downloader", label: "Instagram Video Downloader" },
      { to: "/instagram-bulk-downloader", label: "Instagram Bulk Video Downloader" },
    ],
  },
  {
    platform: "Facebook",
    links: [
      { to: "/facebook-downloader", label: "Facebook Video Downloader" },
      { to: "/facebook-bulk-downloader", label: "Facebook Bulk Video Downloader" },
    ],
  },
  {
    platform: "Douyin",
    links: [
      { to: "/douyin-downloader", label: "Douyin Video Downloader" },
      { to: "/douyin-bulk-downloader", label: "Douyin Bulk Video Downloader" },
    ],
  },
];

function groupToolsByPlatform(tools: { name: string; route: string }[]): PlatformGroup[] {
  const platformMap: Record<string, { emoji: string; order: number }> = {
    youtube: { emoji: "🔴", order: 0 },
    tiktok: { emoji: "🎵", order: 1 },
    instagram: { emoji: "📸", order: 2 },
    facebook: { emoji: "🔵", order: 3 },
    douyin: { emoji: "🇨🇳", order: 4 },
  };

  const groups: Record<string, PlatformGroup> = {};
  const other: PlatformGroup = { platform: "Other Tools", emoji: "🛠️", links: [] };

  for (const tool of tools) {
    const slug = tool.route.toLowerCase();
    let matched = false;
    for (const [key, meta] of Object.entries(platformMap)) {
      if (slug.includes(key)) {
        if (!groups[key]) {
          const displayName = key.charAt(0).toUpperCase() + key.slice(1);
          groups[key] = {
            platform: displayName === "Youtube" ? "YouTube" : displayName === "Tiktok" ? "TikTok" : displayName,
            emoji: meta.emoji,
            links: [],
          };
        }
        const shortLabel = tool.name
          .replace(/youtube\s*/i, "").replace(/tiktok\s*/i, "").replace(/instagram\s*/i, "")
          .replace(/facebook\s*/i, "").replace(/douyin\s*/i, "").trim() || tool.name;
        groups[key].links.push({ to: tool.route, label: shortLabel });
        matched = true;
        break;
      }
    }
    if (!matched) {
      other.links.push({ to: tool.route, label: tool.name });
    }
  }

  const sorted = Object.entries(groups)
    .sort(([a], [b]) => (platformMap[a]?.order ?? 99) - (platformMap[b]?.order ?? 99))
    .map(([, g]) => g);

  if (other.links.length) sorted.push(other);
  return sorted;
}

/** Individual platform dropdown for desktop */
const PlatformDropdown = ({ group, pathname }: { group: PlatformGroup; pathname: string }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const isActive = group.links.some((l) => l.to === pathname);

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
        className={`flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200 ${
          isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <span className="text-base leading-none">{group.emoji}</span>
        {group.platform}
        <ChevronDown className={`h-3 w-3 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.15 }}
          className="absolute left-0 top-full z-50 mt-1 min-w-[190px] rounded-xl border border-white/10 bg-card/95 p-1.5 shadow-xl backdrop-blur-xl"
        >
          {group.links.map((link) => (
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

const SimpleDropdown = ({ label, links, pathname }: { label: string; links: { to: string; label: string }[]; pathname: string }) => {
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
        className={`flex items-center gap-1 rounded-lg px-3 py-2 text-sm font-medium transition-colors duration-200 ${
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
  const { data: tools } = usePublicTools();
  const { data: settings } = useSiteSettings();

  useEffect(() => {
    trackPageView(location.pathname);
  }, [location.pathname]);

  const platformGroups = tools?.length ? groupToolsByPlatform(tools) : fallbackGroups;

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

      {/* Desktop Nav — each platform is its own dropdown */}
      <div className="hidden items-center gap-0.5 md:flex">
        <nav className="flex items-center gap-0.5">
          {platformGroups.map((group) => (
            <PlatformDropdown key={group.platform} group={group} pathname={location.pathname} />
          ))}
          <SimpleDropdown label="Pages" links={pageLinks} pathname={location.pathname} />
        </nav>
      </div>

      {/* Mobile toggle */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="flex h-9 w-9 items-center justify-center rounded-lg text-muted-foreground transition-colors hover:text-foreground md:hidden"
      >
        {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
      </button>

      <MobileMenu open={mobileOpen} onClose={() => setMobileOpen(false)} pathname={location.pathname} groups={platformGroups} />
    </motion.header>
  );
};

const MobileMenu = ({ open, onClose, pathname, groups }: { open: boolean; onClose: () => void; pathname: string; groups: PlatformGroup[] }) => {
  const [expandedGroup, setExpandedGroup] = useState<string | null>(null);

  if (!open) return null;

  const toggleGroup = (group: string) => setExpandedGroup(expandedGroup === group ? null : group);

  return createPortal(
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[9999] flex flex-col md:hidden overflow-y-auto"
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

      <nav className="flex flex-1 flex-col gap-0.5 px-6 pt-2 pb-8">
        {groups.map((group) => (
          <div key={group.platform}>
            <button
              onClick={() => toggleGroup(group.platform)}
              className="flex w-full items-center justify-between rounded-lg px-4 py-3 text-sm font-semibold text-foreground hover:bg-white/5 transition-colors"
            >
              <span>{group.emoji} {group.platform}</span>
              <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${expandedGroup === group.platform ? "rotate-90" : ""}`} />
            </button>
            {expandedGroup === group.platform &&
              group.links.map((link) => (
                <Link
                  key={link.to}
                  to={link.to}
                  onClick={onClose}
                  className={`block rounded-lg px-8 py-2.5 text-sm font-medium transition-colors ${
                    pathname === link.to ? "text-primary bg-primary/10" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {link.label}
                </Link>
              ))}
          </div>
        ))}

        <div className="my-2 h-px bg-white/5" />

        {pageLinks.map((link) => (
          <Link
            key={link.to}
            to={link.to}
            onClick={onClose}
            className={`rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
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
