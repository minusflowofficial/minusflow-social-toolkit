import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import Index from "./pages/Index.tsx";
import About from "./pages/About.tsx";
import Contact from "./pages/Contact.tsx";
import Privacy from "./pages/Privacy.tsx";
import Terms from "./pages/Terms.tsx";
import DMCA from "./pages/DMCA.tsx";
import Disclaimer from "./pages/Disclaimer.tsx";
import TikTokDownloader from "./pages/TikTokDownloader.tsx";
import InstagramDownloader from "./pages/InstagramDownloader.tsx";
import NotFound from "./pages/NotFound.tsx";
import TranscriptGenerator from "./pages/TranscriptGenerator.tsx";
import ThumbnailDownloader from "./pages/ThumbnailDownloader.tsx";
import BulkTranscript from "./pages/BulkTranscript.tsx";
import TranscriptHistory from "./pages/TranscriptHistory.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <Toaster />
      <Sonner />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Index />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<Contact />} />
          <Route path="/privacy" element={<Privacy />} />
          <Route path="/terms" element={<Terms />} />
          <Route path="/dmca" element={<DMCA />} />
          <Route path="/disclaimer" element={<Disclaimer />} />
          <Route path="/tiktok" element={<TikTokDownloader />} />
          <Route path="/instagram" element={<InstagramDownloader />} />
          <Route path="/transcript" element={<TranscriptGenerator />} />
          <Route path="/thumbnail" element={<ThumbnailDownloader />} />
          <Route path="/bulk-transcript" element={<BulkTranscript />} />
          <Route path="/transcript-history" element={<TranscriptHistory />} />
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
