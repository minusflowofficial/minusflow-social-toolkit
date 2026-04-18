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
import TranscriptHome from "./pages/TranscriptHome.tsx";
import TranscriptView from "./pages/TranscriptView.tsx";
import TranscriptHistory from "./pages/TranscriptHistory.tsx";
import ThumbnailDownloader from "./pages/ThumbnailDownloader.tsx";
import AdminLogin from "./pages/AdminLogin.tsx";
import AdminLayout from "./components/admin/AdminLayout.tsx";
import AdminDashboard from "./pages/admin/AdminDashboard.tsx";
import AdminTools from "./pages/admin/AdminTools.tsx";
import AdminSettings from "./pages/admin/AdminSettings.tsx";
import AdminUsers from "./pages/admin/AdminUsers.tsx";
import AdminAnalytics from "./pages/admin/AdminAnalytics.tsx";
import AdminLogs from "./pages/admin/AdminLogs.tsx";
import AdminProfiles from "./pages/admin/AdminProfiles.tsx";

// Split tool pages
import YouTubeSingleDownloader from "./pages/YouTubeSingleDownloader.tsx";
import YouTubeBulkDownloader from "./pages/YouTubeBulkDownloader.tsx";
import YouTubePlaylistDownloader from "./pages/YouTubePlaylistDownloader.tsx";
import TikTokSingleDownloader from "./pages/TikTokSingleDownloader.tsx";
import TikTokBulkDownloader from "./pages/TikTokBulkDownloader.tsx";
import InstagramSingleDownloader from "./pages/InstagramSingleDownloader.tsx";
import InstagramBulkDownloader from "./pages/InstagramBulkDownloader.tsx";
import FacebookSingleDownloader from "./pages/FacebookSingleDownloader.tsx";
import FacebookBulkDownloader from "./pages/FacebookBulkDownloader.tsx";

import DouyinSingleDownloader from "./pages/DouyinSingleDownloader.tsx";
import DouyinBulkDownloader from "./pages/DouyinBulkDownloader.tsx";
import SignIn from "./pages/SignIn.tsx";
import SignUp from "./pages/SignUp.tsx";
import AuthGuardLayout from "./components/AuthGuardLayout.tsx";
import Profile from "./pages/Profile.tsx";
import IntegrationsHead from "./components/IntegrationsHead.tsx";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <IntegrationsHead />
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

          {/* Individual tool pages — no auth required */}
          <Route path="/youtube-downloader" element={<YouTubeSingleDownloader />} />
          <Route path="/youtube-bulk-downloader" element={<YouTubeBulkDownloader />} />
          <Route path="/youtube-playlist-downloader" element={<YouTubePlaylistDownloader />} />
          <Route path="/tiktok-downloader" element={<TikTokSingleDownloader />} />
          <Route path="/tiktok-bulk-downloader" element={<TikTokBulkDownloader />} />
          <Route path="/instagram-downloader" element={<InstagramSingleDownloader />} />
          <Route path="/instagram-bulk-downloader" element={<InstagramBulkDownloader />} />
          <Route path="/facebook-downloader" element={<FacebookSingleDownloader />} />
          <Route path="/facebook-bulk-downloader" element={<FacebookBulkDownloader />} />
          
          <Route path="/douyin-downloader" element={<DouyinSingleDownloader />} />
          <Route path="/douyin-bulk-downloader" element={<DouyinBulkDownloader />} />
          <Route path="/transcript" element={<TranscriptHome />} />
          <Route path="/transcript/:videoId" element={<TranscriptView />} />
          <Route path="/transcript-history" element={<TranscriptHistory />} />
          <Route path="/thumbnail" element={<ThumbnailDownloader />} />

          {/* Legacy routes */}
          <Route path="/tiktok" element={<TikTokDownloader />} />
          <Route path="/instagram" element={<InstagramDownloader />} />

          {/* Admin routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route path="/admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="tools" element={<AdminTools />} />
            <Route path="analytics" element={<AdminAnalytics />} />
            <Route path="logs" element={<AdminLogs />} />
            <Route path="users" element={<AdminUsers />} />
            <Route path="profiles" element={<AdminProfiles />} />
            <Route path="settings" element={<AdminSettings />} />
          </Route>
          {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
          <Route path="*" element={<NotFound />} />
        </Routes>
      </BrowserRouter>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
