import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend,
} from "recharts";
import { Eye, Users, Clock, TrendingUp, Activity, BarChart3, Globe, MonitorSmartphone, ArrowDown, Percent } from "lucide-react";

const COLORS = ["hsl(0,85%,55%)", "hsl(210,80%,55%)", "hsl(140,70%,45%)", "hsl(45,90%,55%)", "hsl(280,70%,55%)", "hsl(20,90%,55%)", "hsl(170,70%,45%)", "hsl(320,70%,55%)"];

const StatCard = ({ icon: Icon, label, value, sub, color }: any) => (
  <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border/50 bg-card p-5">
    <div className="flex items-center gap-3">
      <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${color}`}>
        <Icon className="h-5 w-5" />
      </div>
      <div>
        <p className="text-2xl font-bold text-foreground">{value}</p>
        <p className="text-xs text-muted-foreground">{label}</p>
        {sub && <p className="text-[10px] text-muted-foreground/70">{sub}</p>}
      </div>
    </div>
  </motion.div>
);

const AdminAnalytics = () => {
  const [range, setRange] = useState<"7d" | "30d" | "90d">("7d");

  const daysBack = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const since = new Date(Date.now() - daysBack * 86400000).toISOString();

  const { data: pageViews } = useQuery({
    queryKey: ["analytics-views", range],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("page_views")
        .select("*")
        .gte("created_at", since)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  const { data: toolLogs } = useQuery({
    queryKey: ["analytics-tools", range],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tool_usage_logs")
        .select("*")
        .gte("created_at", since)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return data || [];
    },
  });

  // Fetch all users for user analytics
  const { data: allUsers } = useQuery({
    queryKey: ["analytics-users"],
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("admin-users", {
        body: { action: "list_all" },
      });
      if (error) throw error;
      return data.users || [];
    },
  });

  const stats = useMemo(() => {
    if (!pageViews) return null;
    const uniqueSessions = new Set(pageViews.map((v: any) => v.session_id)).size;
    const totalViews = pageViews.length;
    const topPages = pageViews.reduce((acc: any, v: any) => {
      acc[v.path] = (acc[v.path] || 0) + 1;
      return acc;
    }, {});

    // Bounce rate: sessions with only 1 page view
    const sessionMap = new Map<string, number>();
    pageViews.forEach((v: any) => {
      const sid = v.session_id || v.id;
      sessionMap.set(sid, (sessionMap.get(sid) || 0) + 1);
    });
    const bounceSessions = Array.from(sessionMap.values()).filter(c => c === 1).length;
    const bounceRate = sessionMap.size > 0 ? Math.round((bounceSessions / sessionMap.size) * 100) : 0;

    // Avg pages per session
    const avgPagesPerSession = sessionMap.size > 0 ? (totalViews / sessionMap.size).toFixed(1) : "0";

    // Referrer breakdown
    const referrers = pageViews.reduce((acc: any, v: any) => {
      const ref = v.referrer ? new URL(v.referrer).hostname : "Direct";
      acc[ref] = (acc[ref] || 0) + 1;
      return acc;
    }, {});

    // Device breakdown (simple)
    const devices = { mobile: 0, desktop: 0 };
    pageViews.forEach((v: any) => {
      if (/mobile|android|iphone|ipad/i.test(v.user_agent || "")) devices.mobile++;
      else devices.desktop++;
    });

    return { uniqueSessions, totalViews, topPages, bounceRate, avgPagesPerSession, referrers, devices };
  }, [pageViews]);

  const toolStats = useMemo(() => {
    if (!toolLogs) return null;
    const byTool: Record<string, { total: number; success: number; error: number }> = {};
    toolLogs.forEach((l: any) => {
      if (!byTool[l.tool_name]) byTool[l.tool_name] = { total: 0, success: 0, error: 0 };
      byTool[l.tool_name].total++;
      if (l.status === "success") byTool[l.tool_name].success++;
      if (l.status === "error") byTool[l.tool_name].error++;
    });
    const totalRequests = toolLogs.length;
    const successRate = totalRequests > 0
      ? Math.round((toolLogs.filter((l: any) => l.status === "success").length / totalRequests) * 100)
      : 0;

    // Avg duration
    const durations = toolLogs.filter((l: any) => l.duration_ms > 0).map((l: any) => l.duration_ms);
    const avgDuration = durations.length > 0 ? Math.round(durations.reduce((a: number, b: number) => a + b, 0) / durations.length) : 0;

    return { byTool, totalRequests, successRate, avgDuration };
  }, [toolLogs]);

  // Daily chart data
  const dailyData = useMemo(() => {
    if (!pageViews) return [];
    const days: Record<string, { views: number; sessions: Set<string> }> = {};
    pageViews.forEach((v: any) => {
      const day = new Date(v.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric" });
      if (!days[day]) days[day] = { views: 0, sessions: new Set() };
      days[day].views++;
      days[day].sessions.add(v.session_id || v.id);
    });
    return Object.entries(days).map(([date, d]) => ({ date, views: d.views, sessions: d.sessions.size }));
  }, [pageViews]);

  // Tool usage pie data
  const toolPieData = useMemo(() => {
    if (!toolStats?.byTool) return [];
    return Object.entries(toolStats.byTool).map(([name, data]) => ({ name, value: data.total }));
  }, [toolStats]);

  // Top pages data
  const topPagesData = useMemo(() => {
    if (!stats?.topPages) return [];
    return Object.entries(stats.topPages)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 10)
      .map(([path, views]) => ({ path, views }));
  }, [stats]);

  // Tool success/failure chart
  const toolBarData = useMemo(() => {
    if (!toolStats?.byTool) return [];
    return Object.entries(toolStats.byTool).map(([name, data]) => ({
      name: name.replace(" Downloader", "").replace("YouTube ", "YT "),
      success: data.success,
      errors: data.error,
    }));
  }, [toolStats]);

  // Referrer pie
  const referrerData = useMemo(() => {
    if (!stats?.referrers) return [];
    return Object.entries(stats.referrers)
      .sort(([, a], [, b]) => (b as number) - (a as number))
      .slice(0, 6)
      .map(([name, value]) => ({ name, value }));
  }, [stats]);

  const totalUsers = allUsers?.length ?? 0;
  const activeUsers = allUsers?.filter((u: any) => !u.is_suspended && u.email_confirmed).length ?? 0;

  const tooltipStyle = { backgroundColor: "hsl(220,18%,8%)", border: "1px solid hsl(220,14%,15%)", borderRadius: "8px", color: "hsl(210,20%,92%)" };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Analytics</h1>
          <p className="text-sm text-muted-foreground">Traffic, tool usage & user insights</p>
        </div>
        <div className="flex gap-1 rounded-lg bg-muted/50 p-1">
          {(["7d", "30d", "90d"] as const).map((r) => (
            <button
              key={r}
              onClick={() => setRange(r)}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                range === r ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {r === "7d" ? "7 Days" : r === "30d" ? "30 Days" : "90 Days"}
            </button>
          ))}
        </div>
      </div>

      {/* Stats Row 1 */}
      <div className="mb-4 grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Eye} label="Page Views" value={stats?.totalViews ?? 0} color="bg-primary/10 text-primary" />
        <StatCard icon={Users} label="Sessions" value={stats?.uniqueSessions ?? 0} color="bg-blue-500/10 text-blue-500" />
        <StatCard icon={Activity} label="Tool Requests" value={toolStats?.totalRequests ?? 0} color="bg-green-500/10 text-green-500" />
        <StatCard icon={TrendingUp} label="Success Rate" value={`${toolStats?.successRate ?? 0}%`} color="bg-emerald-500/10 text-emerald-500" />
      </div>

      {/* Stats Row 2 */}
      <div className="mb-6 grid gap-3 grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Percent} label="Bounce Rate" value={`${stats?.bounceRate ?? 0}%`} color={`${(stats?.bounceRate ?? 0) > 40 ? "bg-yellow-500/10 text-yellow-500" : "bg-green-500/10 text-green-500"}`} />
        <StatCard icon={BarChart3} label="Avg Pages/Session" value={stats?.avgPagesPerSession ?? "0"} color="bg-purple-500/10 text-purple-500" />
        <StatCard icon={Clock} label="Avg Response" value={`${toolStats?.avgDuration ?? 0}ms`} color="bg-orange-500/10 text-orange-500" />
        <StatCard icon={Users} label="Total Users" value={totalUsers} sub={`${activeUsers} active`} color="bg-pink-500/10 text-pink-500" />
      </div>

      {/* Device Split */}
      <div className="mb-6 grid gap-3 grid-cols-2">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-4 rounded-xl border border-border/50 bg-card p-5">
          <MonitorSmartphone className="h-8 w-8 text-blue-500" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Desktop</p>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-blue-500" style={{ width: `${stats?.totalViews ? Math.round(((stats?.devices?.desktop ?? 0) / stats.totalViews) * 100) : 0}%` }} />
            </div>
          </div>
          <span className="text-lg font-bold text-foreground">{stats?.devices?.desktop ?? 0}</span>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.05 }} className="flex items-center gap-4 rounded-xl border border-border/50 bg-card p-5">
          <MonitorSmartphone className="h-8 w-8 text-green-500" />
          <div className="flex-1">
            <p className="text-sm font-medium text-foreground">Mobile</p>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-muted">
              <div className="h-full rounded-full bg-green-500" style={{ width: `${stats?.totalViews ? Math.round(((stats?.devices?.mobile ?? 0) / stats.totalViews) * 100) : 0}%` }} />
            </div>
          </div>
          <span className="text-lg font-bold text-foreground">{stats?.devices?.mobile ?? 0}</span>
        </motion.div>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Traffic Over Time */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border/50 bg-card p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Traffic Over Time</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={dailyData}>
                <defs>
                  <linearGradient id="colorViews" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(0,85%,55%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(0,85%,55%)" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorSessions" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(210,80%,55%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(210,80%,55%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,14%,15%)" />
                <XAxis dataKey="date" tick={{ fill: "hsl(215,12%,50%)", fontSize: 11 }} />
                <YAxis tick={{ fill: "hsl(215,12%,50%)", fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Area type="monotone" dataKey="views" stroke="hsl(0,85%,55%)" fill="url(#colorViews)" strokeWidth={2} name="Views" />
                <Area type="monotone" dataKey="sessions" stroke="hsl(210,80%,55%)" fill="url(#colorSessions)" strokeWidth={2} name="Sessions" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Tool Usage Pie */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-xl border border-border/50 bg-card p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Tool Usage Distribution</h3>
          <div className="h-64">
            {toolPieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={toolPieData} cx="50%" cy="50%" innerRadius={50} outerRadius={90} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {toolPieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No tool usage data</div>
            )}
          </div>
        </motion.div>

        {/* Success vs Error */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="rounded-xl border border-border/50 bg-card p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Success vs Errors</h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={toolBarData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(220,14%,15%)" />
                <XAxis dataKey="name" tick={{ fill: "hsl(215,12%,50%)", fontSize: 11 }} />
                <YAxis tick={{ fill: "hsl(215,12%,50%)", fontSize: 11 }} />
                <Tooltip contentStyle={tooltipStyle} />
                <Legend />
                <Bar dataKey="success" fill="hsl(140,70%,45%)" radius={[4, 4, 0, 0]} name="Success" />
                <Bar dataKey="errors" fill="hsl(0,85%,55%)" radius={[4, 4, 0, 0]} name="Errors" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Traffic Sources */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="rounded-xl border border-border/50 bg-card p-5">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Traffic Sources</h3>
          <div className="h-64">
            {referrerData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie data={referrerData} cx="50%" cy="50%" innerRadius={45} outerRadius={85} paddingAngle={3} dataKey="value" label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}>
                    {referrerData.map((_, i) => <Cell key={i} fill={COLORS[(i + 2) % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-muted-foreground">No referrer data</div>
            )}
          </div>
        </motion.div>

        {/* Top Pages — full width */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="rounded-xl border border-border/50 bg-card p-5 lg:col-span-2">
          <h3 className="mb-4 text-sm font-semibold text-foreground">Top Pages</h3>
          <div className="space-y-2">
            {topPagesData.length > 0 ? topPagesData.map((p: any, i: number) => {
              const maxViews = Number(topPagesData[0]?.views) || 1;
              const pct = Math.round((Number(p.views) / maxViews) * 100);
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-6 text-right text-xs font-medium text-muted-foreground">{i + 1}</span>
                  <div className="flex-1">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm text-foreground">{p.path}</span>
                      <span className="text-xs font-medium text-primary">{p.views}</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-muted">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: `${pct}%` }}
                        transition={{ duration: 0.6, delay: i * 0.05 }}
                        className="h-full rounded-full bg-primary/60"
                      />
                    </div>
                  </div>
                </div>
              );
            }) : (
              <div className="py-8 text-center text-sm text-muted-foreground">No page view data</div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default AdminAnalytics;
