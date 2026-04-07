import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  User, Camera, Lock, Eye, BarChart3, Bell, CheckCircle, AlertTriangle,
  Loader2, Save, ChevronRight, Shield, Calendar, Mail, Activity
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

const Profile = () => {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "security" | "notifications">("overview");
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [uploading, setUploading] = useState(false);

  // Get current user
  const { data: session } = useQuery({
    queryKey: ["user-session"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  const userId = session?.user?.id;
  const userEmail = session?.user?.email;

  // Fetch profile
  const { data: profile, isLoading: profileLoading } = useQuery({
    queryKey: ["user-profile", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", userId!)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  // Fetch page views for this user
  const { data: pageViewStats } = useQuery({
    queryKey: ["user-page-views", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("page_views")
        .select("*")
        .eq("user_id", userId!);
      if (error) throw error;

      const totalViews = data?.length || 0;
      const uniquePaths = new Set(data?.map((v) => v.path)).size;
      
      // Calculate bounce rate: sessions with only 1 page view
      const sessionMap = new Map<string, number>();
      data?.forEach((v) => {
        const sid = v.session_id || v.id;
        sessionMap.set(sid, (sessionMap.get(sid) || 0) + 1);
      });
      const totalSessions = sessionMap.size;
      const bounceSessions = Array.from(sessionMap.values()).filter((c) => c === 1).length;
      const bounceRate = totalSessions > 0 ? Math.round((bounceSessions / totalSessions) * 100) : 0;

      return { totalViews, uniquePaths, totalSessions, bounceRate };
    },
    enabled: !!userId,
  });

  // Fetch notifications
  const { data: notifications } = useQuery({
    queryKey: ["user-notifications", userId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return data;
    },
    enabled: !!userId,
  });

  const unreadCount = notifications?.filter((n) => !n.is_read).length || 0;

  // Update profile name
  const updateName = useMutation({
    mutationFn: async (name: string) => {
      const { error } = await supabase
        .from("profiles")
        .update({ full_name: name, updated_at: new Date().toISOString() })
        .eq("id", userId!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Name updated");
      setEditingName(false);
      qc.invalidateQueries({ queryKey: ["user-profile"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Change password
  const changePassword = useMutation({
    mutationFn: async () => {
      if (newPassword !== confirmPassword) throw new Error("Passwords don't match");
      if (newPassword.length < 6) throw new Error("Password must be at least 6 characters");
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Password updated successfully");
      setNewPassword("");
      setConfirmPassword("");
    },
    onError: (err: any) => toast.error(err.message),
  });

  // Upload avatar
  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be under 2MB");
      return;
    }

    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${userId}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(path, file, { upsert: true });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);

      await supabase
        .from("profiles")
        .update({ avatar_url: urlData.publicUrl + "?t=" + Date.now(), updated_at: new Date().toISOString() })
        .eq("id", userId);

      toast.success("Avatar updated");
      qc.invalidateQueries({ queryKey: ["user-profile"] });
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setUploading(false);
    }
  };

  // Mark notification as read
  const markRead = useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("notifications").update({ is_read: true }).eq("id", id);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user-notifications"] }),
  });

  useEffect(() => {
    if (profile) setNewName(profile.full_name || "");
  }, [profile]);

  if (!session) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-32">
          <div className="text-center">
            <User className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
            <p className="text-lg font-semibold text-foreground">Please sign in to view your profile</p>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  const bounceRate = pageViewStats?.bounceRate ?? 0;
  const bounceWarning = bounceRate > 20;

  const tabs = [
    { id: "overview" as const, label: "Overview", icon: User },
    { id: "security" as const, label: "Security", icon: Lock },
    { id: "notifications" as const, label: `Notifications ${unreadCount > 0 ? `(${unreadCount})` : ""}`, icon: Bell },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        {/* Profile Card — LinkedIn style */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative mb-6 overflow-hidden rounded-2xl border border-border/50 bg-card"
        >
          {/* Cover Banner */}
          <div className="h-32 bg-gradient-to-r from-primary/30 via-primary/10 to-accent/20 sm:h-40" />

          {/* Avatar + Basic Info */}
          <div className="relative px-6 pb-6">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-end">
              {/* Avatar */}
              <div className="relative -mt-14 sm:-mt-16">
                <div className="relative h-24 w-24 overflow-hidden rounded-2xl border-4 border-card bg-muted shadow-xl sm:h-28 sm:w-28">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-primary/10">
                      <User className="h-10 w-10 text-primary" />
                    </div>
                  )}
                  {uploading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-background/60">
                      <Loader2 className="h-6 w-6 animate-spin text-primary" />
                    </div>
                  )}
                </div>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="absolute -bottom-1 -right-1 flex h-8 w-8 items-center justify-center rounded-full border-2 border-card bg-primary text-primary-foreground shadow-lg transition-transform hover:scale-110"
                >
                  <Camera className="h-3.5 w-3.5" />
                </button>
                <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} />
              </div>

              {/* Name + Email */}
              <div className="flex-1 pt-2">
                {editingName ? (
                  <div className="flex items-center gap-2">
                    <Input
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      className="h-9 w-60 bg-muted/50"
                      placeholder="Your name"
                    />
                    <Button size="sm" onClick={() => updateName.mutate(newName)} disabled={updateName.isPending}>
                      <Save className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <h1
                    onClick={() => setEditingName(true)}
                    className="cursor-pointer text-xl font-bold text-foreground hover:text-primary transition-colors sm:text-2xl"
                  >
                    {profile?.full_name || "Click to add name"}
                  </h1>
                )}
                <div className="mt-1 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Mail className="h-3.5 w-3.5" /> {userEmail}
                  </span>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-3.5 w-3.5" /> Joined {new Date(profile?.created_at || "").toLocaleDateString()}
                  </span>
                  <span className="flex items-center gap-1">
                    <Shield className="h-3.5 w-3.5 text-green-500" /> Member
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Bounce Rate Warning */}
        <AnimatePresence>
          {bounceWarning && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="mb-6 flex items-start gap-3 rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4"
            >
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-500" />
              <div>
                <p className="text-sm font-semibold text-yellow-500">High Bounce Rate Warning</p>
                <p className="text-xs text-muted-foreground">
                  Your bounce rate is {bounceRate}% which exceeds the 20% threshold. 
                  Accounts with consistently high bounce rates may be suspended. 
                  Please engage more with the platform to avoid suspension.
                </p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats Cards */}
        <div className="mb-6 grid gap-3 grid-cols-2 sm:grid-cols-4">
          {[
            { label: "Total Visits", value: pageViewStats?.totalSessions ?? 0, icon: Eye, color: "text-blue-500 bg-blue-500/10" },
            { label: "Page Views", value: pageViewStats?.totalViews ?? 0, icon: BarChart3, color: "text-primary bg-primary/10" },
            { label: "Pages Visited", value: pageViewStats?.uniquePaths ?? 0, icon: Activity, color: "text-green-500 bg-green-500/10" },
            {
              label: "Bounce Rate",
              value: `${bounceRate}%`,
              icon: AlertTriangle,
              color: bounceWarning ? "text-yellow-500 bg-yellow-500/10" : "text-emerald-500 bg-emerald-500/10",
            },
          ].map((stat, i) => (
            <motion.div
              key={stat.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="rounded-xl border border-border/50 bg-card p-4"
            >
              <div className={`mb-2 flex h-9 w-9 items-center justify-center rounded-lg ${stat.color}`}>
                <stat.icon className="h-4 w-4" />
              </div>
              <p className="text-xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-1 rounded-xl border border-border/50 bg-card p-1">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-primary text-primary-foreground shadow-sm"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              <tab.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <AnimatePresence mode="wait">
          {activeTab === "overview" && (
            <motion.div
              key="overview"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              className="space-y-4"
            >
              <div className="rounded-xl border border-border/50 bg-card p-6">
                <h3 className="mb-4 text-lg font-semibold text-foreground">Profile Information</h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between rounded-lg bg-muted/30 px-4 py-3">
                    <div>
                      <p className="text-xs text-muted-foreground">Full Name</p>
                      <p className="text-sm font-medium text-foreground">{profile?.full_name || "Not set"}</p>
                    </div>
                    <Button variant="ghost" size="sm" onClick={() => setEditingName(true)}>Edit</Button>
                  </div>
                  <div className="rounded-lg bg-muted/30 px-4 py-3">
                    <p className="text-xs text-muted-foreground">Email Address</p>
                    <p className="text-sm font-medium text-foreground">{userEmail}</p>
                  </div>
                  <div className="rounded-lg bg-muted/30 px-4 py-3">
                    <p className="text-xs text-muted-foreground">Account Status</p>
                    <div className="flex items-center gap-2">
                      {profile?.is_suspended ? (
                        <span className="flex items-center gap-1 text-sm font-medium text-destructive">
                          <AlertTriangle className="h-3.5 w-3.5" /> Suspended
                        </span>
                      ) : (
                        <span className="flex items-center gap-1 text-sm font-medium text-green-500">
                          <CheckCircle className="h-3.5 w-3.5" /> Active
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="rounded-lg bg-muted/30 px-4 py-3">
                    <p className="text-xs text-muted-foreground">Member Since</p>
                    <p className="text-sm font-medium text-foreground">
                      {new Date(profile?.created_at || "").toLocaleDateString("en-US", {
                        year: "numeric", month: "long", day: "numeric"
                      })}
                    </p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "security" && (
            <motion.div
              key="security"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              className="rounded-xl border border-border/50 bg-card p-6"
            >
              <h3 className="mb-4 text-lg font-semibold text-foreground">Change Password</h3>
              <div className="max-w-md space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">New Password</label>
                  <Input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="••••••••"
                    className="bg-muted/30"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Confirm Password</label>
                  <Input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="••••••••"
                    className="bg-muted/30"
                  />
                </div>
                <Button
                  onClick={() => changePassword.mutate()}
                  disabled={changePassword.isPending || !newPassword || !confirmPassword}
                  className="gap-2"
                >
                  {changePassword.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                  Update Password
                </Button>
              </div>
            </motion.div>
          )}

          {activeTab === "notifications" && (
            <motion.div
              key="notifications"
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 12 }}
              className="rounded-xl border border-border/50 bg-card p-6"
            >
              <h3 className="mb-4 text-lg font-semibold text-foreground">Notifications</h3>
              {!notifications?.length ? (
                <div className="py-8 text-center">
                  <Bell className="mx-auto mb-3 h-8 w-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">No notifications yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {notifications.map((n, i) => (
                    <motion.div
                      key={n.id}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      onClick={() => !n.is_read && markRead.mutate(n.id)}
                      className={`cursor-pointer rounded-lg border p-4 transition-colors ${
                        n.is_read
                          ? "border-border/30 bg-muted/10"
                          : "border-primary/30 bg-primary/5 hover:bg-primary/10"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            {!n.is_read && <div className="h-2 w-2 rounded-full bg-primary" />}
                            <p className="text-sm font-semibold text-foreground">{n.title}</p>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">{n.message}</p>
                        </div>
                        <span className="shrink-0 text-[10px] text-muted-foreground">
                          {new Date(n.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <Footer />
    </div>
  );
};

export default Profile;
