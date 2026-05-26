"use client";
import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { Settings, Globe, Shield, RefreshCw } from "lucide-react";
import { getStoredAuth } from "@/app/utils/api";
import { authService } from "@/app/utils/services/authService";

export default function SeoPage() {
  const [settingsId, setSettingsId] = useState<string>("");
  const [form, setForm] = useState({
    theme: "DARK",
    timezone: "UTC",
    language: "en",
    currency: "USD",
    customDomain: "",
    emailSenderName: "",
    notificationPrefs: "EMAIL",
  });

  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState(false);

  const [tenant, setTenant] = useState<any>(null);
  const [tenantForm, setTenantForm] = useState({ name: "", slug: "", industryType: "" });
  const [logoMsg, setLogoMsg] = useState({ type: "", text: "" });

  const fetchSettings = async () => {
    const auth = getStoredAuth();
    if (!auth) return;
    try {
      const allSettings = await authService.getTenantSettings();
      const mySettings = (allSettings || []).find((s: any) => s.tenantId === auth.tenantId);

      if (mySettings) {
        setSettingsId(mySettings.settingId || "");
        setForm({
          theme: mySettings.theme || "DARK",
          timezone: mySettings.timezone || "UTC",
          language: mySettings.language || "en",
          currency: mySettings.currency || "USD",
          customDomain: mySettings.customDomain || "",
          emailSenderName: mySettings.emailSenderName || "",
          notificationPrefs: mySettings.notificationPrefs || "EMAIL",
        });
      }

      const tenantData: any = await authService.getTenantById(auth.tenantId);
      setTenant(tenantData);
      if (tenantData) {
        setTenantForm({
          name: tenantData.name || "",
          slug: tenantData.slug || "",
          industryType: tenantData.industryType || ""
        });
      }
    } catch (err) {
      console.error("Failed to load tenant settings:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setLogoMsg({ type: "", text: "" });
      const auth = getStoredAuth();
      if (!auth) return;
      
      const res: any = await authService.uploadTenantLogo(auth.tenantId, file);
      const newLogo = res.logoUrl || res.url || res.logo || (typeof res === 'string' ? res : "");
      
      setTenant((prev: any) => ({ ...prev, logo: newLogo }));
      setLogoMsg({ type: "success", text: "Workspace logo uploaded successfully!" });
    } catch (err: any) {
      setLogoMsg({ type: "error", text: err.message || "Failed to upload logo" });
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const auth = getStoredAuth();
    if (!auth) return;
    try {
      if (settingsId) {
        // Update
        await authService.updateTenantSetting(settingsId, {
          tenantId: auth.tenantId,
          ...form,
        });
      } else {
        // Create
        const res = await authService.createTenantSetting({
          tenantId: auth.tenantId,
          ...form,
        });
        setSettingsId(res.settingId || "");
      }
      
      if (tenant) {
        await authService.updateTenant(auth.tenantId, {
          ...tenant,
          ...tenantForm
        });
      }

      setToast(true);
      setTimeout(() => setToast(false), 2000);
    } catch (err) {
      console.error("Failed to save settings:", err);
    }
  };

  return (
    <div className="flex bg-[#111] min-h-screen text-[#e0e0e0]">
      <Sidebar />
      <div className="ml-[220px] flex-1 flex flex-col">
        {/* HEADER */}
        <header className="h-[60px] bg-[#161616] border-b border-[#222] flex items-center justify-between px-8 sticky top-0 z-40">
          <h1 className="font-display text-xl font-bold text-white">SEO & General Settings</h1>
          <button
            onClick={fetchSettings}
            className="w-8 h-8 bg-[#222] border border-[#333] rounded-lg flex items-center justify-center hover:bg-[#2a2a2a] transition-colors cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </header>

        <main className="p-8 max-w-3xl space-y-8">
          
          <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl p-8 space-y-6">
            <h2 className="font-display font-bold text-white flex items-center gap-2">
              <Shield size={18} className="text-[#d4c9a8]" /> Workspace Branding
            </h2>
            <p className="text-xs text-[#666] leading-relaxed">
              Upload a logo for your organization. This logo will appear on your event pages and tickets.
            </p>
            
            {logoMsg.text && (
              <div className={`p-4 rounded-xl text-sm ${logoMsg.type === 'success' ? 'bg-green-500/10 text-green-400 border border-green-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                {logoMsg.text}
              </div>
            )}

            <div className="flex items-center gap-6">
              {tenant?.logo ? (
                <img src={tenant.logo} alt="Workspace Logo" className="w-20 h-20 rounded-xl object-cover border-2 border-[#333]" />
              ) : (
                <div className="w-20 h-20 rounded-xl bg-[#111] flex items-center justify-center text-[#555] font-bold text-2xl border-2 border-[#333]">
                  {tenant?.name?.charAt(0) || "T"}
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold text-white mb-2 cursor-pointer bg-[#222] hover:bg-[#2a2a2a] px-4 py-2 rounded-lg transition-colors border border-[#333] text-center">
                  Upload Logo
                  <input type="file" className="hidden" accept="image/*" onChange={handleLogoChange} />
                </label>
                <p className="text-xs text-[#555]">Recommended: Square image, transparent background.</p>
              </div>
            </div>
          </div>

          <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl p-8 space-y-6">
            <h2 className="font-display font-bold text-white flex items-center gap-2">
              <Settings size={18} className="text-[#d4c9a8]" /> Workspace Profile
            </h2>
            <p className="text-xs text-[#666] leading-relaxed">
              Basic details about your organization.
            </p>
            <div className="grid md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-semibold text-[#888] uppercase tracking-wider mb-2">Organization Name</label>
                <input 
                  value={tenantForm.name}
                  onChange={(e) => setTenantForm({...tenantForm, name: e.target.value})}
                  className="w-full bg-[#111] border border-[#333] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#d4c9a8] transition-colors" 
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#888] uppercase tracking-wider mb-2">Organization Slug</label>
                <input 
                  value={tenantForm.slug}
                  onChange={(e) => setTenantForm({...tenantForm, slug: e.target.value})}
                  className="w-full bg-[#111] border border-[#333] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#d4c9a8] transition-colors" 
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#888] uppercase tracking-wider mb-2">Industry</label>
                <input 
                  value={tenantForm.industryType}
                  onChange={(e) => setTenantForm({...tenantForm, industryType: e.target.value})}
                  className="w-full bg-[#111] border border-[#333] rounded-xl px-4 py-3 text-white focus:outline-none focus:border-[#d4c9a8] transition-colors" 
                />
              </div>
            </div>
          </div>

          <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl p-8 space-y-6">
            <h2 className="font-display font-bold text-white flex items-center gap-2">
              <Globe size={18} className="text-[#d4c9a8]" /> Metadata & Domain Configurations
            </h2>
            <p className="text-xs text-[#666] leading-relaxed">
              Configure parameters that control routing prefixes, dynamic search indexing, and email sender contexts.
            </p>

            <form onSubmit={handleSave} className="space-y-5">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-medium text-[#555] uppercase tracking-wider mb-1.5">
                    Custom Domain
                  </label>
                  <div className="relative">
                    <Globe size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#555]" />
                    <input
                      placeholder="events.yourbrand.com"
                      value={form.customDomain}
                      onChange={(e) => setForm({ ...form, customDomain: e.target.value })}
                      className="w-full pl-10 pr-4 py-2.5 bg-[#252525] border border-[#333] rounded-xl text-xs text-white placeholder:text-[#555] outline-none focus:border-[#d4c9a8]/50 transition-colors"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-[#555] uppercase tracking-wider mb-1.5">
                    Sender Mask Name
                  </label>
                  <input
                    placeholder="YoEvent Alerts"
                    value={form.emailSenderName}
                    onChange={(e) => setForm({ ...form, emailSenderName: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#252525] border border-[#333] rounded-xl text-xs text-white placeholder:text-[#555] outline-none focus:border-[#d4c9a8]/50 transition-colors"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-medium text-[#555] uppercase tracking-wider mb-1.5">
                    Local Timezone
                  </label>
                  <select
                    value={form.timezone}
                    onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#252525] border border-[#333] rounded-xl text-xs text-white outline-none focus:border-[#d4c9a8]/50 transition-colors"
                  >
                    <option value="UTC">UTC (GMT+0)</option>
                    <option value="Europe/Paris">Central Europe (GMT+1)</option>
                    <option value="America/New_York">Eastern Standard (GMT-5)</option>
                    <option value="Asia/Tokyo">Japan Standard (GMT+9)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-[#555] uppercase tracking-wider mb-1.5">
                    Default Currency
                  </label>
                  <select
                    value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#252525] border border-[#333] rounded-xl text-xs text-white outline-none focus:border-[#d4c9a8]/50 transition-colors"
                  >
                    <option value="USD">USD ($)</option>
                    <option value="EUR">EUR (€)</option>
                    <option value="GBP">GBP (£)</option>
                    <option value="JPY">JPY (¥)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-medium text-[#555] uppercase tracking-wider mb-1.5">
                    Language Localization
                  </label>
                  <select
                    value={form.language}
                    onChange={(e) => setForm({ ...form, language: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#252525] border border-[#333] rounded-xl text-xs text-white outline-none focus:border-[#d4c9a8]/50 transition-colors"
                  >
                    <option value="en">English (US)</option>
                    <option value="fr">Français (FR)</option>
                    <option value="es">Español (ES)</option>
                    <option value="de">Deutsch (DE)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-[#555] uppercase tracking-wider mb-1.5">
                    Theme Mode
                  </label>
                  <select
                    value={form.theme}
                    onChange={(e) => setForm({ ...form, theme: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#252525] border border-[#333] rounded-xl text-xs text-white outline-none focus:border-[#d4c9a8]/50 transition-colors"
                  >
                    <option value="DARK">Premium Dark Theme</option>
                    <option value="LIGHT">Premium Light Theme</option>
                  </select>
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-3 bg-[#d4c9a8] hover:bg-[#c8bb96] text-[#1a1a1a] text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
              >
                <Shield size={14} /> Save Configurations
              </button>
            </form>
          </div>
        </main>
      </div>

      {/* TOAST */}
      <div
        className={`fixed bottom-6 left-1/2 -translate-x-1/2 bg-[#1a1a1a] border border-[#333] text-white text-sm px-6 py-3 rounded-full shadow-2xl transition-all duration-300 z-50 ${
          toast ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4 pointer-events-none"
        }`}
      >
        ✅ Tenant settings updated successfully!
      </div>
    </div>
  );
}
