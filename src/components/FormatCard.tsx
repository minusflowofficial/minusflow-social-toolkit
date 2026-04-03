import { useState } from "react";
import { Download, Check } from "lucide-react";
import { motion } from "framer-motion";

import { triggerDownload } from "@/lib/download-manager";

interface FormatCardProps {
  format: string;
  resolution: string;
  fileSize: string;
  extension: string;
  downloadUrl: string;
  fileName?: string;
  isRecommended?: boolean;
}

const FormatCard = ({
  format,
  resolution,
  fileSize,
  extension,
  downloadUrl,
  fileName,
  isRecommended,
}: FormatCardProps) => {
  const [clicked, setClicked] = useState(false);
  const downloadName = (fileName || `MinusFlow.net_${format}.${extension}`).replace(
    /YTDown\.com/gi,
    "MinusFlow.net"
  );

  const handleDownload = (event: React.MouseEvent<HTMLAnchorElement>) => {
    event.preventDefault();
    setClicked(true);

    triggerDownload({ url: downloadUrl, fileName: downloadName });

    setTimeout(() => setClicked(false), 1500);
  };

  return (
    <motion.a
      href={downloadUrl}
      download={downloadName}
      onClick={handleDownload}
      whileHover={{ y: -4, scale: 1.01 }}
      whileTap={{ scale: 0.98 }}
      transition={{ type: "spring", stiffness: 400, damping: 25 }}
      className={`glass tap-feedback group flex items-center justify-between rounded-xl p-4 transition-all duration-300 hover:shadow-[var(--shadow-glow)] ${
        isRecommended ? "breathing-border border-primary/40" : ""
      } ${clicked ? "success-pulse" : ""}`}
    >
      <div className="flex items-center gap-3">
        <span className="inline-flex items-center rounded-lg bg-primary/15 px-2.5 py-1 font-mono text-xs font-semibold uppercase text-primary">
          {extension}
        </span>
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium text-foreground">{resolution}</p>
            {isRecommended && (
              <span className="rounded-full bg-primary/20 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-primary">
                Best
              </span>
            )}
          </div>
          <p className="text-sm text-muted-foreground">{fileSize}</p>
        </div>
      </div>
      <motion.div
        whileHover={{ scale: 1.15 }}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
        className={`flex h-9 w-9 items-center justify-center rounded-lg transition-all duration-300 ${
          clicked
            ? "bg-green-500 text-white"
            : "bg-primary text-primary-foreground opacity-80 group-hover:opacity-100 group-hover:shadow-[0_0_15px_hsl(0,85%,55%,0.4)]"
        }`}
      >
        {clicked ? <Check className="h-4 w-4" /> : <Download className="h-4 w-4" />}
      </motion.div>
    </motion.a>
  );
};

export default FormatCard;
