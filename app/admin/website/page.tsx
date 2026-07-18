"use client";
import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { Upload, Save, Globe, Link2, Mail, Building, Layout, Palette, Plus, Trash2, HelpCircle, BarChart3 } from "lucide-react";
import { getStoredAuth } from "@/app/utils/api";
import { authService } from "@/app/utils/services/authService";
import { eventService } from "@/app/utils/services/eventService";
import { useLanguage } from "@/app/context/LanguageContext";

export default function WebsitePage() {
  const { t } = useLanguage();
  const [tenant, setTenant] = useState<any>(null);
  const [brandingLoading, setBrandingLoading] = useState<"logo" | "banner" | null>(null);
  const [brandingMsg, setBrandingMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [saving, setSaving] = useState(false);

  // Customization Form State
  const [form, setForm] = useState({
    name: "",
    slug: "",
    contactEmail: "",
    industryType: "",
    type: "ORGANIZATION",
    description: "",
    websiteUrl: "",
    twitterUrl: "",
    linkedinUrl: "",
    facebookUrl: "",
    instagramUrl: "",
    primaryColor: "#FF4747",
    secondaryColor: "#1a1a1a",
    accentColor: "#F7E998",
    attendeeCountStat: 0,
    eventCountStat: 0,
    partnerCountStat: 0,
    faqsJson: "[]",
  });

  const [faqList, setFaqList] = useState<{ q: string; a: string }[]>([]);
  const [newQ, setNewQ] = useState("");
  const [newA, setNewA] = useState("");

  const fetchWebsiteData = async () => {
    const auth = getStoredAuth();
    if (!auth) return;
    try {
      const [tenantData, evs, regs] = await Promise.all([
        authService.getTenantById(auth.tenantId),
        eventService.getMyEvents().catch(() => []),
        eventService.getMyTenantRegistrations().catch(() => []),
      ]);
      setTenant(tenantData);
      if (tenantData) {
        const liveEventCount = (evs || []).length;
        const liveAttendeeCount = (regs || []).length;

        // Count unique sponsors and vendors across organizer events
        const uniqueSponsors = new Set();
        const uniqueVendors = new Set();
        (evs || []).forEach((e: any) => {
          (e.sponsors || []).forEach((s: any) => uniqueSponsors.add(s.sponsorId || s.id));
          (e.vendors || []).forEach((v: any) => uniqueVendors.add(v.vendorId || v.id));
        });
        const livePartnerCount = uniqueSponsors.size + uniqueVendors.size;

        setForm({
          name: tenantData.name || "",
          slug: tenantData.slug || "",
          contactEmail: tenantData.contactEmail || "",
          industryType: tenantData.industryType || "",
          type: tenantData.type || "ORGANIZATION",
          description: tenantData.description || "",
          websiteUrl: tenantData.websiteUrl || "",
          twitterUrl: tenantData.twitterUrl || "",
          linkedinUrl: tenantData.linkedinUrl || "",
          facebookUrl: tenantData.facebookUrl || "",
          instagramUrl: tenantData.instagramUrl || "",
          primaryColor: tenantData.primaryColor || "#FF4747",
          secondaryColor: tenantData.secondaryColor || "#1a1a1a",
          accentColor: tenantData.accentColor || "#F7E998",
          attendeeCountStat: tenantData.attendeeCountStat || liveAttendeeCount,
          eventCountStat: tenantData.eventCountStat || liveEventCount,
          partnerCountStat: tenantData.partnerCountStat || livePartnerCount,
          faqsJson: tenantData.faqsJson || "[]",
        });

        let parsedFaqs = [];
        try {
          parsedFaqs = JSON.parse(tenantData.faqsJson || "[]");
        } catch {
          parsedFaqs = [];
        }
        setFaqList(parsedFaqs);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleBrandingUpload = async (type: "logo" | "banner", file: File) => {
    const auth = getStoredAuth();
    if (!auth) return;
    setBrandingLoading(type);
    setBrandingMsg(null);
    try {
      const res = type === "logo"
        ? await authService.uploadTenantLogo(auth.tenantId, file)
        : await authService.uploadTenantBanner(auth.tenantId, file);
      const url = res?.url || res?.logoUrl || res?.bannerUrl || Object.values(res || {})[0] as string;
      setTenant((prev: any) => ({ ...prev, [type === "logo" ? "logo" : "bannerUrl"]: url }));
      setBrandingMsg({ type: "success", text: type === "logo" ? t("adminWebsite.messages.logoUploaded") : t("adminWebsite.messages.bannerUploaded") });
    } catch {
      setBrandingMsg({ type: "error", text: type === "logo" ? t("adminWebsite.messages.logoUploadFailed") : t("adminWebsite.messages.bannerUploadFailed") });
    } finally {
      setBrandingLoading(null);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenant?.tenantId) return;
    setSaving(true);
    setBrandingMsg(null);
    try {
      const updated = await authService.updateTenant(tenant.tenantId, {
        ...form,
        faqsJson: JSON.stringify(faqList),
        logo: tenant.logo,
        bannerUrl: tenant.bannerUrl,
      });
      setTenant(updated);
      if (updated) {
        setForm({
          name: updated.name || "",
          slug: updated.slug || "",
          contactEmail: updated.contactEmail || "",
          industryType: updated.industryType || "",
          type: updated.type || "ORGANIZATION",
          description: updated.description || "",
          websiteUrl: updated.websiteUrl || "",
          twitterUrl: updated.twitterUrl || "",
          linkedinUrl: updated.linkedinUrl || "",
          facebookUrl: updated.facebookUrl || "",
          instagramUrl: updated.instagramUrl || "",
          primaryColor: updated.primaryColor || "#FF4747",
          secondaryColor: updated.secondaryColor || "#1a1a1a",
          accentColor: updated.accentColor || "#F7E998",
          attendeeCountStat: updated.attendeeCountStat || 0,
          eventCountStat: updated.eventCountStat || 0,
          partnerCountStat: updated.partnerCountStat || 0,
          faqsJson: updated.faqsJson || "[]",
        });
      }
      setBrandingMsg({ type: "success", text: t("adminWebsite.messages.saveSuccess") });
    } catch (err) {
      console.error(err);
      setBrandingMsg({ type: "error", text: t("adminWebsite.messages.saveFailed") });
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    fetchWebsiteData();
  }, []);

  return (
    <div className="flex bg-[#f9fafb] min-h-screen text-[#374151]">
      <Sidebar />
      <div className="ml-[220px] flex-1 flex flex-col">
        {/* HEADER */}
        <header className="h-[60px] bg-white border-b border-[#e5e7eb] flex items-center justify-between px-8 sticky top-0 z-40">
          <h1 className="font-display text-xl font-bold text-[#EB4203]">{t("adminWebsite.header.title")}</h1>
          <button
            onClick={handleSaveSettings}
            disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 bg-[#EB4203] hover:bg-[#c23b02] text-white text-xs font-bold rounded-xl transition-colors cursor-pointer disabled:opacity-50"
          >
            <Save size={14} />
            {saving ? t("adminWebsite.header.saving") : t("adminWebsite.header.save")}
          </button>
        </header>

        <main className="p-8 max-w-[1400px]">
          {brandingMsg && (
            <div className={`mb-6 px-4 py-3 rounded-xl text-xs font-semibold ${brandingMsg.type === "success" ? "bg-green-50 text-green-700 border border-green-200" : "bg-red-50 text-red-600 border border-red-200"}`}>
              {brandingMsg.text}
            </div>
          )}

          <form onSubmit={handleSaveSettings} className="grid grid-cols-1 lg:grid-cols-3 gap-8">

            {/* LEFT COLUMN: Org Info & Socials (2 Columns wide) */}
            <div className="lg:col-span-2 space-y-8">

              {/* SECTION 1: ORGANIZATION PROFILE */}
              <div className="bg-white border border-[#e5e7eb] rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-[#f3f4f6] pb-3 mb-2">
                  <Building size={16} className="text-[#EB4203]" />
                  <h2 className="font-display font-bold text-sm text-[#1a1a1a]">{t("adminWebsite.orgProfile.title")}</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-semibold text-[#666] uppercase tracking-wider mb-1.5">{t("adminWebsite.orgProfile.nameLabel")}</label>
                    <input
                      type="text"
                      placeholder={t("adminWebsite.orgProfile.namePlaceholder")}
                      value={form.name}
                      onChange={e => setForm({ ...form, name: e.target.value })}
                      className="w-full bg-white border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-xs text-[#1a1a1a] placeholder:text-[#9ca3af] outline-none focus:border-[#EB4203] transition-colors"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-[#666] uppercase tracking-wider mb-1.5">{t("adminWebsite.orgProfile.industryLabel")}</label>
                    <input
                      type="text"
                      placeholder={t("adminWebsite.orgProfile.industryPlaceholder")}
                      value={form.industryType}
                      onChange={e => setForm({ ...form, industryType: e.target.value })}
                      className="w-full bg-white border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-xs text-[#1a1a1a] placeholder:text-[#9ca3af] outline-none focus:border-[#EB4203] transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-semibold text-[#666] uppercase tracking-wider mb-1.5">{t("adminWebsite.orgProfile.typeLabel")}</label>
                    <select
                      value={form.type}
                      onChange={e => setForm({ ...form, type: e.target.value })}
                      className="w-full bg-white border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-xs text-[#1a1a1a] outline-none focus:border-[#EB4203] transition-colors"
                    >
                      <option value="INDIVIDUAL">{t("adminWebsite.orgProfile.typeIndividual")}</option>
                      <option value="ORGANIZATION">{t("adminWebsite.orgProfile.typeOrganization")}</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[10px] font-semibold text-[#666] uppercase tracking-wider mb-1.5">{t("adminWebsite.orgProfile.contactEmailLabel")}</label>
                    <input
                      type="email"
                      placeholder={t("adminWebsite.orgProfile.contactEmailPlaceholder")}
                      value={form.contactEmail}
                      onChange={e => setForm({ ...form, contactEmail: e.target.value })}
                      className="w-full bg-white border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-xs text-[#1a1a1a] placeholder:text-[#9ca3af] outline-none focus:border-[#EB4203] transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-[#666] uppercase tracking-wider mb-1.5">{t("adminWebsite.orgProfile.descriptionLabel")}</label>
                  <textarea
                    rows={4}
                    placeholder={t("adminWebsite.orgProfile.descriptionPlaceholder")}
                    value={form.description}
                    onChange={e => setForm({ ...form, description: e.target.value })}
                    className="w-full bg-white border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-xs text-[#1a1a1a] placeholder:text-[#9ca3af] outline-none focus:border-[#EB4203] transition-colors resize-none"
                  />
                </div>
              </div>

              {/* SECTION 2: SOCIAL MEDIA PROFILES */}
              <div className="bg-white border border-[#e5e7eb] rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-[#f3f4f6] pb-3 mb-2">
                  <Globe size={16} className="text-[#EB4203]" />
                  <h2 className="font-display font-bold text-sm text-[#1a1a1a]">{t("adminWebsite.social.title")}</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="flex items-center gap-1.5 text-[10px] font-semibold text-[#666] uppercase tracking-wider mb-1.5">
                      <Globe size={12} className="text-blue-500" /> {t("adminWebsite.social.websiteLabel")}
                    </label>
                    <input
                      type="url"
                      placeholder={t("adminWebsite.social.websitePlaceholder")}
                      value={form.websiteUrl}
                      onChange={e => setForm({ ...form, websiteUrl: e.target.value })}
                      className="w-full bg-white border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-xs text-[#1a1a1a] placeholder:text-[#9ca3af] outline-none focus:border-[#EB4203] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-1.5 text-[10px] font-semibold text-[#666] uppercase tracking-wider mb-1.5">
                      <Link2 size={12} className="text-[#555]" /> {t("adminWebsite.social.twitterLabel")}
                    </label>
                    <input
                      type="url"
                      placeholder={t("adminWebsite.social.twitterPlaceholder")}
                      value={form.twitterUrl}
                      onChange={e => setForm({ ...form, twitterUrl: e.target.value })}
                      className="w-full bg-white border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-xs text-[#1a1a1a] placeholder:text-[#9ca3af] outline-none focus:border-[#EB4203] transition-colors"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="flex items-center gap-1.5 text-[10px] font-semibold text-[#666] uppercase tracking-wider mb-1.5">
                      <Link2 size={12} className="text-[#0a66c2]" /> {t("adminWebsite.social.linkedinLabel")}
                    </label>
                    <input
                      type="url"
                      placeholder={t("adminWebsite.social.linkedinPlaceholder")}
                      value={form.linkedinUrl}
                      onChange={e => setForm({ ...form, linkedinUrl: e.target.value })}
                      className="w-full bg-white border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-xs text-[#1a1a1a] placeholder:text-[#9ca3af] outline-none focus:border-[#EB4203] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-1.5 text-[10px] font-semibold text-[#666] uppercase tracking-wider mb-1.5">
                      <Link2 size={12} className="text-[#1877f2]" /> {t("adminWebsite.social.facebookLabel")}
                    </label>
                    <input
                      type="url"
                      placeholder={t("adminWebsite.social.facebookPlaceholder")}
                      value={form.facebookUrl}
                      onChange={e => setForm({ ...form, facebookUrl: e.target.value })}
                      className="w-full bg-white border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-xs text-[#1a1a1a] placeholder:text-[#9ca3af] outline-none focus:border-[#EB4203] transition-colors"
                    />
                  </div>

                  <div>
                    <label className="flex items-center gap-1.5 text-[10px] font-semibold text-[#666] uppercase tracking-wider mb-1.5">
                      <Link2 size={12} className="text-[#e1306c]" /> {t("adminWebsite.social.instagramLabel")}
                    </label>
                    <input
                      type="url"
                      placeholder={t("adminWebsite.social.instagramPlaceholder")}
                      value={form.instagramUrl}
                      onChange={e => setForm({ ...form, instagramUrl: e.target.value })}
                      className="w-full bg-white border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-xs text-[#1a1a1a] placeholder:text-[#9ca3af] outline-none focus:border-[#EB4203] transition-colors"
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: FAQ ACCORDION EDITOR */}
              <div className="bg-white border border-[#e5e7eb] rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-[#f3f4f6] pb-3 mb-2">
                  <HelpCircle size={16} className="text-[#EB4203]" />
                  <h2 className="font-display font-bold text-sm text-[#1a1a1a]">{t("adminWebsite.faq.title")}</h2>
                </div>

                {/* List of current FAQs */}
                <div className="space-y-3">
                  {faqList.map((faq, index) => (
                    <div key={index} className="p-3 bg-gray-50 rounded-xl border border-[#e5e7eb] flex items-start justify-between gap-4">
                      <div className="text-xs space-y-1">
                        <p className="font-bold text-[#1a1a1a]">{t("adminWebsite.faq.qPrefix")} {faq.q}</p>
                        <p className="text-[#555]">{t("adminWebsite.faq.aPrefix")} {faq.a}</p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          const updated = faqList.filter((_, i) => i !== index);
                          setFaqList(updated);
                        }}
                        className="text-gray-400 hover:text-red-500 transition-colors p-1 cursor-pointer shrink-0"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  ))}
                  {faqList.length === 0 && (
                    <p className="text-xs text-[#888] italic text-center py-2">{t("adminWebsite.faq.empty")}</p>
                  )}
                </div>

                {/* Add new FAQ inputs */}
                <div className="pt-4 border-t border-[#f3f4f6] space-y-3">
                  <div>
                    <label className="block text-[9px] font-bold text-[#666] uppercase tracking-wider mb-1.5">{t("adminWebsite.faq.newQuestionLabel")}</label>
                    <input
                      type="text"
                      placeholder={t("adminWebsite.faq.newQuestionPlaceholder")}
                      value={newQ}
                      onChange={e => setNewQ(e.target.value)}
                      className="w-full bg-white border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-xs text-[#1a1a1a] placeholder:text-[#9ca3af] outline-none focus:border-[#EB4203] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-[#666] uppercase tracking-wider mb-1.5">{t("adminWebsite.faq.newAnswerLabel")}</label>
                    <textarea
                      rows={2}
                      placeholder={t("adminWebsite.faq.newAnswerPlaceholder")}
                      value={newA}
                      onChange={e => setNewA(e.target.value)}
                      className="w-full bg-white border border-[#e5e7eb] rounded-xl px-4 py-2 text-xs text-[#1a1a1a] placeholder:text-[#9ca3af] outline-none focus:border-[#EB4203] transition-colors resize-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!newQ.trim() || !newA.trim()) return;
                      setFaqList([...faqList, { q: newQ, a: newA }]);
                      setNewQ("");
                      setNewA("");
                    }}
                    className="w-full py-2 bg-gray-100 hover:bg-[#EB4203]/10 text-gray-700 hover:text-[#EB4203] text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer"
                  >
                    <Plus size={14} /> {t("adminWebsite.faq.addButton")}
                  </button>
                </div>
              </div>

            </div>

            {/* RIGHT COLUMN: Logos, Banners & Brand Colors */}
            <div className="space-y-8">

              {/* BRAND ASSETS */}
              <div className="bg-white border border-[#e5e7eb] rounded-2xl p-6 shadow-sm space-y-5">
                <div className="flex items-center gap-2 border-b border-[#f3f4f6] pb-3 mb-1">
                  <Layout size={16} className="text-[#EB4203]" />
                  <h2 className="font-display font-bold text-sm text-[#1a1a1a]">{t("adminWebsite.brandAssets.title")}</h2>
                </div>

                {/* LOGO */}
                <div>
                  <p className="text-[10px] font-semibold text-[#666] uppercase tracking-wider mb-2">{t("adminWebsite.brandAssets.logoLabel")}</p>
                  <label className="flex flex-col items-center justify-center border border-[#e5e7eb] hover:border-[#EB4203] rounded-xl p-4 cursor-pointer transition-colors group bg-[#fdfdfd]">
                    {tenant?.logo ? (
                      <img src={tenant.logo} alt="Logo" className="h-14 max-w-[140px] object-contain rounded-lg mb-2" />
                    ) : (
                      <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center mb-2 border border-[#e5e7eb]">
                        <Upload size={18} className="text-[#888] group-hover:text-[#EB4203] transition-colors" />
                      </div>
                    )}
                    <span className="text-[10px] text-[#555] group-hover:text-[#EB4203] transition-colors font-medium">
                      {brandingLoading === "logo" ? t("adminWebsite.brandAssets.logoUploading") : tenant?.logo ? t("adminWebsite.brandAssets.logoReplace") : t("adminWebsite.brandAssets.logoUpload")}
                    </span>
                    <input type="file" accept="image/*" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleBrandingUpload("logo", f); }} />
                  </label>
                </div>

                {/* BANNER */}
                <div>
                  <p className="text-[10px] font-semibold text-[#666] uppercase tracking-wider mb-2">{t("adminWebsite.brandAssets.bannerLabel")}</p>
                  <label className="flex flex-col items-center justify-center border border-[#e5e7eb] hover:border-[#EB4203] rounded-xl p-4 cursor-pointer transition-colors group bg-[#fdfdfd] overflow-hidden">
                    {tenant?.bannerUrl ? (
                      <img src={tenant.bannerUrl} alt="Banner" className="w-full h-16 object-cover rounded-lg mb-2" />
                    ) : (
                      <div className="w-full h-12 rounded-xl bg-gray-50 flex items-center justify-center mb-2 border border-[#e5e7eb]">
                        <Upload size={18} className="text-[#888] group-hover:text-[#EB4203] transition-colors" />
                      </div>
                    )}
                    <span className="text-[10px] text-[#555] group-hover:text-[#EB4203] transition-colors font-medium font-display">
                      {brandingLoading === "banner" ? t("adminWebsite.brandAssets.bannerUploading") : tenant?.bannerUrl ? t("adminWebsite.brandAssets.bannerReplace") : t("adminWebsite.brandAssets.bannerUpload")}
                    </span>
                    <input type="file" accept="image/*" className="hidden"
                      onChange={e => { const f = e.target.files?.[0]; if (f) handleBrandingUpload("banner", f); }} />
                  </label>
                </div>
              </div>

              {/* BRAND COLOR PALETTE */}
              <div className="bg-white border border-[#e5e7eb] rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-[#f3f4f6] pb-3 mb-1">
                  <Palette size={16} className="text-[#EB4203]" />
                  <h2 className="font-display font-bold text-sm text-[#1a1a1a]">{t("adminWebsite.colors.title")}</h2>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div className="flex flex-col items-center p-2.5 border border-[#e5e7eb] rounded-xl bg-gray-50">
                    <label className="text-[9px] font-bold text-[#666] uppercase tracking-wider mb-1">{t("adminWebsite.colors.primary")}</label>
                    <input
                      type="color"
                      value={form.primaryColor}
                      onChange={e => setForm({ ...form, primaryColor: e.target.value })}
                      className="w-10 h-10 border border-[#e5e7eb] rounded-lg cursor-pointer bg-transparent"
                    />
                  </div>

                  <div className="flex flex-col items-center p-2.5 border border-[#e5e7eb] rounded-xl bg-gray-50">
                    <label className="text-[9px] font-bold text-[#666] uppercase tracking-wider mb-1">{t("adminWebsite.colors.secondary")}</label>
                    <input
                      type="color"
                      value={form.secondaryColor}
                      onChange={e => setForm({ ...form, secondaryColor: e.target.value })}
                      className="w-10 h-10 border border-[#e5e7eb] rounded-lg cursor-pointer bg-transparent"
                    />
                  </div>

                  <div className="flex flex-col items-center p-2.5 border border-[#e5e7eb] rounded-xl bg-gray-50">
                    <label className="text-[9px] font-bold text-[#666] uppercase tracking-wider mb-1">{t("adminWebsite.colors.accent")}</label>
                    <input
                      type="color"
                      value={form.accentColor}
                      onChange={e => setForm({ ...form, accentColor: e.target.value })}
                      className="w-10 h-10 border border-[#e5e7eb] rounded-lg cursor-pointer bg-transparent"
                    />
                  </div>
                </div>
              </div>

              {/* SUBDOMAIN SETTING */}
              <div className="bg-white border border-[#e5e7eb] rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-[#f3f4f6] pb-3 mb-1">
                  <Globe size={16} className="text-[#EB4203]" />
                  <h2 className="font-display font-bold text-sm text-[#1a1a1a]">{t("adminWebsite.subdomain.title")}</h2>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-[#666] uppercase tracking-wider mb-1.5">{t("adminWebsite.subdomain.label")}</label>
                  <div className="flex items-center">
                    <input
                      type="text"
                      placeholder={t("adminWebsite.subdomain.placeholder")}
                      value={form.slug}
                      onChange={e => setForm({ ...form, slug: e.target.value.toLowerCase().replace(/[^a-z0-9-_]/g, "") })}
                      className="w-full bg-white border border-[#e5e7eb] rounded-l-xl px-4 py-2.5 text-xs text-[#1a1a1a] placeholder:text-[#9ca3af] outline-none focus:border-[#EB4203] transition-colors"
                      required
                    />
                    <span className="bg-gray-50 border border-l-0 border-[#e5e7eb] rounded-r-xl px-3 py-2.5 text-[10px] font-semibold text-[#555] shrink-0 font-mono">
                      .yowevent.com
                    </span>
                  </div>
                  <p className="text-[10px] text-[#888] mt-1.5 leading-relaxed">
                    {t("adminWebsite.subdomain.helpText", { slug: form.slug || "yours" })}
                  </p>
                </div>
              </div>

              {/* ORGANIZER STATISTICS */}
              <div className="bg-white border border-[#e5e7eb] rounded-2xl p-6 shadow-sm space-y-4">
                <div className="flex items-center gap-2 border-b border-[#f3f4f6] pb-3 mb-1">
                  <BarChart3 size={16} className="text-[#EB4203]" />
                  <h2 className="font-display font-bold text-sm text-[#1a1a1a]">{t("adminWebsite.stats.title")}</h2>
                </div>

                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[9px] font-bold text-[#666] uppercase tracking-wider mb-1.5">{t("adminWebsite.stats.attendees")}</label>
                    <input
                      type="number"
                      value={form.attendeeCountStat}
                      onChange={e => setForm({ ...form, attendeeCountStat: parseInt(e.target.value) || 0 })}
                      className="w-full bg-white border border-[#e5e7eb] rounded-xl px-3 py-2 text-xs text-[#1a1a1a] placeholder:text-[#9ca3af] outline-none focus:border-[#EB4203] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-[#666] uppercase tracking-wider mb-1.5">{t("adminWebsite.stats.events")}</label>
                    <input
                      type="number"
                      value={form.eventCountStat}
                      onChange={e => setForm({ ...form, eventCountStat: parseInt(e.target.value) || 0 })}
                      className="w-full bg-white border border-[#e5e7eb] rounded-xl px-3 py-2 text-xs text-[#1a1a1a] placeholder:text-[#9ca3af] outline-none focus:border-[#EB4203] transition-colors"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] font-bold text-[#666] uppercase tracking-wider mb-1.5">{t("adminWebsite.stats.partners")}</label>
                    <input
                      type="number"
                      value={form.partnerCountStat}
                      onChange={e => setForm({ ...form, partnerCountStat: parseInt(e.target.value) || 0 })}
                      className="w-full bg-white border border-[#e5e7eb] rounded-xl px-3 py-2 text-xs text-[#1a1a1a] placeholder:text-[#9ca3af] outline-none focus:border-[#EB4203] transition-colors"
                    />
                  </div>
                </div>
              </div>

            </div>

          </form>
        </main>
      </div>
    </div>
  );
}
