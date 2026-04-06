import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Save, AlertTriangle, Globe, Palette, Flag, Plus, Trash2, X, Gauge, Image, Type } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useSiteSettings, useUpdateSetting } from "@/hooks/useSiteSettings";
import { useFeatureFlags, useToggleFlag, useCreateFlag, useDeleteFlag } from "@/hooks/useFeatureFlags";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const AdminSettings = () => {
  const { data: settings, isLoading } = useSiteSettings();
  const updateSetting = useUpdateSetting();
  const { role } = useAuth();
  const canEdit = role === "super_admin" || role === "admin";

  // Maintenance mode
  const [maintenanceEnabled, setMaintenanceEnabled] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState("");
  const [adminBypass, setAdminBypass] = useState(true);

  // Branding
  const [siteName, setSiteName] = useState("MinusFlow ToolKit");
  const [logoUrl, setLogoUrl] = useState("");
  const [logoMode, setLogoMode] = useState<"image" | "text">("image");
  const [logoSize, setLogoSize] = useState(36);
  const [favicon, setFavicon] = useState("");
  const [footerText, setFooterText] = useState("Free tool, for personal use only.");

  // Site status
  const [siteEnabled, setSiteEnabled] = useState(true);

  // Download limits
  const [ytSingleLimit, setYtSingleLimit] = useState("50");
  const [ytBulkLimit, setYtBulkLimit] = useState("10");
  const [ytPlaylistLimit, setYtPlaylistLimit] = useState("20");
  const [tiktokSingleLimit, setTiktokSingleLimit] = useState("50");
  const [tiktokBulkLimit, setTiktokBulkLimit] = useState("20");
  const [igSingleLimit, setIgSingleLimit] = useState("50");
  const [igBulkLimit, setIgBulkLimit] = useState("20");
  const [dailyLimitPerIp, setDailyLimitPerIp] = useState("100");

  useEffect(() => {
    if (settings) {
      const mm = settings.maintenance_mode || {};
      setMaintenanceEnabled(mm.enabled ?? false);
      setMaintenanceMessage(mm.message ?? "");
      setAdminBypass(mm.admin_bypass ?? true);

      const br = settings.branding || {};
      setSiteName(br.site_name ?? "MinusFlow ToolKit");
      setLogoUrl(br.logo_url ?? "");
      setLogoMode(br.logo_mode ?? "image");
      setLogoSize(br.logo_size ?? 36);
      setFavicon(br.favicon ?? "");
      setFooterText(br.footer_text ?? "Free tool, for personal use only.");

      setSiteEnabled(settings.site_status?.enabled ?? true);

      const dl = settings.download_limits || {};
      setYtSingleLimit(String(dl.yt_single ?? 50));
      setYtBulkLimit(String(dl.yt_bulk ?? 10));
      setYtPlaylistLimit(String(dl.yt_playlist ?? 20));
      setTiktokSingleLimit(String(dl.tiktok_single ?? 50));
      setTiktokBulkLimit(String(dl.tiktok_bulk ?? 20));
      setIgSingleLimit(String(dl.ig_single ?? 50));
      setIgBulkLimit(String(dl.ig_bulk ?? 20));
      setDailyLimitPerIp(String(dl.daily_per_ip ?? 100));
    }
  }, [settings]);

  const saveMaintenance = async () => {
    try {
      await updateSetting.mutateAsync({
        key: "maintenance_mode",
        value: { enabled: maintenanceEnabled, message: maintenanceMessage, admin_bypass: adminBypass },
      });
      toast.success("Maintenance settings saved");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const saveBranding = async () => {
    try {
      await updateSetting.mutateAsync({
        key: "branding",
        value: { site_name: siteName, logo_url: logoUrl, logo_mode: logoMode, logo_size: logoSize, favicon, footer_text: footerText, theme: "dark" },
      });
      toast.success("Branding saved");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  const toggleSiteStatus = async () => {
    try {
      await updateSetting.mutateAsync({
        key: "site_status",
        value: { enabled: !siteEnabled },
      });
      setSiteEnabled(!siteEnabled);
      toast.success(`Site ${!siteEnabled ? "enabled" : "disabled"}`);
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  if (isLoading) {
    return <div className="space-y-4">{[1, 2, 3].map((i) => <div key={i} className="h-40 animate-pulse rounded-xl bg-card" />)}</div>;
  }

  return (
    <div>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-foreground">Settings</h1>
        <p className="text-sm text-muted-foreground">Manage site configuration</p>
      </div>

      <div className="space-y-6">
        {/* Site Status */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="rounded-xl border border-border/50 bg-card p-6">
          <div className="mb-4 flex items-center gap-3">
            <Globe className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Site Status</h2>
          </div>
          <div className="flex items-center justify-between rounded-lg bg-muted/50 p-4">
            <div>
              <p className="text-sm font-medium text-foreground">Website</p>
              <p className="text-xs text-muted-foreground">{siteEnabled ? "Site is live and accessible" : "Site is offline"}</p>
            </div>
            {canEdit && (
              <button
                onClick={toggleSiteStatus}
                className={`relative h-7 w-12 rounded-full transition-colors ${siteEnabled ? "bg-green-500" : "bg-muted"}`}
              >
                <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${siteEnabled ? "left-5.5" : "left-0.5"}`} />
              </button>
            )}
          </div>
        </motion.div>

        {/* Maintenance Mode */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="rounded-xl border border-border/50 bg-card p-6">
          <div className="mb-4 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            <h2 className="text-lg font-semibold text-foreground">Maintenance Mode</h2>
          </div>
          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-lg bg-muted/50 p-4">
              <div>
                <p className="text-sm font-medium text-foreground">Enable Maintenance</p>
                <p className="text-xs text-muted-foreground">Shows maintenance page to all visitors</p>
              </div>
              {canEdit && (
                <button
                  onClick={() => setMaintenanceEnabled(!maintenanceEnabled)}
                  className={`relative h-7 w-12 rounded-full transition-colors ${maintenanceEnabled ? "bg-yellow-500" : "bg-muted"}`}
                >
                  <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition-all ${maintenanceEnabled ? "left-5.5" : "left-0.5"}`} />
                </button>
              )}
            </div>
            <div>
              <label className="mb-1.5 block text-xs text-muted-foreground">Maintenance Message</label>
              <Input
                value={maintenanceMessage}
                onChange={(e) => setMaintenanceMessage(e.target.value)}
                placeholder="We'll be back soon..."
                disabled={!canEdit}
                className="bg-muted/50"
              />
            </div>
            <div className="flex items-center gap-3">
              <input
                type="checkbox"
                checked={adminBypass}
                onChange={(e) => setAdminBypass(e.target.checked)}
                disabled={!canEdit}
                className="h-4 w-4 rounded border-border accent-primary"
              />
              <label className="text-sm text-muted-foreground">Allow admin bypass</label>
            </div>
            {canEdit && (
              <Button onClick={saveMaintenance} disabled={updateSetting.isPending} className="gap-2">
                <Save className="h-4 w-4" /> Save Maintenance Settings
              </Button>
            )}
          </div>
        </motion.div>

        {/* Branding */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="rounded-xl border border-border/50 bg-card p-6">
          <div className="mb-4 flex items-center gap-3">
            <Palette className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Branding</h2>
          </div>
          <div className="space-y-4">
            <div>
              <label className="mb-1.5 block text-xs text-muted-foreground">Site Name</label>
              <Input
                value={siteName}
                onChange={(e) => setSiteName(e.target.value)}
                disabled={!canEdit}
                className="bg-muted/50"
              />
            </div>

            {/* Logo Mode */}
            <div>
              <label className="mb-2 block text-xs text-muted-foreground">Logo Display Mode</label>
              <div className="flex gap-2">
                <button
                  onClick={() => canEdit && setLogoMode("image")}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                    logoMode === "image" ? "bg-primary/15 text-primary border border-primary/30" : "bg-muted/50 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Image className="h-4 w-4" /> Image Logo
                </button>
                <button
                  onClick={() => canEdit && setLogoMode("text")}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-medium transition-colors ${
                    logoMode === "text" ? "bg-primary/15 text-primary border border-primary/30" : "bg-muted/50 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Type className="h-4 w-4" /> Text Logo
                </button>
              </div>
            </div>

            {logoMode === "image" && (
              <div className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs text-muted-foreground">Logo URL (leave empty to use default uploaded logo)</label>
                  <Input
                    value={logoUrl}
                    onChange={(e) => setLogoUrl(e.target.value)}
                    placeholder="https://example.com/logo.png"
                    disabled={!canEdit}
                    className="bg-muted/50"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs text-muted-foreground">Logo Size: {logoSize}px</label>
                  <input
                    type="range"
                    min="20"
                    max="80"
                    value={logoSize}
                    onChange={(e) => setLogoSize(Number(e.target.value))}
                    disabled={!canEdit}
                    className="w-full accent-primary"
                  />
                  <div className="mt-1 flex justify-between text-[10px] text-muted-foreground">
                    <span>20px</span><span>50px</span><span>80px</span>
                  </div>
                </div>
                <div className="rounded-lg bg-muted/30 p-3">
                  <p className="mb-2 text-[11px] text-muted-foreground">Preview:</p>
                  <div className="inline-block rounded-lg bg-background p-3">
                    {logoUrl ? (
                      <img src={logoUrl} alt="Logo preview" style={{ height: logoSize }} />
                    ) : (
                      <p className="text-xs text-muted-foreground">Using default uploaded logo ({logoSize}px height)</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {logoMode === "text" && (
              <div className="rounded-lg bg-muted/30 p-3">
                <p className="mb-2 text-[11px] text-muted-foreground">Preview:</p>
                <div className="inline-block rounded-lg bg-background px-4 py-2">
                  <span className="font-bold text-foreground" style={{ fontSize: logoSize }}>{siteName}</span>
                </div>
              </div>
            )}

            {/* Favicon */}
            <div>
              <label className="mb-1.5 block text-xs text-muted-foreground">Favicon URL (leave empty for default)</label>
              <Input
                value={favicon}
                onChange={(e) => setFavicon(e.target.value)}
                placeholder="https://example.com/favicon.ico"
                disabled={!canEdit}
                className="bg-muted/50"
              />
            </div>

            {/* Footer Text */}
            <div>
              <label className="mb-1.5 block text-xs text-muted-foreground">Footer Text</label>
              <Input
                value={footerText}
                onChange={(e) => setFooterText(e.target.value)}
                disabled={!canEdit}
                className="bg-muted/50"
                placeholder="Free tool, for personal use only."
              />
            </div>

            {canEdit && (
              <Button onClick={saveBranding} disabled={updateSetting.isPending} className="gap-2">
                <Save className="h-4 w-4" /> Save Branding
              </Button>
            )}
          </div>
        </motion.div>

        {/* Download Limits */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.25 }} className="rounded-xl border border-border/50 bg-card p-6">
          <div className="mb-4 flex items-center gap-3">
            <Gauge className="h-5 w-5 text-primary" />
            <h2 className="text-lg font-semibold text-foreground">Download Limits</h2>
          </div>
          <p className="mb-4 text-xs text-muted-foreground">Control maximum downloads per tool and daily limits per IP address.</p>
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: "YT Single (per session)", value: ytSingleLimit, set: setYtSingleLimit },
                { label: "YT Bulk (max URLs)", value: ytBulkLimit, set: setYtBulkLimit },
                { label: "YT Playlist (max videos)", value: ytPlaylistLimit, set: setYtPlaylistLimit },
                { label: "TikTok Single (per session)", value: tiktokSingleLimit, set: setTiktokSingleLimit },
                { label: "TikTok Bulk (max URLs)", value: tiktokBulkLimit, set: setTiktokBulkLimit },
                { label: "IG Single (per session)", value: igSingleLimit, set: setIgSingleLimit },
                { label: "IG Bulk (max URLs)", value: igBulkLimit, set: setIgBulkLimit },
                { label: "Daily Limit per IP", value: dailyLimitPerIp, set: setDailyLimitPerIp },
              ].map((item) => (
                <div key={item.label} className="rounded-lg bg-muted/30 p-3">
                  <label className="mb-1.5 block text-[11px] font-medium text-muted-foreground">{item.label}</label>
                  <Input
                    type="number"
                    value={item.value}
                    onChange={(e) => item.set(e.target.value)}
                    disabled={!canEdit}
                    className="h-9 bg-muted/50 text-sm"
                    min="1"
                  />
                </div>
              ))}
            </div>
            {canEdit && (
              <Button
                onClick={async () => {
                  try {
                    await updateSetting.mutateAsync({
                      key: "download_limits",
                      value: {
                        yt_single: Number(ytSingleLimit),
                        yt_bulk: Number(ytBulkLimit),
                        yt_playlist: Number(ytPlaylistLimit),
                        tiktok_single: Number(tiktokSingleLimit),
                        tiktok_bulk: Number(tiktokBulkLimit),
                        ig_single: Number(igSingleLimit),
                        ig_bulk: Number(igBulkLimit),
                        daily_per_ip: Number(dailyLimitPerIp),
                      },
                    });
                    toast.success("Download limits saved");
                  } catch (err: any) {
                    toast.error(err.message);
                  }
                }}
                disabled={updateSetting.isPending}
                className="gap-2"
              >
                <Save className="h-4 w-4" /> Save Download Limits
              </Button>
            )}
          </div>
        </motion.div>

        {/* Feature Flags */}
        <FeatureFlagsSection canEdit={canEdit} />
      </div>
    </div>
  );
};

const FeatureFlagsSection = ({ canEdit }: { canEdit: boolean }) => {
  const { data: flags, isLoading } = useFeatureFlags();
  const toggleFlag = useToggleFlag();
  const createFlag = useCreateFlag();
  const deleteFlag = useDeleteFlag();
  const [showAdd, setShowAdd] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  const handleCreate = async () => {
    if (!newName.trim()) return;
    try {
      await createFlag.mutateAsync({ name: newName.trim().toLowerCase().replace(/\s+/g, "_"), description: newDesc, enabled: true });
      toast.success("Flag created");
      setShowAdd(false);
      setNewName("");
      setNewDesc("");
    } catch (err: any) {
      toast.error(err.message);
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="rounded-xl border border-border/50 bg-card p-6">
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Flag className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold text-foreground">Feature Flags</h2>
        </div>
        {canEdit && (
          <button
            onClick={() => setShowAdd(!showAdd)}
            className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            {showAdd ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          </button>
        )}
      </div>

      {showAdd && (
        <div className="mb-4 space-y-2 rounded-lg bg-muted/30 p-4">
          <Input value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="flag_name" className="bg-muted/50" />
          <Input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Description" className="bg-muted/50" />
          <Button size="sm" onClick={handleCreate} disabled={createFlag.isPending}>Create Flag</Button>
        </div>
      )}

      <div className="space-y-2">
        {isLoading ? (
          [1, 2, 3].map((i) => <div key={i} className="h-12 animate-pulse rounded-lg bg-muted/30" />)
        ) : flags?.map((flag) => (
          <div key={flag.id} className="flex items-center justify-between rounded-lg bg-muted/30 px-4 py-3">
            <div>
              <p className="text-sm font-medium text-foreground">{flag.name}</p>
              <p className="text-xs text-muted-foreground">{flag.description}</p>
            </div>
            <div className="flex items-center gap-2">
              {canEdit && (
                <>
                  <button
                    onClick={() => toggleFlag.mutate({ id: flag.id, enabled: !flag.enabled })}
                    className={`relative h-6 w-10 rounded-full transition-colors ${flag.enabled ? "bg-green-500" : "bg-muted"}`}
                  >
                    <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${flag.enabled ? "left-4.5" : "left-0.5"}`} />
                  </button>
                  <button
                    onClick={() => { if (confirm(`Delete flag "${flag.name}"?`)) deleteFlag.mutate(flag.id); }}
                    className="rounded-lg p-1.5 text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </>
              )}
              {!canEdit && (
                <span className={`text-xs font-medium ${flag.enabled ? "text-green-500" : "text-red-500"}`}>
                  {flag.enabled ? "ON" : "OFF"}
                </span>
              )}
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
};

export default AdminSettings;
