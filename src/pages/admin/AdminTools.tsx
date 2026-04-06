import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plus, Trash2, GripVertical, Eye, EyeOff, Pencil, X, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useTools, useUpdateTool, useDeleteTool, useCreateTool, type Tool } from "@/hooks/useTools";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";

const statusOptions = ["active", "maintenance", "disabled"] as const;
const iconOptions = ["Youtube", "Music", "Instagram", "FileText", "Image", "Download", "Wrench", "Globe", "Video", "Mic"];

const AdminTools = () => {
  const { data: tools, isLoading } = useTools();
  const updateTool = useUpdateTool();
  const deleteTool = useDeleteTool();
  const createTool = useCreateTool();
  const { role } = useAuth();
  const canEdit = role === "super_admin" || role === "admin";

  const [editingId, setEditingId] = useState<string | null>(null);
  const [editData, setEditData] = useState<Partial<Tool>>({});
  const [showAdd, setShowAdd] = useState(false);
  const [newTool, setNewTool] = useState({
    name: "",
    slug: "",
    route: "/",
    description: "",
    icon: "Wrench",
    group_name: "Downloaders",
    status: "active" as const,
    is_visible: true,
    is_enabled: true,
    sort_order: 0,
  });

  const startEdit = (tool: Tool) => {
    setEditingId(tool.id);
    setEditData({ ...tool });
  };

  const saveEdit = async () => {
    if (!editingId || !editData) return;
    try {
      await updateTool.mutateAsync({ id: editingId, ...editData });
      toast.success("Tool updated");
      setEditingId(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to update");
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"? This cannot be undone.`)) return;
    try {
      await deleteTool.mutateAsync(id);
      toast.success("Tool deleted");
    } catch (err: any) {
      toast.error(err.message || "Failed to delete");
    }
  };

  const handleCreate = async () => {
    if (!newTool.name || !newTool.route) {
      toast.error("Name and route are required");
      return;
    }
    const slug = newTool.slug || newTool.name.toLowerCase().replace(/\s+/g, "-");
    try {
      await createTool.mutateAsync({ ...newTool, slug, sort_order: (tools?.length ?? 0) + 1 });
      toast.success("Tool created");
      setShowAdd(false);
      setNewTool({ name: "", slug: "", route: "/", description: "", icon: "Wrench", group_name: "Downloaders", status: "active", is_visible: true, is_enabled: true, sort_order: 0 });
    } catch (err: any) {
      toast.error(err.message || "Failed to create");
    }
  };

  const toggleField = async (id: string, field: "is_visible" | "is_enabled", current: boolean) => {
    try {
      await updateTool.mutateAsync({ id, [field]: !current });
      toast.success("Updated");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const cycleStatus = async (id: string, current: string) => {
    const next = current === "active" ? "maintenance" : current === "maintenance" ? "disabled" : "active";
    try {
      await updateTool.mutateAsync({ id, status: next });
      toast.success(`Status → ${next}`);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-20 animate-pulse rounded-xl bg-card" />
        ))}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Tool Management</h1>
          <p className="text-sm text-muted-foreground">{tools?.length ?? 0} tools configured</p>
        </div>
        {canEdit && (
          <Button onClick={() => setShowAdd(!showAdd)} variant={showAdd ? "outline" : "default"} className="gap-2">
            {showAdd ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
            {showAdd ? "Cancel" : "Add Tool"}
          </Button>
        )}
      </div>

      {/* Add Tool Form */}
      <AnimatePresence>
        {showAdd && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="mb-6 overflow-hidden rounded-xl border border-primary/30 bg-card p-5"
          >
            <h3 className="mb-4 text-sm font-semibold text-foreground">New Tool</h3>
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Name *</label>
                <Input value={newTool.name} onChange={(e) => setNewTool({ ...newTool, name: e.target.value })} placeholder="Tool Name" className="bg-muted/50" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Route *</label>
                <Input value={newTool.route} onChange={(e) => setNewTool({ ...newTool, route: e.target.value })} placeholder="/route" className="bg-muted/50" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Description</label>
                <Input value={newTool.description} onChange={(e) => setNewTool({ ...newTool, description: e.target.value })} placeholder="Short description" className="bg-muted/50" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Group</label>
                <Input value={newTool.group_name} onChange={(e) => setNewTool({ ...newTool, group_name: e.target.value })} placeholder="Downloaders" className="bg-muted/50" />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Icon</label>
                <select
                  value={newTool.icon}
                  onChange={(e) => setNewTool({ ...newTool, icon: e.target.value })}
                  className="h-10 w-full rounded-md border border-input bg-muted/50 px-3 text-sm text-foreground"
                >
                  {iconOptions.map((ic) => (
                    <option key={ic} value={ic}>{ic}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Status</label>
                <select
                  value={newTool.status}
                  onChange={(e) => setNewTool({ ...newTool, status: e.target.value as any })}
                  className="h-10 w-full rounded-md border border-input bg-muted/50 px-3 text-sm text-foreground"
                >
                  {statusOptions.map((s) => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
            <Button onClick={handleCreate} className="mt-4 gap-2" disabled={createTool.isPending}>
              <Plus className="h-4 w-4" /> Create Tool
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tools List */}
      <div className="space-y-2">
        {tools?.map((tool, i) => (
          <motion.div
            key={tool.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="rounded-xl border border-border/50 bg-card p-4 transition-colors hover:border-border"
          >
            {editingId === tool.id ? (
              /* Edit Mode */
              <div className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-3">
                  <Input
                    value={editData.name || ""}
                    onChange={(e) => setEditData({ ...editData, name: e.target.value })}
                    placeholder="Name"
                    className="bg-muted/50"
                  />
                  <Input
                    value={editData.route || ""}
                    onChange={(e) => setEditData({ ...editData, route: e.target.value })}
                    placeholder="Route"
                    className="bg-muted/50"
                  />
                  <Input
                    value={editData.description || ""}
                    onChange={(e) => setEditData({ ...editData, description: e.target.value })}
                    placeholder="Description"
                    className="bg-muted/50"
                  />
                </div>
                <div className="flex gap-2">
                  <Button size="sm" onClick={saveEdit} disabled={updateTool.isPending} className="gap-1">
                    <Check className="h-3.5 w-3.5" /> Save
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              /* View Mode */
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <GripVertical className="h-4 w-4 text-muted-foreground/40" />
                  <div className={`h-2.5 w-2.5 rounded-full ${
                    tool.status === "active" ? "bg-green-500" : tool.status === "maintenance" ? "bg-yellow-500" : "bg-red-500"
                  }`} />
                  <div>
                    <p className="text-sm font-medium text-foreground">{tool.name}</p>
                    <p className="text-xs text-muted-foreground">{tool.route} · {tool.group_name}</p>
                  </div>
                </div>
                {canEdit && (
                  <div className="flex items-center gap-1.5">
                    <button
                      onClick={() => cycleStatus(tool.id, tool.status)}
                      className={`rounded-md px-2 py-1 text-[10px] font-medium uppercase tracking-wider transition-colors ${
                        tool.status === "active"
                          ? "bg-green-500/10 text-green-500 hover:bg-green-500/20"
                          : tool.status === "maintenance"
                          ? "bg-yellow-500/10 text-yellow-500 hover:bg-yellow-500/20"
                          : "bg-red-500/10 text-red-500 hover:bg-red-500/20"
                      }`}
                    >
                      {tool.status}
                    </button>
                    <button
                      onClick={() => toggleField(tool.id, "is_visible", tool.is_visible)}
                      className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                      title={tool.is_visible ? "Visible" : "Hidden"}
                    >
                      {tool.is_visible ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </button>
                    <button
                      onClick={() => startEdit(tool)}
                      className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(tool.id, tool.name)}
                      className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                )}
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default AdminTools;
