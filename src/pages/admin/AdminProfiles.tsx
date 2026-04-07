import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Users, UserCheck, UserX, ShieldAlert, Search, ChevronRight,
  Bell, Send, Loader2, X, Eye, BarChart3, Mail, Calendar, User,
  ArrowLeft, Activity, MapPin, Globe, Briefcase, Sparkles, Save,
  Camera, Image as ImageIcon, Pencil, Plus
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface ExperienceItem {
  title: string;
  company: string;
  duration: string;
  description: string;
}

interface UserProfile {
  id: string;
  email: string;
  full_name: string;
  avatar_url: string;
  banner_url?: string;
  bio?: string;
  headline?: string;
  skills?: string[];
  experience?: ExperienceItem[];
  location?: string;
  website?: string;
  is_suspended: boolean;
  suspended_reason: string;
  role: string;
  email_confirmed: boolean;
  active_sessions: number;
  created_at: string;
  last_sign_in: string | null;
}

const AdminProfiles = () => {
  const { role } = useAuth();
  const qc = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [showNotifyModal, setShowNotifyModal] = useState(false);
  const [notifyTitle, setNotifyTitle] = useState("");
  const [notifyMessage, setNotifyMessage] = useState("");
  const [notifyUserId, setNotifyUserId] = useState("");

  // Admin edit state
  const [editBio, setEditBio] = useState(false);
  const [bioVal, setBioVal] = useState("");
  const [editHeadline, setEditHeadline] = useState(false);
  const [headlineVal, setHeadlineVal] = useState("");
  const [editLocation, setEditLocation] = useState(false);
  const [locationVal, setLocationVal] = useState("");
  const [editWebsite, setEditWebsite] = useState(false);
  const [websiteVal, setWebsiteVal] = useState("");
  const [editSkills, setEditSkills] = useState(false);
  const [skillsVal, setSkillsVal] = useState<string[]>([]);
  const [newSkillVal, setNewSkillVal] = useState("");
  const [editExperience, setEditExperience] = useState(false);
  const [experienceVal, setExperienceVal] = useState<ExperienceItem[]>([]);
  const [newExpVal, setNewExpVal] = useState<ExperienceItem>({ title: "", company: "", duration: "", description: "" });
  const [editName, setEditName] = useState(false);
  const [nameVal, setNameVal] = useState("");

  const isAdmin = role === "admin" || role === "super_admin";

  const { data: allUsers, isLoading } = useQuery({
    queryKey: ["admin-all-users"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-users", { body: { action: "list_all" } });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data.users as UserProfile[];
    },
    enabled: isAdmin,
  });

  const { data: userPageViews } = useQuery({
    queryKey: ["admin-user-pageviews", selectedUser?.id],
    queryFn: async () => {
      const { data } = await supabase.from("page_views").select("*").eq("user_id", selectedUser!.id);
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
    enabled: !!selectedUser?.id,
  });

  // Fetch full profile data from profiles table for selected user
  const { data: fullProfile } = useQuery({
    queryKey: ["admin-user-full-profile", selectedUser?.id],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("*").eq("id", selectedUser!.id).single();
      return data;
    },
    enabled: !!selectedUser?.id,
  });

  const sendNotification = useMutation({
    mutationFn: async () => {
      if (!notifyTitle.trim() || !notifyMessage.trim()) throw new Error("Title and message required");
      const { error } = await supabase.from("notifications").insert({ user_id: notifyUserId, title: notifyTitle.trim(), message: notifyMessage.trim() });
      if (error) throw error;
    },
    onSuccess: () => { toast.success("Notification sent!"); setShowNotifyModal(false); setNotifyTitle(""); setNotifyMessage(""); },
    onError: (err: any) => toast.error(err.message),
  });

  const saveProfileField = useMutation({
    mutationFn: async (fields: Record<string, any>) => {
      const { error } = await supabase.from("profiles").update({ ...fields, updated_at: new Date().toISOString() }).eq("id", selectedUser!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Profile updated");
      qc.invalidateQueries({ queryKey: ["admin-user-full-profile", selectedUser?.id] });
      qc.invalidateQueries({ queryKey: ["admin-all-users"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const totalUsers = allUsers?.length ?? 0;
  const activeUsers = allUsers?.filter((u) => !u.is_suspended && u.email_confirmed).length ?? 0;
  const unverifiedUsers = allUsers?.filter((u) => !u.email_confirmed).length ?? 0;
  const suspendedUsers = allUsers?.filter((u) => u.is_suspended).length ?? 0;

  const filteredUsers = allUsers?.filter((u) =>
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  ) ?? [];

  // Sync edit state when fullProfile loads
  const syncEditState = () => {
    if (fullProfile) {
      setBioVal((fullProfile as any).bio || "");
      setHeadlineVal((fullProfile as any).headline || "");
      setLocationVal((fullProfile as any).location || "");
      setWebsiteVal((fullProfile as any).website || "");
      setSkillsVal((fullProfile as any).skills || []);
      try { setExperienceVal(JSON.parse(JSON.stringify((fullProfile as any).experience || []))); } catch { setExperienceVal([]); }
      setNameVal(fullProfile.full_name || "");
    }
  };

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <ShieldAlert className="mb-4 h-12 w-12 text-muted-foreground/40" />
        <h2 className="text-lg font-semibold text-foreground">Access Restricted</h2>
      </div>
    );
  }

  // User Detail View
  if (selectedUser) {
    const fp = fullProfile as any;
    const bannerUrl = fp?.banner_url;
    const profileSkills: string[] = fp?.skills || [];
    const profileExperience: ExperienceItem[] = (() => { try { return fp?.experience || []; } catch { return []; } })();
    const bounceRate = userPageViews?.bounceRate ?? 0;

    // Sync state on first render
    if (fp && bioVal === "" && !editBio && (fp.bio || "") !== bioVal) {
      syncEditState();
    }

    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <Button variant="ghost" size="sm" className="mb-4 gap-1.5" onClick={() => { setSelectedUser(null); setEditBio(false); setEditHeadline(false); setEditLocation(false); setEditWebsite(false); setEditSkills(false); setEditExperience(false); setEditName(false); }}>
          <ArrowLeft className="h-4 w-4" /> Back to Users
        </Button>

        {/* Profile Card */}
        <div className="mb-6 overflow-hidden rounded-2xl border border-border/50 bg-card">
          <div className="relative h-32 sm:h-40 overflow-hidden">
            {bannerUrl ? (
              <img src={bannerUrl} alt="" className="h-full w-full object-cover" />
            ) : (
              <div className="h-full bg-gradient-to-r from-primary/30 via-primary/10 to-accent/20" />
            )}
          </div>
          <div className="relative px-6 pb-6">
            <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-end">
              <div className="relative -mt-12">
                <div className="h-20 w-20 overflow-hidden rounded-2xl border-4 border-card bg-muted shadow-xl">
                  {selectedUser.avatar_url ? (
                    <img src={selectedUser.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-primary/10"><User className="h-8 w-8 text-primary" /></div>
                  )}
                </div>
              </div>
              <div className="flex-1 pt-2">
                {editName ? (
                  <div className="flex items-center gap-2">
                    <Input value={nameVal} onChange={(e) => setNameVal(e.target.value)} className="h-8 w-60 bg-muted/50 text-sm" />
                    <Button size="sm" onClick={() => { saveProfileField.mutate({ full_name: nameVal }); setEditName(false); }}><Save className="h-3 w-3" /></Button>
                    <Button size="sm" variant="ghost" onClick={() => setEditName(false)}><X className="h-3 w-3" /></Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-foreground">{selectedUser.full_name || "No Name"}</h2>
                    <button onClick={() => { setNameVal(selectedUser.full_name || ""); setEditName(true); }} className="text-muted-foreground hover:text-primary"><Pencil className="h-3.5 w-3.5" /></button>
                  </div>
                )}

                {/* Headline */}
                {editHeadline ? (
                  <div className="mt-1 flex items-center gap-2">
                    <Input value={headlineVal} onChange={(e) => setHeadlineVal(e.target.value)} className="h-7 w-64 bg-muted/50 text-xs" placeholder="Headline" />
                    <Button size="sm" variant="ghost" className="h-7" onClick={() => { saveProfileField.mutate({ headline: headlineVal }); setEditHeadline(false); }}><Save className="h-3 w-3" /></Button>
                  </div>
                ) : (
                  <div className="flex items-center gap-1 mt-0.5">
                    <p className="text-sm text-muted-foreground">{fp?.headline || "No headline"}</p>
                    <button onClick={() => setEditHeadline(true)} className="text-muted-foreground/60 hover:text-primary"><Pencil className="h-3 w-3" /></button>
                  </div>
                )}

                <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
                  <span className="flex items-center gap-1"><Mail className="h-3 w-3" /> {selectedUser.email}</span>
                  <span className="flex items-center gap-1"><Calendar className="h-3 w-3" /> Joined {new Date(selectedUser.created_at).toLocaleDateString()}</span>
                  {fp?.location && <span className="flex items-center gap-1"><MapPin className="h-3 w-3" /> {fp.location}</span>}
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${selectedUser.is_suspended ? "bg-destructive/10 text-destructive" : "bg-green-500/10 text-green-500"}`}>
                    {selectedUser.is_suspended ? "Suspended" : "Active"}
                  </span>
                </div>
              </div>
              <Button size="sm" variant="outline" className="gap-1.5" onClick={() => { setNotifyUserId(selectedUser.id); setShowNotifyModal(true); }}>
                <Bell className="h-3.5 w-3.5" /> Send Notification
              </Button>
            </div>
          </div>
        </div>

        {/* Stats */}
        <div className="mb-6 grid gap-3 grid-cols-2 sm:grid-cols-4">
          {[
            { label: "Total Visits", value: userPageViews?.totalSessions ?? 0, icon: Eye, color: "text-blue-500 bg-blue-500/10" },
            { label: "Page Views", value: userPageViews?.totalViews ?? 0, icon: BarChart3, color: "text-primary bg-primary/10" },
            { label: "Pages Visited", value: userPageViews?.uniquePaths ?? 0, icon: Activity, color: "text-green-500 bg-green-500/10" },
            { label: "Bounce Rate", value: `${bounceRate}%`, icon: Activity, color: bounceRate > 20 ? "text-yellow-500 bg-yellow-500/10" : "text-emerald-500 bg-emerald-500/10" },
          ].map((stat, i) => (
            <motion.div key={stat.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
              className="rounded-xl border border-border/50 bg-muted/20 p-4">
              <div className={`mb-2 flex h-8 w-8 items-center justify-center rounded-lg ${stat.color}`}><stat.icon className="h-4 w-4" /></div>
              <p className="text-lg font-bold text-foreground">{stat.value}</p>
              <p className="text-[11px] text-muted-foreground">{stat.label}</p>
            </motion.div>
          ))}
        </div>

        {/* Bio Section */}
        <div className="mb-4 rounded-xl border border-border/50 bg-card p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> About</h3>
            <Button variant="ghost" size="sm" onClick={() => { setEditBio(!editBio); if (!editBio) setBioVal(fp?.bio || ""); }}>
              {editBio ? "Cancel" : <><Pencil className="mr-1 h-3 w-3" /> Edit</>}
            </Button>
          </div>
          {editBio ? (
            <div className="space-y-2">
              <textarea value={bioVal} onChange={(e) => setBioVal(e.target.value)} rows={4} placeholder="User bio..."
                className="w-full rounded-lg border border-input bg-muted/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
              <Button size="sm" onClick={() => { saveProfileField.mutate({ bio: bioVal }); setEditBio(false); }}>
                <Save className="mr-1.5 h-3.5 w-3.5" /> Save
              </Button>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground leading-relaxed">{fp?.bio || "No bio added."}</p>
          )}
        </div>

        {/* Location & Website */}
        <div className="mb-4 grid gap-3 sm:grid-cols-2">
          <div className="rounded-xl border border-border/50 bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground flex items-center gap-1"><MapPin className="h-3 w-3" /> Location</span>
              <button onClick={() => { setEditLocation(!editLocation); if (!editLocation) setLocationVal(fp?.location || ""); }} className="text-muted-foreground/60 hover:text-primary"><Pencil className="h-3 w-3" /></button>
            </div>
            {editLocation ? (
              <div className="flex gap-2">
                <Input value={locationVal} onChange={(e) => setLocationVal(e.target.value)} className="h-8 bg-muted/30 text-sm" placeholder="City, Country" />
                <Button size="sm" className="h-8" onClick={() => { saveProfileField.mutate({ location: locationVal }); setEditLocation(false); }}><Save className="h-3 w-3" /></Button>
              </div>
            ) : (
              <p className="text-sm font-medium text-foreground">{fp?.location || "Not set"}</p>
            )}
          </div>
          <div className="rounded-xl border border-border/50 bg-card p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs text-muted-foreground flex items-center gap-1"><Globe className="h-3 w-3" /> Website</span>
              <button onClick={() => { setEditWebsite(!editWebsite); if (!editWebsite) setWebsiteVal(fp?.website || ""); }} className="text-muted-foreground/60 hover:text-primary"><Pencil className="h-3 w-3" /></button>
            </div>
            {editWebsite ? (
              <div className="flex gap-2">
                <Input value={websiteVal} onChange={(e) => setWebsiteVal(e.target.value)} className="h-8 bg-muted/30 text-sm" placeholder="https://..." />
                <Button size="sm" className="h-8" onClick={() => { saveProfileField.mutate({ website: websiteVal }); setEditWebsite(false); }}><Save className="h-3 w-3" /></Button>
              </div>
            ) : (
              <p className="text-sm font-medium text-foreground">{fp?.website ? <a href={fp.website} target="_blank" rel="noopener" className="text-primary hover:underline">{fp.website}</a> : "Not set"}</p>
            )}
          </div>
        </div>

        {/* Skills */}
        <div className="mb-4 rounded-xl border border-border/50 bg-card p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Sparkles className="h-4 w-4 text-primary" /> Skills</h3>
            <Button variant="ghost" size="sm" onClick={() => { setEditSkills(!editSkills); if (!editSkills) setSkillsVal(fp?.skills || []); }}>
              {editSkills ? "Done" : <><Pencil className="mr-1 h-3 w-3" /> Edit</>}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {(editSkills ? skillsVal : profileSkills).map((s) => (
              <span key={s} className="flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary">
                {s}
                {editSkills && <button onClick={() => { const u = skillsVal.filter((sk) => sk !== s); setSkillsVal(u); saveProfileField.mutate({ skills: u }); }} className="ml-0.5 text-primary/60 hover:text-destructive"><X className="h-3 w-3" /></button>}
              </span>
            ))}
            {profileSkills.length === 0 && !editSkills && <p className="text-xs text-muted-foreground">No skills.</p>}
          </div>
          {editSkills && (
            <div className="mt-3 flex gap-2">
              <Input value={newSkillVal} onChange={(e) => setNewSkillVal(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter" && newSkillVal.trim()) { const u = [...skillsVal, newSkillVal.trim()]; setSkillsVal(u); setNewSkillVal(""); saveProfileField.mutate({ skills: u }); }}} className="h-8 bg-muted/30 text-sm" placeholder="Add skill" />
              <Button size="sm" className="h-8" onClick={() => { if (newSkillVal.trim()) { const u = [...skillsVal, newSkillVal.trim()]; setSkillsVal(u); setNewSkillVal(""); saveProfileField.mutate({ skills: u }); }}}><Plus className="h-3.5 w-3.5" /></Button>
            </div>
          )}
        </div>

        {/* Experience */}
        <div className="mb-4 rounded-xl border border-border/50 bg-card p-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2"><Briefcase className="h-4 w-4 text-primary" /> Experience</h3>
            <Button variant="ghost" size="sm" onClick={() => { setEditExperience(!editExperience); if (!editExperience) { try { setExperienceVal(JSON.parse(JSON.stringify(fp?.experience || []))); } catch { setExperienceVal([]); } } }}>
              {editExperience ? "Done" : <><Pencil className="mr-1 h-3 w-3" /> Edit</>}
            </Button>
          </div>
          <div className="space-y-3">
            {(editExperience ? experienceVal : profileExperience).map((exp, i) => (
              <div key={i} className="relative rounded-lg bg-muted/20 p-4 border border-border/30">
                {editExperience && (
                  <button onClick={() => { const u = experienceVal.filter((_, j) => j !== i); setExperienceVal(u); saveProfileField.mutate({ experience: u }); }} className="absolute right-2 top-2 text-muted-foreground hover:text-destructive"><X className="h-4 w-4" /></button>
                )}
                <div className="flex items-start gap-3">
                  <div className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 shrink-0"><Briefcase className="h-4 w-4 text-primary" /></div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{exp.title}</p>
                    <p className="text-xs text-primary">{exp.company}</p>
                    {exp.duration && <p className="text-[11px] text-muted-foreground mt-0.5">{exp.duration}</p>}
                    {exp.description && <p className="text-xs text-muted-foreground mt-1">{exp.description}</p>}
                  </div>
                </div>
              </div>
            ))}
            {profileExperience.length === 0 && !editExperience && <p className="text-xs text-muted-foreground">No experience.</p>}
          </div>
          {editExperience && (
            <div className="mt-4 space-y-2 rounded-lg border border-dashed border-border/50 p-4">
              <div className="grid gap-2 sm:grid-cols-2">
                <Input value={newExpVal.title} onChange={(e) => setNewExpVal({ ...newExpVal, title: e.target.value })} className="h-8 bg-muted/30 text-sm" placeholder="Job Title" />
                <Input value={newExpVal.company} onChange={(e) => setNewExpVal({ ...newExpVal, company: e.target.value })} className="h-8 bg-muted/30 text-sm" placeholder="Company" />
              </div>
              <Input value={newExpVal.duration} onChange={(e) => setNewExpVal({ ...newExpVal, duration: e.target.value })} className="h-8 bg-muted/30 text-sm" placeholder="Duration" />
              <textarea value={newExpVal.description} onChange={(e) => setNewExpVal({ ...newExpVal, description: e.target.value })} rows={2}
                className="w-full rounded-lg border border-input bg-muted/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" placeholder="Description..." />
              <Button size="sm" onClick={() => { if (newExpVal.title && newExpVal.company) { const u = [...experienceVal, { ...newExpVal }]; setExperienceVal(u); setNewExpVal({ title: "", company: "", duration: "", description: "" }); saveProfileField.mutate({ experience: u }); }}} disabled={!newExpVal.title || !newExpVal.company}>
                <Plus className="mr-1.5 h-3.5 w-3.5" /> Add
              </Button>
            </div>
          )}
        </div>

        {/* Account Details */}
        <div className="rounded-xl border border-border/50 bg-card p-6">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Account Details</h3>
          <div className="space-y-3">
            {[
              { label: "Role", value: selectedUser.role === "super_admin" ? "Super Admin" : selectedUser.role === "admin" ? "Admin" : "User" },
              { label: "Email Verified", value: selectedUser.email_confirmed ? "Yes" : "No" },
              { label: "Active Sessions", value: selectedUser.active_sessions },
              { label: "Last Sign In", value: selectedUser.last_sign_in ? new Date(selectedUser.last_sign_in).toLocaleString() : "Never" },
              { label: "Suspended Reason", value: selectedUser.suspended_reason || "N/A" },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between rounded-lg bg-muted/20 px-4 py-2.5">
                <span className="text-xs text-muted-foreground">{item.label}</span>
                <span className="text-xs font-medium text-foreground">{item.value}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <div>
      {/* Stats */}
      <div className="mb-6 grid gap-3 grid-cols-2 sm:grid-cols-4">
        {[
          { label: "Total Users", value: totalUsers, icon: Users, color: "text-primary bg-primary/10" },
          { label: "Active Users", value: activeUsers, icon: UserCheck, color: "text-green-500 bg-green-500/10" },
          { label: "Unverified", value: unverifiedUsers, icon: ShieldAlert, color: "text-yellow-500 bg-yellow-500/10" },
          { label: "Suspended", value: suspendedUsers, icon: UserX, color: "text-destructive bg-destructive/10" },
        ].map((stat, i) => (
          <motion.div key={stat.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
            className="rounded-xl border border-border/50 bg-card p-4">
            <div className={`mb-2 flex h-9 w-9 items-center justify-center rounded-lg ${stat.color}`}><stat.icon className="h-4.5 w-4.5" /></div>
            <p className="text-xl font-bold text-foreground">{stat.value}</p>
            <p className="text-xs text-muted-foreground">{stat.label}</p>
          </motion.div>
        ))}
      </div>

      {/* User List */}
      <div className="rounded-xl border border-border/50 bg-card p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-foreground">User Profiles</h2>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input placeholder="Search users..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="h-9 w-60 bg-muted/30 pl-9 text-sm" />
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-12"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
        ) : (
          <div className="space-y-2">
            {filteredUsers.map((u, i) => (
              <motion.button key={u.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                onClick={() => setSelectedUser(u)}
                className="flex w-full items-center justify-between rounded-xl border border-border/30 bg-muted/10 p-4 text-left transition-colors hover:bg-muted/30">
                <div className="flex items-center gap-3">
                  <div className="h-10 w-10 overflow-hidden rounded-xl bg-primary/10">
                    {u.avatar_url ? <img src={u.avatar_url} alt="" className="h-full w-full object-cover" /> : <div className="flex h-full w-full items-center justify-center"><User className="h-4 w-4 text-primary" /></div>}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-foreground">{u.full_name || u.email}</p>
                    <p className="text-xs text-muted-foreground">
                      {u.email} · {u.role === "super_admin" ? "Super Admin" : u.role === "admin" ? "Admin" : "User"}
                      {u.is_suspended && <span className="ml-1 text-destructive">· Suspended</span>}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button variant="ghost" size="sm" className="h-8 gap-1 text-xs" onClick={(e) => { e.stopPropagation(); setNotifyUserId(u.id); setShowNotifyModal(true); }}>
                    <Bell className="h-3 w-3" />
                  </Button>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </motion.button>
            ))}
          </div>
        )}
      </div>

      {/* Notification Modal */}
      <AnimatePresence>
        {showNotifyModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm" onClick={() => setShowNotifyModal(false)}>
            <motion.div initial={{ scale: 0.95, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()} className="mx-4 w-full max-w-md rounded-2xl border border-border/50 bg-card p-6 shadow-2xl">
              <div className="mb-4 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-foreground">Send Notification</h3>
                <button onClick={() => setShowNotifyModal(false)} className="text-muted-foreground hover:text-foreground"><X className="h-5 w-5" /></button>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Title</label>
                  <Input value={notifyTitle} onChange={(e) => setNotifyTitle(e.target.value)} placeholder="Notification title" className="bg-muted/30" />
                </div>
                <div>
                  <label className="mb-1 block text-xs text-muted-foreground">Message</label>
                  <textarea value={notifyMessage} onChange={(e) => setNotifyMessage(e.target.value)} placeholder="Type your message..." rows={4}
                    className="w-full rounded-md border border-input bg-muted/30 px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring" />
                </div>
                <Button onClick={() => sendNotification.mutate()} disabled={sendNotification.isPending || !notifyTitle || !notifyMessage} className="w-full gap-2">
                  {sendNotification.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Send Notification
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default AdminProfiles;
