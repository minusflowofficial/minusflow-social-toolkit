import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Plus, Trash2, Shield, ShieldCheck, X, Loader2, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

interface AdminUser {
  id: string;
  email: string;
  role: "super_admin" | "admin" | "user";
  created_at: string;
}

const AdminUsers = () => {
  const { role } = useAuth();
  const qc = useQueryClient();
  const isSuperAdmin = role === "super_admin";

  const [showAdd, setShowAdd] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"admin" | "super_admin" | "user">("user");

  const { data: users, isLoading } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "list" },
      });
      if (error) throw error;
      return data.users as AdminUser[];
    },
    enabled: isSuperAdmin,
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
      qc.invalidateQueries({ queryKey: ["admin-users"] });
      setShowAdd(false);
      setNewEmail("");
      setNewPassword("");
      setNewRole("admin");
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
      qc.invalidateQueries({ queryKey: ["admin-users"] });
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
      qc.invalidateQueries({ queryKey: ["admin-users"] });
    },
    onError: (err: any) => toast.error(err.message),
  });

  if (!isSuperAdmin) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <Shield className="mb-4 h-12 w-12 text-muted-foreground/40" />
        <h2 className="text-lg font-semibold text-foreground">Access Restricted</h2>
        <p className="text-sm text-muted-foreground">Only Super Admins can manage users</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">User Management</h1>
          <p className="text-sm text-muted-foreground">{users?.length ?? 0} admin users</p>
        </div>
        <Button onClick={() => setShowAdd(!showAdd)} variant={showAdd ? "outline" : "default"} className="gap-2">
          {showAdd ? <X className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
          {showAdd ? "Cancel" : "Add User"}
        </Button>
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
            <h3 className="mb-4 text-sm font-semibold text-foreground">Create New Admin User</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Email *</label>
                <Input
                  type="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="bg-muted/50"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Password *</label>
                <Input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="bg-muted/50"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as any)}
                  className="h-10 w-full rounded-md border border-input bg-muted/50 px-3 text-sm text-foreground"
                >
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
              </div>
            </div>
            <Button
              onClick={() => createUser.mutate()}
              disabled={createUser.isPending || !newEmail || !newPassword}
              className="mt-4 gap-2"
            >
              {createUser.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create User
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Users List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-16 animate-pulse rounded-xl bg-card" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {users?.map((user, i) => (
            <motion.div
              key={user.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              className="flex items-center justify-between rounded-xl border border-border/50 bg-card p-4"
            >
              <div className="flex items-center gap-3">
                <div className={`flex h-9 w-9 items-center justify-center rounded-lg ${
                  user.role === "super_admin" ? "bg-primary/10" : "bg-blue-500/10"
                }`}>
                  {user.role === "super_admin" ? (
                    <ShieldCheck className="h-4.5 w-4.5 text-primary" />
                  ) : (
                    <Shield className="h-4.5 w-4.5 text-blue-500" />
                  )}
                </div>
                <div>
                  <p className="text-sm font-medium text-foreground">{user.email}</p>
                  <p className="text-xs text-muted-foreground">
                    {user.role === "super_admin" ? "Super Admin" : "Admin"} · Joined {new Date(user.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={user.role}
                  onChange={(e) => updateRole.mutate({ user_id: user.id, role: e.target.value })}
                  className="h-8 rounded-md border border-border/50 bg-muted/50 px-2 text-xs text-foreground"
                >
                  <option value="admin">Admin</option>
                  <option value="super_admin">Super Admin</option>
                </select>
                <button
                  onClick={() => {
                    if (confirm(`Delete ${user.email}?`)) deleteUser.mutate(user.id);
                  }}
                  className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminUsers;
