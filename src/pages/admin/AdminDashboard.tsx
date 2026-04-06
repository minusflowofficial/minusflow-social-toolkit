import { motion } from "framer-motion";
import { Wrench, Eye, AlertTriangle, CheckCircle } from "lucide-react";
import { useTools } from "@/hooks/useTools";
import { useSiteSettings } from "@/hooks/useSiteSettings";
import { useAuth } from "@/hooks/useAuth";

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

  const activeTools = tools?.filter((t) => t.status === "active").length ?? 0;
  const visibleTools = tools?.filter((t) => t.is_visible).length ?? 0;
  const maintenanceTools = tools?.filter((t) => t.status === "maintenance").length ?? 0;
  const totalTools = tools?.length ?? 0;
  const isMaintenance = settings?.maintenance_mode?.enabled ?? false;

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          Welcome back, {user?.email} · <span className="text-primary">{role || "Viewer"}</span>
        </p>
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Wrench} label="Total Tools" value={totalTools} color="bg-primary/10 text-primary" />
        <StatCard icon={CheckCircle} label="Active Tools" value={activeTools} color="bg-green-500/10 text-green-500" />
        <StatCard icon={Eye} label="Visible Tools" value={visibleTools} color="bg-blue-500/10 text-blue-500" />
        <StatCard icon={AlertTriangle} label="In Maintenance" value={maintenanceTools} color="bg-yellow-500/10 text-yellow-500" />
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

      {/* Recent Tools */}
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
              <div className="flex items-center gap-2">
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
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
