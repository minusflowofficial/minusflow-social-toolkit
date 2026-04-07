import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Users, Wrench, Eye, AlertTriangle, CheckCircle, ShieldAlert, ShieldCheck,
  Shield, User, Ban, Unlock, Trash2, Monitor, Search, Loader2, RefreshCw,
  ChevronDown, CircleCheck, AlertOctagon, Bug
} from "lucide-react";
import { useTools } from "@/hooks/useTools";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

interface AllUser {
  id: string;
  email: string;
  full_name: string;
  role: string;
  is_suspended: boolean;
  suspended_reason: string;
  email_confirmed: boolean;
  active_sessions: number;
  created_at: string;
  last_sign_in: string | null;
}

const StatCard = ({ icon: Icon, label, value, color }: { icon: any; label: string; value: string | number; color: string }) => (
  <motion.div
    initial={{ opacity: 0, y: 12 }}
    animate={{ opacity: 1, y: 0 }}
    className="rounded-xl border border-border/50 bg-card p-5"
  >
    <div className="flex items-center gap-3">
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
      </div>
    </div>
  </motion.div>
);

const AdminDashboard = () => {
  const { data: tools } = useTools();
  const { data: settings } = useSiteSettings();
  const { role, user } = useAuth();
  const qc = useQueryClient();
  const [searchQuery, setSearchQuery] = useState("");

  const activeTools = tools?.filter((t) => t.status === "active").length ?? 0;
  const visibleTools = tools?.filter((t) => t.is_visible).length ?? 0;
  const maintenanceTools = tools?.filter((t) => t.status === "maintenance").length ?? 0;
  const totalTools = tools?.length ?? 0;
  const isMaintenance = settings?.maintenance_mode?.enabled ?? false;

  // Fetch all users
  const { data: allUsers, isLoading: usersLoading } = useQuery({
    queryKey: ["admin-all-users"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "list_all" },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data.users as AllUser[];
    },
    enabled: role === "super_admin" || role === "admin",
  });

  const suspendUser = useMutation({
    mutationFn: async ({ user_id, reason }: { user_id: string; reason?: string }) => {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "suspend", user_id, reason },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
    },
    onSuccess: () => {
      toast.success("User suspended");
      qc.invalidateQueries({ queryKey: ["admin-all-users"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const unsuspendUser = useMutation({
    mutationFn: async (user_id: string) => {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "unsuspend", user_id },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
    },
    onSuccess: () => {
      toast.success("User unsuspended & sessions cleared");
      qc.invalidateQueries({ queryKey: ["admin-all-users"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const clearSessions = useMutation({
    mutationFn: async (user_id: string) => {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "clear_sessions", user_id },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
    },
    onSuccess: () => {
      toast.success("Sessions cleared");
      qc.invalidateQueries({ queryKey: ["admin-all-users"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const totalUsers = allUsers?.length ?? 0;
  const suspendedUsers = allUsers?.filter(u => u.is_suspended).length ?? 0;
  const verifiedUsers = allUsers?.filter(u => u.email_confirmed).length ?? 0;

  const filteredUsers = allUsers?.filter(u =>
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.full_name.toLowerCase().includes(searchQuery.toLowerCase())
  ) ?? [];

  const getRoleIcon = (r: string) => {
    if (r === "super_admin") return <ShieldCheck className="h-4 w-4 text-primary" />;
    if (r === "admin") return <Shield className="h-4 w-4 text-blue-500" />;
    return <User className="h-4 w-4 text-green-500" />;
  };

  const getRoleLabel = (r: string) => {
    if (r === "super_admin") return "Super Admin";
    if (r === "admin") return "Admin";
    return "User";
  };

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Welcome back, {user?.email} · <span className="text-primary">{role || "Viewer"}</span>
        </p>
      </div>

      {/* Stats Grid */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Users} label="Total Users" value={totalUsers} color="bg-purple-500/10 text-purple-500" />
        <StatCard icon={Wrench} label="Total Tools" value={totalTools} color="bg-primary/10 text-primary" />
        <StatCard icon={CheckCircle} label="Active Tools" value={activeTools} color="bg-green-500/10 text-green-500" />
        <StatCard icon={ShieldAlert} label="Suspended Users" value={suspendedUsers} color="bg-destructive/10 text-destructive" />
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Eye} label="Visible Tools" value={visibleTools} color="bg-blue-500/10 text-blue-500" />
        <StatCard icon={AlertTriangle} label="In Maintenance" value={maintenanceTools} color="bg-yellow-500/10 text-yellow-500" />
        <StatCard icon={CheckCircle} label="Verified Users" value={verifiedUsers} color="bg-emerald-500/10 text-emerald-500" />
        <StatCard
          icon={isMaintenance ? AlertTriangle : CheckCircle}
          label="Site Status"
          value={isMaintenance ? "Maintenance" : "Online"}
          color={isMaintenance ? "bg-yellow-500/10 text-yellow-500" : "bg-green-500/10 text-green-500"}
        />
      </div>

      {/* Site Status */}
      <div className="rounded-xl border border-border/50 bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold text-foreground">Site Status</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-4">
            <div className={`h-3 w-3 rounded-full ${isMaintenance ? "bg-yellow-500 animate-pulse" : "bg-green-500"}`} />
            <div>
              <p className="text-sm font-medium text-foreground">Maintenance Mode</p>
              <p className="text-xs text-muted-foreground">{isMaintenance ? "Enabled" : "Disabled"}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 rounded-lg bg-muted/50 p-4">
            <div className={`h-3 w-3 rounded-full ${settings?.site_status?.enabled ? "bg-green-500" : "bg-red-500"}`} />
            <div>
              <p className="text-sm font-medium text-foreground">Site Status</p>
              <p className="text-xs text-muted-foreground">{settings?.site_status?.enabled ? "Online" : "Offline"}</p>
            </div>
          </div>
        </div>
      </div>

      {/* All Users Management */}
      <div className="mt-6 rounded-xl border border-border/50 bg-card p-6">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <h2 className="text-lg font-semibold text-foreground">All Users ({totalUsers})</h2>
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search users..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-9 w-60 bg-muted/30 pl-9 text-sm"
              />
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => qc.invalidateQueries({ queryKey: ["admin-all-users"] })}
              className="gap-1.5"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </Button>
          </div>
        </div>

        {usersLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : (
          <div className="space-y-2">
            <AnimatePresence>
              {filteredUsers.map((u, i) => (
                <motion.div
                  key={u.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className={`flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
                    u.is_suspended ? "border-destructive/30 bg-destructive/5" : "border-border/50 bg-muted/20"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                      u.is_suspended ? "bg-destructive/10" : u.role === "super_admin" ? "bg-primary/10" : u.role === "admin" ? "bg-blue-500/10" : "bg-green-500/10"
                    }`}>
                      {u.is_suspended ? <Ban className="h-4 w-4 text-destructive" /> : getRoleIcon(u.role)}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="truncate text-sm font-medium text-foreground">{u.email}</p>
                        {u.is_suspended && (
                          <span className="shrink-0 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive">
                            SUSPENDED
                          </span>
                        )}
                        {!u.email_confirmed && (
                          <span className="shrink-0 rounded-full bg-yellow-500/10 px-2 py-0.5 text-[10px] font-medium text-yellow-500">
                            UNVERIFIED
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {u.full_name || "No name"} · {getRoleLabel(u.role)} · {u.active_sessions} active session{u.active_sessions !== 1 ? "s" : ""}
                        {u.last_sign_in && ` · Last: ${new Date(u.last_sign_in).toLocaleDateString()}`}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Clear sessions */}
                    {u.active_sessions > 0 && (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => clearSessions.mutate(u.id)}
                        className="h-8 gap-1.5 text-xs"
                        title="Clear all sessions"
                      >
                        <Monitor className="h-3.5 w-3.5" /> Clear Sessions
                      </Button>
                    )}

                    {/* Status Dropdown */}
                    {u.id !== user?.id && (
                      <UserStatusDropdown
                        currentStatus={u.suspended_reason === "Marked as spammer by admin" ? "spammer" : u.is_suspended ? "suspended" : "active"}
                        onStatusChange={(status) => {
                          if (status === "active") {
                            unsuspendUser.mutate(u.id);
                          } else if (status === "suspended") {
                            suspendUser.mutate({ user_id: u.id, reason: "Manually suspended by admin" });
                          } else if (status === "spammer") {
                            suspendUser.mutate({ user_id: u.id, reason: "Marked as spammer by admin" });
                          }
                        }}
                      />
                    )}
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>

            {filteredUsers.length === 0 && !usersLoading && (
              <div className="py-8 text-center text-sm text-muted-foreground">
                {searchQuery ? "No users found matching your search" : "No users found"}
              </div>
            )}
          </div>
        )}
      </div>

      {/* All Tools */}
      <div className="mt-6 rounded-xl border border-border/50 bg-card p-6">
        <h2 className="mb-4 text-lg font-semibold text-foreground">All Tools</h2>
        <div className="space-y-2">
          {tools?.map((tool) => (
            <div key={tool.id} className="flex items-center justify-between rounded-lg bg-muted/30 px-4 py-3">
              <div className="flex items-center gap-3">
                <div className={`h-2 w-2 rounded-full ${
                  tool.status === "active" ? "bg-green-500" : tool.status === "maintenance" ? "bg-yellow-500" : "bg-red-500"
                }`} />
                <span className="text-sm font-medium text-foreground">{tool.name}</span>
                <span className="text-xs text-muted-foreground">{tool.route}</span>
              </div>
              <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium uppercase tracking-wider ${
                tool.status === "active"
                  ? "bg-green-500/10 text-green-500"
                  : tool.status === "maintenance"
                  ? "bg-yellow-500/10 text-yellow-500"
                  : "bg-red-500/10 text-red-500"
              }`}>
                {tool.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
