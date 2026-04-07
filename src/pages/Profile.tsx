import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  User, Camera, Lock, Eye, BarChart3, Bell, CheckCircle, AlertTriangle,
  Loader2, Save, Shield, Calendar, Mail, Activity, MapPin, Globe, Briefcase,
  Plus, X, Sparkles, Image as ImageIcon, Play, ImagePlus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import Header from "@/components/Header";
import Footer from "@/components/Footer";

interface ExperienceItem {
  title: string;
  company: string;
  duration: string;
  description: string;
}

const Profile = () => {
  const qc = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "security" | "notifications">("overview");
  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);

  const [editingBio, setEditingBio] = useState(false);
  const [bio, setBio] = useState("");
  const [editingHeadline, setEditingHeadline] = useState(false);
  const [headline, setHeadline] = useState("");
  const [editingLocation, setEditingLocation] = useState(false);
  const [location, setLocation] = useState("");
  const [editingWebsite, setEditingWebsite] = useState(false);
  const [website, setWebsite] = useState("");
  const [editingSkills, setEditingSkills] = useState(false);
  const [skills, setSkills] = useState<string[]>([]);
  const [newSkill, setNewSkill] = useState("");
  const [editingExperience, setEditingExperience] = useState(false);
  const [experience, setExperience] = useState<ExperienceItem[]>([]);
  const [newExp, setNewExp] = useState<ExperienceItem>({ title: "", company: "", duration: "", description: "" });

  const { data: session } = useQuery({
    queryKey: ["user-session"],
    queryFn: async () => {
      const { data } = await supabase.auth.getSession();
      return data.session;
    },
  });

  const userId = session?.user?.id;
  const userEmail = session?.user?.email;

  const { data: profile } = useQuery({
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

  // Realtime profile subscription
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`profile-realtime-${userId}`)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` }, () => {
        qc.invalidateQueries({ queryKey: ["user-profile", userId] });
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, qc]);

  // Realtime notifications subscription
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`notifications-realtime-${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'notifications', filter: `user_id=eq.${userId}` }, () => {
        qc.invalidateQueries({ queryKey: ["user-notifications", userId] });
        toast.info("You have a new notification!");
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId, qc]);

  const { data: pageViewStats } = useQuery({
    queryKey: ["user-page-views", userId],
    queryFn: async () => {
      const { data } = await supabase.from("page_views").select("*").eq("user_id", userId!);
      const totalViews = data?.length || 0;
      const uniquePaths = new Set(data?.map((v) => v.path)).size;
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

  const { data: notifications } = useQuery({
    queryKey: ["user-notifications", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", userId!)
        .order("created_at", { ascending: false })
        .limit(20);
      return data || [];
    },
    enabled: !!userId,
  });

  const unreadCount = notifications?.filter((n) => !n.is_read).length || 0;

  const saveField = useMutation({
    mutationFn: async (fields: Record<string, any>) => {
      const { error } = await supabase.from("profiles").update({ ...fields, updated_at: new Date().toISOString() }).eq("id", userId!);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profile updated");
      qc.invalidateQueries({ queryKey: ["user-profile"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const changePassword = useMutation({
    mutationFn: async () => {
      if (newPassword !== confirmPassword) throw new Error("Passwords don't match");
      if (newPassword.length < 6) throw new Error("Min 6 characters");
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Password updated"); setNewPassword(""); setConfirmPassword(""); },
    onError: (err: any) => toast.error(err.message),
  });

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    if (file.size > 2 * 1024 * 1024) { toast.error("Max 2MB"); return; }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${userId}/avatar.${ext}`;
      await supabase.storage.from("avatars").upload(path, file, { upsert: true });
      const { data: urlData } = supabase.storage.from("avatars").getPublicUrl(path);
      await supabase.from("profiles").update({ avatar_url: urlData.publicUrl + "?t=" + Date.now(), updated_at: new Date().toISOString() }).eq("id", userId);
      toast.success("Avatar updated");
      qc.invalidateQueries({ queryKey: ["user-profile"] });
    } catch (err: any) { toast.error(err.message); }
    finally { setUploading(false); }
  };

  const handleBannerUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;
    if (file.size > 5 * 1024 * 1024) { toast.error("Max 5MB"); return; }
    setUploadingBanner(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${userId}/banner.${ext}`;
      await supabase.storage.from("banners").upload(path, file, { upsert: true });
      const { data: urlData } = supabase.storage.from("banners").getPublicUrl(path);
      await supabase.from("profiles").update({ banner_url: urlData.publicUrl + "?t=" + Date.now(), updated_at: new Date().toISOString() }).eq("id", userId);
      toast.success("Banner updated");
      qc.invalidateQueries({ queryKey: ["user-profile"] });
    } catch (err: any) { toast.error(err.message); }
    finally { setUploadingBanner(false); }
  };

  const markRead = useMutation({
    mutationFn: async (id: string) => { await supabase.from("notifications").update({ is_read: true }).eq("id", id); },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["user-notifications"] }),
  });

  useEffect(() => {
    if (profile) {
      setNewName(profile.full_name || "");
      setBio((profile as any).bio || "");
      setHeadline((profile as any).headline || "");
      setLocation((profile as any).location || "");
      setWebsite((profile as any).website || "");
      setSkills((profile as any).skills || []);
      try { setExperience(JSON.parse(JSON.stringify((profile as any).experience || []))); } catch { setExperience([]); }
    }
  }, [profile]);

  if (!session) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <div className="flex items-center justify-center py-32">
          <User className="mx-auto mb-4 h-12 w-12 text-muted-foreground/40" />
          <p className="text-lg font-semibold text-foreground">Please sign in to view your profile</p>
        </div>
        <Footer />
      </div>
    );
  }

  const bounceRate = pageViewStats?.bounceRate ?? 0;
  const bounceWarning = bounceRate > 20;
  const bannerUrl = (profile as any)?.banner_url;

  const tabs = [
    { id: "overview" as const, label: "Overview", icon: User },
    { id: "security" as const, label: "Security", icon: Lock },
    { id: "notifications" as const, label: `Notifications ${unreadCount > 0 ? `(${unreadCount})` : ""}`, icon: Bell },
  ];

  const addSkill = () => {
    if (newSkill.trim() && !skills.includes(newSkill.trim())) {
      const updated = [...skills, newSkill.trim()];
      setSkills(updated);
      setNewSkill("");
      saveField.mutate({ skills: updated });
    }
  };

  const removeSkill = (s: string) => {
    const updated = skills.filter((sk) => sk !== s);
    setSkills(updated);
    saveField.mutate({ skills: updated });
  };

  const addExperience = () => {
    if (!newExp.title.trim() || !newExp.company.trim()) return;
    const updated = [...experience, { ...newExp }];
    setExperience(updated);
    setNewExp({ title: "", company: "", duration: "", description: "" });
    saveField.mutate({ experience: updated });
  };

  const removeExperience = (idx: number) => {
    const updated = experience.filter((_, i) => i !== idx);
    setExperience(updated);
    saveField.mutate({ experience: updated });
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        {/* Profile Card */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative mb-6 overflow-hidden rounded-2xl border border-border/50 bg-card">
          <div className="relative h-36 sm:h-44 overflow-hidden">
            {bannerUrl ? (
              <img src={bannerUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full bg-gradient-to-r from-primary/30 via-primary/10 to-accent/20" />
            )}
            <button
              onClick={() => bannerInputRef.current?.click()}
              className="absolute right-3 top-3 flex items-center gap-1.5 rounded-lg bg-background/70 px-3 py-1.5 text-xs font-medium text-foreground backdrop-blur-sm transition-colors hover:bg-background/90"
            >
              {uploadingBanner ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ImageIcon className="h-3.5 w-3.5" />}
              Edit Banner
            </button>
            <input ref={bannerInputRef} type="file" accept="image/*" className="hidden" onChange={handleBannerUpload} />
          </div>

          <div className="relative px-6 pb-6">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-end">
              <div className="relative -mt-14 sm:-mt-16">
                <div className="relative h-24 w-24 overflow-hidden rounded-2xl border-4 border-card bg-muted shadow-xl sm:h-28 sm:w-28">
                  {profile?.avatar_url ? (
                    <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" />
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

              <div className="flex-1 pt-2">
                {editingName ? (
                  <div className="flex items-center gap-2">
                    <Input value={newName} onChange={(e) => setNewName(e.target.value)} className="h-9 w-60 bg-muted/50" placeholder="Your name" />
                    <Button size="sm" onClick={() => { saveField.mutate({ full_name: newName }); setEditingName(false); }}>
                      <Save className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ) : (
                  <h1 onClick={() => setEditingName(true)} className="cursor-pointer text-xl font-bold text-foreground hover:text-primary transition-colors sm:text-2xl">
                    {profile?.full_name || "Click to add name"}
                  </h1>
                )}

                {editingHeadline ? (
                  <div className="mt-1 flex items-center gap-2">
                    <Input value={headline} onChange={(e) => setHeadline(e.target.value)} className="h-8 w-72 bg-muted/50 text-sm" placeholder="e.g. Full Stack Developer" />
                    <Button size="sm" variant="ghost" onClick={() => { saveField.mutate({ headline }); setEditingHeadline(false); }}>
                      <Save className="h-3 w-3" />
                    </Button>
                  </div>
                ) : (
                  <p onClick={() => setEditingHeadline(true)} className="mt-0.5 cursor-pointer text-sm text-muted-foreground hover:text-foreground transition-colors">
                    {headline || "Click to add headline"}
                  </p>
                )}

                <div className="mt-1.5 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {userEmail}</span>
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Joined {profile?.created_at ? new Date(profile.created_at).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) : "N/A"}</span>
                  {(profile as any)?.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {(profile as any).location}</span>}
                  <span className="flex items-center gap-1">
                    <Shield className="h-3 w-3 text-green-500" /> {profile?.is_suspended ? "Suspended" : "Active"}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Bounce Warning */}
        <AnimatePresence>
          {bounceWarning && (
            <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
              className="mb-6 flex items-start gap-3 rounded-xl border border-yellow-500/30 bg-yellow-500/5 p-4">
              <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-yellow-500" />
              <div>
                <p className="text-sm font-semibold text-yellow-500">High Bounce Rate Warning</p>
                <p className="text-xs text-muted-foreground">Your bounce rate is {bounceRate}% (threshold: 20%). Engage more to avoid suspension.</p>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Stats */}
        <div className="mb-6 grid gap-3 grid-cols-2 sm:grid-cols-4">
          {[
            { label: "Total Visits", value: pageViewStats?.totalSessions ?? 0, icon: Eye, color: "text-blue-500 bg-blue-500/10" },
            { label: "Page Views", value: pageViewStats?.totalViews ?? 0, icon: BarChart3, color: "text-primary bg-primary/10" },
            { label: "Pages Visited", value: pageViewStats?.uniquePaths ?? 0, icon: Activity, color: "text-green-500 bg-green-500/10" },
            { label: "Bounce Rate", value: `${bounceRate}%`, icon: AlertTriangle, color: bounceWarning ? "text-yellow-500 bg-yellow-500/10" : "text-emerald-500 bg-emerald-500/10" },
          ].map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="rounded-xl border border-border/50 bg-card p-4">
              <div className={`mb-2 flex h-9 w-9 items-center justify-center rounded-lg ${stat.color}`}><stat.icon className="h-4 w-4" /></div>
              <p className="text-xl font-bold text-foreground">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Tabs */}
        <div className="mb-6 flex gap-1 rounded-xl border border-border/50 bg-card p-1">
          {tabs.map((tab) => (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium transition-all ${
                activeTab === tab.id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
              }`}>
              <tab.icon className="h-4 w-4" />
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        <AnimatePresence mode="wait">
          {activeTab === "overview" && (
            <motion.div key="overview" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }} className="space-y-4">
              {/* Bio */}
              <div className="rounded-xl border border-border/50 bg-card p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> About</h3>
                  <Button variant="ghost" size="sm" onClick={() => setEditingBio(!editingBio)}>
                    {editingBio ? "Cancel" : "Edit"}
                  </Button>
                </div>
                {editingBio ? (
                  <div className="space-y-2">
                    <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={4} placeholder="Tell us about yourself..."
                      className="w-full rounded-lg border border-input bg-muted/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                    <Button size="sm" onClick={() => { saveField.mutate({ bio }); setEditingBio(false); }}>
                      <Save className="mr-1.5 h-3.5 w-3.5" /> Save
                    </Button>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground leading-relaxed">{bio || "No bio added yet. Click Edit to add one."}</p>
                )}
              </div>

              {/* Location & Website */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-border/50 bg-card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> Location</span>
                    <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => setEditingLocation(!editingLocation)}>
                      {editingLocation ? "Cancel" : "Edit"}
                    </Button>
                  </div>
                  {editingLocation ? (
                    <div className="flex gap-2">
                      <Input value={location} onChange={(e) => setLocation(e.target.value)} className="h-8 bg-muted/30 text-sm" placeholder="City, Country" />
                      <Button size="sm" className="h-8" onClick={() => { saveField.mutate({ location }); setEditingLocation(false); }}>
                        <Save className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm font-medium text-foreground">{location || "Not set"}</p>
                  )}
                </div>
                <div className="rounded-xl border border-border/50 bg-card p-4">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-muted-foreground flex items-center gap-1"><Globe className="h-3 w-3" /> Website</span>
                    <Button variant="ghost" size="sm" className="h-6 text-[10px]" onClick={() => setEditingWebsite(!editingWebsite)}>
                      {editingWebsite ? "Cancel" : "Edit"}
                    </Button>
                  </div>
                  {editingWebsite ? (
                    <div className="flex gap-2">
                      <Input value={website} onChange={(e) => setWebsite(e.target.value)} className="h-8 bg-muted/30 text-sm" placeholder="https://..." />
                      <Button size="sm" className="h-8" onClick={() => { saveField.mutate({ website }); setEditingWebsite(false); }}>
                        <Save className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <p className="text-sm font-medium text-foreground">{website ? <a href={website} target="_blank" rel="noopener" className="text-primary hover:underline">{website}</a> : "Not set"}</p>
                  )}
                </div>
              </div>

              {/* Skills */}
              <div className="rounded-xl border border-border/50 bg-card p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Skills</h3>
                  <Button variant="ghost" size="sm" onClick={() => setEditingSkills(!editingSkills)}>
                    {editingSkills ? "Done" : "Edit"}
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2">
                  {skills.map((s) => (
                    <motion.span key={s} layout initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                      className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                      {s}
                      {editingSkills && (
                        <button onClick={() => removeSkill(s)} className="ml-0.5 text-primary/60 hover:text-destructive"><X className="h-3 w-3" /></button>
                      )}
                    </motion.span>
                  ))}
                  {skills.length === 0 && !editingSkills && <p className="text-xs text-muted-foreground">No skills added yet.</p>}
                </div>
                {editingSkills && (
                  <div className="mt-3 flex gap-2">
                    <Input value={newSkill} onChange={(e) => setNewSkill(e.target.value)} onKeyDown={(e) => e.key === "Enter" && addSkill()}
                      className="h-8 bg-muted/30 text-sm" placeholder="Add a skill" />
                    <Button size="sm" className="h-8" onClick={addSkill}><Plus className="h-3.5 w-3.5" /></Button>
                  </div>
                )}
              </div>

              {/* Experience */}
              <div className="rounded-xl border border-border/50 bg-card p-6">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Briefcase className="h-4 w-4 text-primary" /> Experience</h3>
                  <Button variant="ghost" size="sm" onClick={() => setEditingExperience(!editingExperience)}>
                    {editingExperience ? "Done" : "Add"}
                  </Button>
                </div>
                <div className="space-y-3">
                  {experience.map((exp, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
                      className="relative rounded-lg bg-muted/20 p-4 border border-border/30">
                      {editingExperience && (
                        <button onClick={() => removeExperience(i)} className="absolute right-2 top-2 text-muted-foreground hover:text-destructive">
                          <X className="h-4 w-4" />
                        </button>
                      )}
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0">
                          <Briefcase className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-foreground">{exp.title}</p>
                          <p className="text-xs text-primary">{exp.company}</p>
                          {exp.duration && <p className="text-[11px] text-muted-foreground mt-0.5">{exp.duration}</p>}
                          {exp.description && <p className="text-xs text-muted-foreground mt-1">{exp.description}</p>}
                        </div>
                      </div>
                    </motion.div>
                  ))}
                  {experience.length === 0 && !editingExperience && <p className="text-xs text-muted-foreground">No experience added yet.</p>}
                </div>
                {editingExperience && (
                  <div className="mt-4 space-y-2 rounded-lg border border-dashed border-border/50 p-4">
                    <div className="grid gap-2 sm:grid-cols-2">
                      <Input value={newExp.title} onChange={(e) => setNewExp({ ...newExp, title: e.target.value })} className="h-8 bg-muted/30 text-sm" placeholder="Job Title" />
                      <Input value={newExp.company} onChange={(e) => setNewExp({ ...newExp, company: e.target.value })} className="h-8 bg-muted/30 text-sm" placeholder="Company" />
                    </div>
                    <Input value={newExp.duration} onChange={(e) => setNewExp({ ...newExp, duration: e.target.value })} className="h-8 bg-muted/30 text-sm" placeholder="Duration (e.g. Jan 2023 - Present)" />
                    <textarea value={newExp.description} onChange={(e) => setNewExp({ ...newExp, description: e.target.value })} rows={2}
                      className="w-full rounded-lg border border-input bg-muted/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
                      placeholder="Brief description..." />
                    <Button size="sm" onClick={addExperience} disabled={!newExp.title || !newExp.company}>
                      <Plus className="mr-1.5 h-3.5 w-3.5" /> Add Experience
                    </Button>
                  </div>
                )}
              </div>

              {/* Basic Info */}
              <div className="rounded-xl border border-border/50 bg-card p-6">
                <h3 className="mb-4 text-sm font-semibold text-foreground">Account Info</h3>
                <div className="space-y-2">
                  {[
                    { label: "Email", value: userEmail },
                    { label: "Status", value: profile?.is_suspended ? "Suspended" : "Active" },
                    { label: "Member Since", value: new Date(profile?.created_at || "").toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" }) },
                  ].map((item) => (
                    <div key={item.label} className="flex items-center justify-between rounded-lg bg-muted/20 px-4 py-2.5">
                      <span className="text-xs text-muted-foreground">{item.label}</span>
                      <span className="text-xs font-medium text-foreground">{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}

          {activeTab === "security" && (
            <motion.div key="security" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}
              className="rounded-xl border border-border/50 bg-card p-6">
              <h3 className="mb-4 text-lg font-semibold text-foreground">Change Password</h3>
              <div className="max-w-md space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">New Password</label>
                  <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" className="bg-muted/30" />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-muted-foreground">Confirm Password</label>
                  <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="••••••••" className="bg-muted/30" />
                </div>
                <Button onClick={() => changePassword.mutate()} disabled={changePassword.isPending || !newPassword || !confirmPassword} className="gap-2">
                  {changePassword.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Lock className="h-4 w-4" />}
                  Update Password
                </Button>
              </div>
            </motion.div>
          )}

          {activeTab === "notifications" && (
            <motion.div key="notifications" initial={{ opacity: 0, x: -12 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 12 }}
              className="rounded-xl border border-border/50 bg-card p-6">
              <h3 className="mb-4 text-lg font-semibold text-foreground">Notifications</h3>
              {!notifications?.length ? (
                <div className="py-8 text-center">
                  <Bell className="mx-auto mb-3 h-8 w-8 text-muted-foreground/30" />
                  <p className="text-sm text-muted-foreground">No notifications yet</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {notifications.map((n, i) => (
                    <motion.div key={n.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.03 }}
                      onClick={() => !n.is_read && markRead.mutate(n.id)}
                      className={`cursor-pointer rounded-lg border p-4 transition-colors ${n.is_read ? "border-border/30 bg-muted/10" : "border-primary/30 bg-primary/5 hover:bg-primary/10"}`}>
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            {!n.is_read && <div className="h-2 w-2 rounded-full bg-primary" />}
                            <p className="text-sm font-semibold text-foreground">{n.title}</p>
                          </div>
                          <p className="mt-1 text-xs text-muted-foreground">{n.message}</p>
                          {/* Rich media */}
                          {(n as any).image_url && (
                            <div className="mt-2 overflow-hidden rounded-lg border border-border/30">
                              <img src={(n as any).image_url} alt="" className="max-h-48 w-full object-cover" />
                            </div>
                          )}
                          {(n as any).video_url && (
                            <div className="mt-2 overflow-hidden rounded-lg border border-border/30">
                              <video src={(n as any).video_url} controls className="max-h-48 w-full" />
                            </div>
                          )}
                        </div>
                        <span className="shrink-0 text-[10px] text-muted-foreground">{new Date(n.created_at).toLocaleDateString()}</span>
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
