import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  Plus, Trash2, Shield, ShieldCheck, X, Loader2, UserPlus, User,
  Search, RefreshCw, Ban, Unlock, Monitor, ChevronDown, CheckCircle,
  Bug, CircleCheck
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
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

const statusOptions = [
  { value: "active", label: "Active", icon: CircleCheck, color: "text-green-500", bg: "bg-green-500/10" },
  { value: "suspended", label: "Suspended", icon: Ban, color: "text-destructive", bg: "bg-destructive/10" },
  { value: "spammer", label: "Spammer", icon: Bug, color: "text-orange-500", bg: "bg-orange-500/10" },
] as const;

const UserStatusDropdown = ({
  currentStatus,
  onStatusChange,
}: {
  currentStatus: string;
  onStatusChange: (status: string) => void;
}) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const current = statusOptions.find((s) => s.value === currentStatus) || statusOptions[0];

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
        className={`flex h-8 items-center gap-1.5 rounded-lg border border-border/50 px-3 text-xs font-medium transition-colors hover:bg-muted/50 ${current.color}`}
      >
        <current.icon className="h-3.5 w-3.5" />
        {current.label}
        <ChevronDown className={`h-3 w-3 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full z-50 mt-1 w-40 overflow-hidden rounded-lg border border-border/50 bg-card shadow-xl"
          >
            {statusOptions.map((opt) => (
              <button
                key={opt.value}
                onClick={() => {
                  if (opt.value !== currentStatus) onStatusChange(opt.value);
                  setOpen(false);
                }}
                className={`flex w-full items-center gap-2 px-3 py-2 text-xs font-medium transition-colors hover:bg-muted/50 ${
                  opt.value === currentStatus ? `${opt.bg} ${opt.color}` : "text-muted-foreground"
                }`}
              >
                <opt.icon className="h-3.5 w-3.5" />
                {opt.label}
                {opt.value === currentStatus && <CheckCircle className="ml-auto h-3 w-3" />}
              </button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const AdminUsers = () => {
  const { role, user: currentUser } = useAuth();
  const qc = useQueryClient();
  const isSuperAdmin = role === "super_admin";
  const isAdmin = role === "admin" || isSuperAdmin;
  const [searchQuery, setSearchQuery] = useState("");

  const [showAdd, setShowAdd] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "super_admin" | "user">("user");

  // Fetch ALL users
  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-all-users"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "list_all" },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data.users as AllUser[];
    },
    enabled: isAdmin,
  });

  const createUser = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "create", email: newEmail.trim().toLowerCase(), password: newPassword, role: newRole },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success("User created successfully");
      qc.invalidateQueries({ queryKey: ["admin-all-users"] });
      setShowAdd(false);
      setNewEmail("");
      setNewPassword("");
      setNewRole("user");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const deleteUser = useMutation({
    mutationFn: async (user_id: string) => {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "delete", user_id },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success("User deleted");
      qc.invalidateQueries({ queryKey: ["admin-all-users"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  const updateRole = useMutation({
    mutationFn: async ({ user_id, role }: { user_id: string; role: string }) => {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "update_role", user_id, role },
      });
      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data;
    },
    onSuccess: () => {
      toast.success("Role updated");
      qc.invalidateQueries({ queryKey: ["admin-all-users"] });
    },
    onError: (err: any) => toast.error(err.message),
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
      toast.success("User unsuspended");
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

  if (!isAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Shield className="mb-4 h-12 w-12 text-muted-foreground/40" />
        <h2 className="text-lg font-semibold text-foreground">Access Restricted</h2>
        <p className="text-sm text-muted-foreground">Only Admins can manage users</p>
      </div>
    );
  }

  const totalUsers = users?.length ?? 0;
  const suspendedCount = users?.filter(u => u.is_suspended).length ?? 0;
  const verifiedCount = users?.filter(u => u.email_confirmed).length ?? 0;
  const activeCount = users?.filter(u => !u.is_suspended && u.email_confirmed).length ?? 0;

  const filteredUsers = users?.filter(u =>
    u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
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
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">User Management</h1>
          <p className="text-sm text-muted-foreground">
            {totalUsers} total · {activeCount} active · {suspendedCount} suspended · {verifiedCount} verified
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search users..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="h-9 w-52 bg-muted/30 pl-9 text-sm"
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
          {isSuperAdmin && (
            <Button onClick={() => setShowAdd(!showAdd)} variant={showAdd ? "outline" : "default"} size="sm" className="gap-1.5">
              {showAdd ? <X className="h-3.5 w-3.5" /> : <UserPlus className="h-3.5 w-3.5" />}
              {showAdd ? "Cancel" : "Add User"}
            </Button>
          )}
        </div>
      </div>

      {/* Add User Form */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 overflow-hidden rounded-xl border border-primary/30 bg-card p-5"
          >
            <h3 className="mb-4 text-sm font-semibold text-foreground">Create New User</h3>
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Email *</label>
                <Input type="email" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} placeholder="user@example.com" className="bg-muted/50" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Password *</label>
                <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="••••••••" className="bg-muted/50" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Role</label>
                <select value={newRole} onChange={(e) => setNewRole(e.target.value as any)} className="h-10 w-full rounded-md border border-input bg-muted/50 px-3 text-sm text-foreground">
                  <option value="user">User</option>
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>
              <div className="flex items-end">
                <Button onClick={() => createUser.mutate()} disabled={createUser.isPending || !newEmail || !newPassword} className="w-full gap-2">
                  {createUser.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
                  Create
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Users List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-card" />)}
        </div>
      ) : (
        <div className="space-y-2">
          {filteredUsers.map((u, i) => (
            <motion.div
              key={u.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              className={`flex flex-col gap-3 rounded-xl border p-4 sm:flex-row sm:items-center sm:justify-between ${
                u.is_suspended ? "border-destructive/30 bg-destructive/5" : "border-border/50 bg-card"
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
                      <span className="shrink-0 rounded-full bg-destructive/10 px-2 py-0.5 text-[10px] font-medium text-destructive">SUSPENDED</span>
                    )}
                    {!u.email_confirmed && (
                      <span className="shrink-0 rounded-full bg-yellow-500/10 px-2 py-0.5 text-[10px] font-medium text-yellow-500">UNVERIFIED</span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {u.full_name || "No name"} · {getRoleLabel(u.role)} · {u.active_sessions} session{u.active_sessions !== 1 ? "s" : ""}
                    {u.last_sign_in && ` · Last: ${new Date(u.last_sign_in).toLocaleDateString()}`}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {/* Sessions */}
                {u.active_sessions > 0 && (
                  <Button variant="outline" size="sm" onClick={() => clearSessions.mutate(u.id)} className="h-8 gap-1.5 text-xs" title="Clear sessions">
                    <Monitor className="h-3.5 w-3.5" /> Clear
                  </Button>
                )}

                {/* Role selector (super_admin only) */}
                {isSuperAdmin && u.id !== currentUser?.id && (
                  <select
                    value={u.role}
                    onChange={(e) => updateRole.mutate({ user_id: u.id, role: e.target.value })}
                    className="h-8 rounded-md border border-border/50 bg-muted/50 px-2 text-xs text-foreground"
                  >
                    <option value="user">User</option>
                    <option value="admin">Admin</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                )}

                {/* Status dropdown */}
                {u.id !== currentUser?.id && (
                  <UserStatusDropdown
                    currentStatus={u.suspended_reason === "Marked as spammer by admin" ? "spammer" : u.is_suspended ? "suspended" : "active"}
                    onStatusChange={(status) => {
                      if (status === "active") unsuspendUser.mutate(u.id);
                      else if (status === "suspended") suspendUser.mutate({ user_id: u.id, reason: "Manually suspended by admin" });
                      else if (status === "spammer") suspendUser.mutate({ user_id: u.id, reason: "Marked as spammer by admin" });
                    }}
                  />
                )}

                {/* Delete (super_admin only) */}
                {isSuperAdmin && u.id !== currentUser?.id && (
                  <button
                    onClick={() => { if (confirm(`Delete ${u.email}?`)) deleteUser.mutate(u.id); }}
                    className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                )}
              </div>
            </motion.div>
          ))}
          {filteredUsers.length === 0 && (
            <div className="py-8 text-center text-sm text-muted-foreground">
              {searchQuery ? "No users found" : "No users yet"}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
