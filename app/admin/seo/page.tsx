"use client";
import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { Settings, Globe, Shield, RefreshCw, Lock, Sparkles, ExternalLink, CheckCircle, XCircle, Zap } from "lucide-react";
import { api, getStoredAuth, clearStoredAuth } from "@/app/utils/api";
import { useRouter } from "next/navigation";
import { authService } from "@/app/utils/services/authService";
import { useLanguage } from "@/app/context/LanguageContext";

const FONT_OPTIONS = [
  { value: "Inter", label: "Inter (Default)" },
  { value: "Roboto", label: "Roboto" },
  { value: "Poppins", label: "Poppins" },
  { value: "Playfair Display", label: "Playfair Display" },
  { value: "Montserrat", label: "Montserrat" },
  { value: "Lato", label: "Lato" },
];

function PlanBadge({ required }: { required: "BASIC" | "PREMIUM" }) {
  const color = required === "PREMIUM" ? "text-amber-400 bg-amber-400/10 border-amber-400/20" : "text-sky-400 bg-sky-400/10 border-sky-400/20";
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${color}`}>
      <Lock size={8} /> {required}+
    </span>
  );
}

export default function SeoPage() {
  const router = useRouter();
  const { t } = useLanguage();
  const [settingsId, setSettingsId] = useState<string>("");
  const [planTier, setPlanTier] = useState<string>("FREE");

  const [form, setForm] = useState({
    theme: "DARK",
    timezone: "UTC",
    language: "en",
    currency: "XAF",
    customDomain: "",
    emailSenderName: "",
    notificationPrefs: "EMAIL",
    primaryColor: "#F7E998",
    secondaryColor: "#FF4747",
    fontFamily: "Inter",
    faviconUrl: "",
    // Premium fields
    accentColor: "#c8a96e",
    backgroundImageUrl: "",
    socialLinks: "",
    customCss: "",
    // Payout fields
    payoutMomoNumber: "",
    payoutMomoProvider: "MTN",
    payoutCardNumber: "",
    payoutCardExpiry: "",
  });

  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const [tenant, setTenant] = useState<any>(null);
  const [tenantForm, setTenantForm] = useState({ name: "", slug: "", industryType: "" });
  const [logoMsg, setLogoMsg] = useState({ type: "", text: "" });

  const [stripeStatus, setStripeStatus] = useState<any>(null);
  const [stripeConnecting, setStripeConnecting] = useState(false);

  const isPremium = planTier?.toUpperCase() === "PREMIUM";
  const isBasicOrAbove = planTier?.toUpperCase() === "BASIC" || isPremium;

  const fetchSettings = async () => {
    const auth = getStoredAuth();
    if (!auth) return;
    setPlanTier(auth.planTier || "FREE");
    setLoading(true);
    try {
      const mySettings = await authService.getMyTenantSettings().catch(() => null);
      if (mySettings) {
        setSettingsId(mySettings.settingId || "");
        setForm({
          theme: mySettings.theme || "DARK",
          timezone: mySettings.timezone || "UTC",
          language: mySettings.language || "en",
          currency: mySettings.currency || "XAF",
          customDomain: mySettings.customDomain || "",
          emailSenderName: mySettings.emailSenderName || "",
          notificationPrefs: mySettings.notificationPrefs || "EMAIL",
          primaryColor: mySettings.primaryColor || "#F7E998",
          secondaryColor: mySettings.secondaryColor || "#FF4747",
          fontFamily: mySettings.fontFamily || "Inter",
          faviconUrl: mySettings.faviconUrl || "",
          accentColor: mySettings.accentColor || "#c8a96e",
          backgroundImageUrl: mySettings.backgroundImageUrl || "",
          socialLinks: mySettings.socialLinks || "",
          customCss: mySettings.customCss || "",
          payoutMomoNumber: mySettings.payoutMomoNumber || "",
          payoutMomoProvider: mySettings.payoutMomoProvider || "MTN",
          payoutCardNumber: mySettings.payoutCardNumber || "",
          payoutCardExpiry: mySettings.payoutCardExpiry || "",
        });
      }

      const tenantData: any = await authService.getTenantById(auth.tenantId);
      setTenant(tenantData);
      if (tenantData) {
        setTenantForm({
          name: tenantData.name || "",
          slug: tenantData.slug || "",
          industryType: tenantData.industryType || "",
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
      const targetTenantId = tenant?.tenantId || auth?.tenantId;
      if (!targetTenantId) {
        setLogoMsg({ type: "error", text: "Tenant ID missing. Please refresh and try again." });
        return;
      }
      const res: any = await authService.uploadTenantLogo(targetTenantId, file);
      const newLogo = res.logoUrl || res.url || res.logo || (typeof res === "string" ? res : "");
      setTenant((prev: any) => ({ ...prev, logo: newLogo }));
      setLogoMsg({ type: "success", text: t("adminSeo.toast.logoUploaded") });
    } catch (err: any) {
      setLogoMsg({ type: "error", text: err.message || t("adminSeo.toast.logoUploadFailed") });
    }
  };

  const loadStripeStatus = async () => {
    const auth = getStoredAuth();
    if (!auth?.tenantId) return;
    try {
      const status = await authService.stripeStatus(auth.tenantId);
      setStripeStatus(status);
    } catch { /* not critical */ }
  };

  const handleStripeConnect = async () => {
    const auth = getStoredAuth();
    if (!auth?.tenantId) return;
    setStripeConnecting(true);
    try {
      const result = await authService.stripeConnect(auth.tenantId);
      if (result.mode === "mock") {
        showToast("success", t("adminSeo.toast.stripeMockCreated"));
        loadStripeStatus();
      } else if (result.onboardingUrl) {
        window.location.href = result.onboardingUrl;
      }
    } catch (err: any) {
      showToast("error", err.message || t("adminSeo.toast.stripeConnectFailed"));
    } finally {
      setStripeConnecting(false);
    }
  };

  useEffect(() => {
    fetchSettings();
    loadStripeStatus();
    // Handle redirect back from Stripe onboarding
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      const ret = params.get("stripe_return");
      if (ret === "success" || ret === "mock_success") {
        showToast("success", t("adminSeo.toast.stripeOnboardingComplete"));
        setTimeout(loadStripeStatus, 1500);
      } else if (ret === "refresh") {
        showToast("error", t("adminSeo.toast.stripeLinkExpired"));
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3000);
  };

  const handleSave = async (e: React.FormEvent<HTMLFormElement>): Promise<void> => {
    e.preventDefault();
    const auth = getStoredAuth();
    if (!auth) return;
    try {
      // Strip Premium fields if not Premium to avoid server rejection
      const payload: any = { tenantId: auth.tenantId, ...form };
      if (!isPremium) {
        delete payload.accentColor;
        delete payload.backgroundImageUrl;
        delete payload.socialLinks;
        delete payload.customCss;
        delete payload.customDomain;
      }

      if (settingsId) {
        await authService.updateTenantSetting(settingsId, payload);
      } else {
        const res = await authService.createTenantSetting(payload);
        setSettingsId(res.settingId || "");
      }

      if (tenant) {
        await authService.updateTenant(auth.tenantId, { ...tenant, ...tenantForm });
      }
      showToast("success", t("adminSeo.toast.settingsSaved"));
    } catch (err: any) {
      showToast("error", err.message || t("adminSeo.toast.settingsSaveFailed"));
    }
  };

  const handleDowngradeToIndividual = async () => {
    if (!confirm("⚠️ " + t("adminSeo.danger.downgradeConfirm"))) return;
    try {
      await api.post("/api/v1/auth/downgrade-to-individual");
      showToast("success", t("adminSeo.toast.downgradeSuccess"));
      setTimeout(() => {
        clearStoredAuth();
        router.push("/login");
      }, 2000);
    } catch (err: any) {
      showToast("error", err.message || t("adminSeo.toast.downgradeFailed"));
    }
  };

  const lockedInputClass = "w-full px-4 py-2.5 bg-[#f5f5f5] border border-[#e5e7eb] rounded-xl text-xs text-[#888] placeholder:text-[#333] outline-none cursor-not-allowed";
  const inputClass = "w-full px-4 py-2.5 bg-[#ffffff] border border-[#e5e7eb] rounded-xl text-xs text-[#1a1a1a] placeholder:text-[#555] outline-none focus:border-[#F7E998]/50 transition-colors";

  return (
    <div className="flex bg-[#f9fafb] min-h-screen text-[#374151]">
      <Sidebar />
      <div className="ml-[220px] flex-1 flex flex-col">

        {/* HEADER */}
        <header className="h-[60px] bg-white border-b border-[#e5e7eb] flex items-center justify-between px-8 sticky top-0 z-40">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-xl font-bold text-[#FF4747]">{t("adminSeo.header.title")}</h1>
            <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider border ${
              isPremium ? "text-amber-400 bg-amber-400/10 border-amber-400/20" :
              isBasicOrAbove ? "text-sky-400 bg-sky-400/10 border-sky-400/20" :
              "text-[#888] bg-[#f5f5f5] border-[#e5e7eb]"
            }`}>
              {t("adminSeo.header.planBadge", { tier: planTier || "FREE" })}
            </span>
          </div>
          <button
            onClick={fetchSettings}
            className="w-8 h-8 bg-white border border-[#e5e7eb] rounded-lg flex items-center justify-center hover:bg-[#f5f5f5] transition-colors cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </header>

        <main className="p-8 max-w-3xl space-y-8">


          {/* METADATA & DOMAIN */}
          <div className="bg-white border border-[#e5e7eb] rounded-2xl p-8 space-y-6">
            <h2 className="font-display font-bold text-[#FF4747] flex items-center gap-2">
              <Globe size={18} className="text-[#FF4747]" /> {t("adminSeo.metadata.title")}
            </h2>
            <p className="text-xs text-[#666] leading-relaxed">
              {t("adminSeo.metadata.subtitle")}
            </p>

            <form onSubmit={handleSave} className="space-y-5">
              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-medium text-[#555] uppercase tracking-wider mb-1.5 flex items-center gap-2">
                    {t("adminSeo.metadata.customDomainLabel")} {!isPremium && <PlanBadge required="PREMIUM" />}
                  </label>
                  <div className="relative">
                    <Globe size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#555]" />
                    <input
                      placeholder={isPremium ? t("adminSeo.metadata.customDomainPlaceholder") : t("adminSeo.metadata.customDomainLocked")}
                      value={isPremium ? form.customDomain : ""}
                      disabled={!isPremium}
                      onChange={(e) => setForm({ ...form, customDomain: e.target.value })}
                      className={`pl-10 pr-4 py-2.5 ${isPremium ? inputClass.replace("w-full ", "") : "w-full pl-10 pr-4 py-2.5 " + lockedInputClass.replace("w-full ", "")}`}
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-[#555] uppercase tracking-wider mb-1.5">{t("adminSeo.metadata.senderNameLabel")}</label>
                  <input placeholder={t("adminSeo.metadata.senderNamePlaceholder")} value={form.emailSenderName}
                    onChange={(e) => setForm({ ...form, emailSenderName: e.target.value })}
                    className={inputClass} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-medium text-[#555] uppercase tracking-wider mb-1.5">{t("adminSeo.metadata.timezoneLabel")}</label>
                  <select value={form.timezone}
                    onChange={(e) => setForm({ ...form, timezone: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#ffffff] border border-[#e5e7eb] rounded-xl text-xs text-[#1a1a1a] outline-none focus:border-[#FF4747] transition-colors">
                    <option value="UTC">{t("adminSeo.metadata.timezoneUtc")}</option>
                    <option value="Europe/Paris">{t("adminSeo.metadata.timezoneParis")}</option>
                    <option value="America/New_York">{t("adminSeo.metadata.timezoneNewYork")}</option>
                    <option value="Asia/Tokyo">{t("adminSeo.metadata.timezoneTokyo")}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-[#555] uppercase tracking-wider mb-1.5">{t("adminSeo.metadata.currencyLabel")}</label>
                  <select value={form.currency}
                    onChange={(e) => setForm({ ...form, currency: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#ffffff] border border-[#e5e7eb] rounded-xl text-xs text-[#1a1a1a] outline-none focus:border-[#FF4747] transition-colors">
                    <option value="USD">{t("adminSeo.metadata.currencyUsd")}</option>
                    <option value="EUR">{t("adminSeo.metadata.currencyEur")}</option>
                    <option value="GBP">{t("adminSeo.metadata.currencyGbp")}</option>
                    <option value="JPY">{t("adminSeo.metadata.currencyJpy")}</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-6">
                <div>
                  <label className="block text-[10px] font-medium text-[#555] uppercase tracking-wider mb-1.5">{t("adminSeo.metadata.languageLabel")}</label>
                  <select value={form.language}
                    onChange={(e) => setForm({ ...form, language: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#ffffff] border border-[#e5e7eb] rounded-xl text-xs text-[#1a1a1a] outline-none focus:border-[#FF4747] transition-colors">
                    <option value="en">{t("adminSeo.metadata.languageEn")}</option>
                    <option value="fr">{t("adminSeo.metadata.languageFr")}</option>
                    <option value="es">{t("adminSeo.metadata.languageEs")}</option>
                    <option value="de">{t("adminSeo.metadata.languageDe")}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-[#555] uppercase tracking-wider mb-1.5">{t("adminSeo.metadata.themeLabel")}</label>
                  <select value={form.theme}
                    onChange={(e) => setForm({ ...form, theme: e.target.value })}
                    className="w-full px-4 py-2.5 bg-[#ffffff] border border-[#e5e7eb] rounded-xl text-xs text-[#1a1a1a] outline-none focus:border-[#FF4747] transition-colors">
                    <option value="DARK">{t("adminSeo.metadata.themeDark")}</option>
                    <option value="LIGHT">{t("adminSeo.metadata.themeLight")}</option>
                  </select>
                </div>
              </div>

              <button type="submit"
                className="w-full py-3 bg-[#FF4747] hover:bg-[#c23b02] text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer">
                <Shield size={14} /> {t("adminSeo.metadata.saveButton")}
              </button>
            </form>
          </div>

          {/* ── STRIPE CONNECT ── */}
          <div className="bg-white border border-[#e5e7eb] rounded-2xl p-8 space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="font-display font-bold text-[#FF4747] flex items-center gap-2">
                <Zap size={16} className="text-[#FF4747]" /> Stripe Payments
              </h2>
              {stripeStatus?.connected && (
                <button
                  onClick={loadStripeStatus}
                  className="text-[10px] text-[#555] hover:text-[#555] flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <RefreshCw size={11} /> Refresh status
                </button>
              )}
            </div>

            {/* Status banner */}
            {stripeStatus?.connected ? (
              <div className={`flex items-start gap-3 p-4 rounded-xl border ${
                stripeStatus.onboardingComplete
                  ? "bg-green-900/20 border-green-700/40"
                  : "bg-amber-900/20 border-amber-700/40"
              }`}>
                {stripeStatus.onboardingComplete
                  ? <CheckCircle size={16} className="text-green-400 flex-shrink-0 mt-0.5" />
                  : <XCircle size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />}
                <div className="space-y-1">
                  <p className={`text-xs font-semibold ${stripeStatus.onboardingComplete ? "text-green-300" : "text-amber-300"}`}>
                    {stripeStatus.onboardingComplete ? "Connected & ready to receive payments" : "Account connected — onboarding incomplete"}
                  </p>
                  <p className="text-[10px] text-[#555] font-mono">{stripeStatus.accountId}</p>
                  <div className="flex gap-4 mt-1 text-[10px]">
                    <span className={stripeStatus.chargesEnabled ? "text-green-400" : "text-red-400"}>
                      {stripeStatus.chargesEnabled ? "✓" : "✗"} Charges enabled
                    </span>
                    <span className={stripeStatus.payoutsEnabled ? "text-green-400" : "text-amber-400"}>
                      {stripeStatus.payoutsEnabled ? "✓" : "○"} Payouts enabled
                    </span>
                    <span className={stripeStatus.detailsSubmitted ? "text-green-400" : "text-amber-400"}>
                      {stripeStatus.detailsSubmitted ? "✓" : "○"} KYC submitted
                    </span>
                  </div>
                  {stripeStatus.mode === "mock" && (
                    <p className="text-[10px] text-[#555] italic mt-1">Running in mock mode — set STRIPE_API_KEY to go live.</p>
                  )}
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 p-4 rounded-xl bg-white border border-[#e5e7eb]">
                <XCircle size={16} className="text-[#444] flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs text-[#555]">No Stripe account connected</p>
                  <p className="text-[10px] text-[#555] mt-0.5 leading-relaxed">
                    Connect a Stripe Express account so the platform can automatically route your net revenue (after commission) directly to your bank via Stripe.
                  </p>
                </div>
              </div>
            )}

            {/* How it works */}
            <div className="bg-white border border-[#e5e7eb] rounded-xl p-4 space-y-2 text-[10px] text-[#555]">
              <p className="font-semibold text-[#555] uppercase tracking-wider">How it works</p>
              <ul className="list-disc list-inside space-y-1 leading-relaxed">
                <li>Customer pays the full ticket price in a single Stripe checkout.</li>
                <li>Stripe automatically keeps the <span className="text-[#999]">platform commission</span> set on the Commission page.</li>
                <li>The remainder is transferred <span className="text-[#999]">directly to your Stripe account</span> — no manual payout needed.</li>
                <li>You can withdraw funds to your bank from your own Stripe dashboard.</li>
              </ul>
            </div>

            {/* Action button */}
            {!stripeStatus?.onboardingComplete ? (
              <button
                onClick={handleStripeConnect}
                disabled={stripeConnecting}
                className="flex items-center gap-2 px-6 py-2.5 bg-[#635bff] hover:bg-[#7a73ff] disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              >
                <ExternalLink size={13} />
                {stripeConnecting
                  ? "Connecting…"
                  : stripeStatus?.connected
                    ? "Complete Stripe Onboarding"
                    : "Connect Stripe Account"}
              </button>
            ) : (
              <a
                href="https://dashboard.stripe.com"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-6 py-2.5 bg-green-50 hover:bg-green-100 border border-green-200 text-green-700 text-xs font-semibold rounded-xl transition-colors"
              >
                <ExternalLink size={13} /> Open Stripe Dashboard
              </a>
            )}
          </div>

          {/* PAYOUT SETTINGS */}
          <div className="bg-white border border-[#e5e7eb] rounded-2xl p-8 space-y-6">
            <h2 className="font-display font-bold text-[#FF4747] flex items-center gap-2">
              <Globe size={18} className="text-[#FF4747]" /> Payout Destination Settings
            </h2>
            <p className="text-xs text-[#666] leading-relaxed">
              Configure your Mobile Money or Card payout details to receive manual withdrawal payouts.
            </p>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-medium text-[#555] uppercase tracking-wider mb-1.5">Mobile Money Provider</label>
                <select value={form.payoutMomoProvider}
                  onChange={(e) => setForm({ ...form, payoutMomoProvider: e.target.value })}
                  className="w-full px-4 py-2.5 bg-[#ffffff] border border-[#e5e7eb] rounded-xl text-xs text-[#1a1a1a] outline-none focus:border-[#FF4747] transition-colors">
                  <option value="MTN">MTN Mobile Money</option>
                  <option value="ORANGE">Orange Money</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-medium text-[#555] uppercase tracking-wider mb-1.5">Mobile Money Phone Number</label>
                <input placeholder="6xxxxxxxx" value={form.payoutMomoNumber}
                  onChange={(e) => setForm({ ...form, payoutMomoNumber: e.target.value })}
                  className={inputClass} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-6">
              <div>
                <label className="block text-[10px] font-medium text-[#555] uppercase tracking-wider mb-1.5">Payout Card Number</label>
                <input placeholder="4111 2222 3333 4444" value={form.payoutCardNumber}
                  onChange={(e) => setForm({ ...form, payoutCardNumber: e.target.value })}
                  className={inputClass} />
              </div>
              <div>
                <label className="block text-[10px] font-medium text-[#555] uppercase tracking-wider mb-1.5">Card Expiry Date</label>
                <input placeholder="MM/YY" value={form.payoutCardExpiry}
                  onChange={(e) => setForm({ ...form, payoutCardExpiry: e.target.value })}
                  className={inputClass} />
              </div>
            </div>
          </div>

          {/* DANGER ZONE */}
          <div className="bg-white border border-red-500/20 rounded-2xl p-8 space-y-6">
            <h2 className="font-display font-bold text-red-500 flex items-center gap-2">
              <XCircle size={18} /> Danger Zone
            </h2>
            <p className="text-xs text-[#666] leading-relaxed">
              Irreversible actions that affect your user account and tenant workspace.
            </p>
            <div className="flex items-center justify-between p-4 bg-red-950/20 border border-red-900/40 rounded-xl">
              <div>
                <p className="text-xs font-semibold text-red-300">Downgrade to Individual Profile</p>
                <p className="text-[10px] text-[#666] mt-0.5 max-w-md leading-relaxed">
                  Deletes your tenant workspace settings, branding, events, and switches your role back to ATTENDEE.
                </p>
              </div>
              <button
                onClick={handleDowngradeToIndividual}
                className="px-4 py-2.5 bg-red-600 hover:bg-red-750 text-white text-xs font-bold rounded-xl transition-all border-none cursor-pointer"
              >
                Downgrade Account
              </button>
            </div>
          </div>
        </main>
      </div>

      {/* TOAST */}
      {toast && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 text-sm px-6 py-3 rounded-full shadow-2xl z-50 transition-all duration-300 ${
          toast.type === "success"
            ? "bg-[#f5f5f5] border border-[#e5e7eb] text-[#1a1a1a]"
            : "bg-red-900/80 border border-red-700 text-red-200"
        }`}>
          {toast.type === "success" ? "✅" : "⚠️"} {toast.msg}
        </div>
      )}
    </div>
  );
}
