import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { motion } from "framer-motion";
import { Download, Filter, AlertCircle, CheckCircle, Clock, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

const AdminLogs = () => {
  const [toolFilter, setToolFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [dateRange, setDateRange] = useState<"today" | "7d" | "30d" | "all">("7d");

  const since = dateRange === "today"
    ? new Date(new Date().setHours(0, 0, 0, 0)).toISOString()
    : dateRange === "7d"
    ? new Date(Date.now() - 7 * 86400000).toISOString()
    : dateRange === "30d"
    ? new Date(Date.now() - 30 * 86400000).toISOString()
    : new Date("2020-01-01").toISOString();

  const { data: logs, isLoading } = useQuery({
    queryKey: ["admin-logs", dateRange],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("tool_usage_logs")
        .select("*")
        .gte("created_at", since)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return data || [];
    },
  });

  const toolNames = useMemo(() => {
    if (!logs) return [];
    return [...new Set(logs.map((l: any) => l.tool_name))];
  }, [logs]);

  const filtered = useMemo(() => {
    if (!logs) return [];
    return logs.filter((l: any) => {
      if (toolFilter !== "all" && l.tool_name !== toolFilter) return false;
      if (statusFilter !== "all" && l.status !== statusFilter) return false;
      if (searchQuery && !l.input_url?.toLowerCase().includes(searchQuery.toLowerCase()) && !l.error_message?.toLowerCase().includes(searchQuery.toLowerCase())) return false;
      return true;
    });
  }, [logs, toolFilter, statusFilter, searchQuery]);

  const exportCSV = () => {
    if (!filtered.length) return;
    const headers = ["Date", "Tool", "Status", "Input URL", "Error", "Duration (ms)"];
    const rows = filtered.map((l: any) => [
      new Date(l.created_at).toLocaleString(),
      l.tool_name,
      l.status,
      l.input_url || "",
      l.error_message || "",
      l.duration_ms || 0,
    ]);
    const csv = [headers.join(","), ...rows.map((r: any) => r.map((c: any) => `"${String(c).replace(/"/g, '""')}"`).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `ytfetch-logs-${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const statusIcon = (status: string) => {
    if (status === "success") return <CheckCircle className="h-3.5 w-3.5 text-green-500" />;
    if (status === "error") return <AlertCircle className="h-3.5 w-3.5 text-red-500" />;
    return <Clock className="h-3.5 w-3.5 text-yellow-500" />;
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Logs</h1>
          <p className="text-sm text-muted-foreground">{filtered.length} entries</p>
        </div>
        <Button onClick={exportCSV} variant="outline" className="gap-2" disabled={!filtered.length}>
          <Download className="h-4 w-4" /> Export CSV
        </Button>
      </div>

      {/* Filters */}
      <div className="mb-4 flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search URLs or errors..."
            className="bg-card pl-9"
          />
        </div>
        <select
          value={dateRange}
          onChange={(e) => setDateRange(e.target.value as any)}
          className="h-10 rounded-md border border-input bg-card px-3 text-sm text-foreground"
        >
          <option value="today">Today</option>
          <option value="7d">Last 7 Days</option>
          <option value="30d">Last 30 Days</option>
          <option value="all">All Time</option>
        </select>
        <select
          value={toolFilter}
          onChange={(e) => setToolFilter(e.target.value)}
          className="h-10 rounded-md border border-input bg-card px-3 text-sm text-foreground"
        >
          <option value="all">All Tools</option>
          {toolNames.map((t: any) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </select>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="h-10 rounded-md border border-input bg-card px-3 text-sm text-foreground"
        >
          <option value="all">All Status</option>
          <option value="success">Success</option>
          <option value="error">Error</option>
          <option value="pending">Pending</option>
        </select>
      </div>

      {/* Logs Table */}
      <div className="rounded-xl border border-border/50 bg-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/50 bg-muted/30">
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Time</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Tool</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Status</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Input</th>
                <th className="px-4 py-3 text-left text-xs font-medium text-muted-foreground">Error</th>
                <th className="px-4 py-3 text-right text-xs font-medium text-muted-foreground">Duration</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-border/30">
                    <td colSpan={6} className="px-4 py-3"><div className="h-4 w-full animate-pulse rounded bg-muted/50" /></td>
                  </tr>
                ))
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-muted-foreground">No logs found</td>
                </tr>
              ) : (
                filtered.map((log: any, i: number) => (
                  <motion.tr
                    key={log.id}
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: i * 0.02 }}
                    className="border-b border-border/30 transition-colors hover:bg-muted/20"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-muted-foreground">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-xs font-medium text-foreground">{log.tool_name}</td>
                    <td className="px-4 py-3">
                      <span className="flex items-center gap-1.5">
                        {statusIcon(log.status)}
                        <span className={`text-xs ${
                          log.status === "success" ? "text-green-500" : log.status === "error" ? "text-red-500" : "text-yellow-500"
                        }`}>{log.status}</span>
                      </span>
                    </td>
                    <td className="max-w-[200px] truncate px-4 py-3 text-xs text-muted-foreground">{log.input_url || "—"}</td>
                    <td className="max-w-[200px] truncate px-4 py-3 text-xs text-red-400">{log.error_message || "—"}</td>
                    <td className="px-4 py-3 text-right text-xs text-muted-foreground">{log.duration_ms ? `${log.duration_ms}ms` : "—"}</td>
                  </motion.tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminLogs;
