"use client";
import { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Zap, Code2, Plus, Trash2, Copy, Star, AlertTriangle, LogOut, LayoutDashboard } from "lucide-react";
import { api, getStoredAuth, clearStoredAuth } from "@/app/utils/api";
import { useLanguage } from "@/app/context/LanguageContext";

interface ApiKey {
  keyId: string;
  name: string;
  keyPrefix: string;
  planTier: string;
  revoked: boolean;
  createdAt: string;
  lastUsedAt?: string;
}

interface ApiPlanLimits {
  apiPlanName: string | null;
  maxApiCallsPerMonth?: number;
}

interface TenantUsage {
  month: string;
  used: number;
  limit?: number;
  remaining?: number;
}

export default function ApiDashboardPage() {
  const { t } = useLanguage();
  const router = useRouter();

  const [keys, setKeys] = useState<ApiKey[]>([]);
  const [limits, setLimits] = useState<ApiPlanLimits | null>(null);
  const [usage, setUsage] = useState<TenantUsage | null>(null);
  const [loading, setLoading] = useState(true);
  const [newKeyName, setNewKeyName] = useState("");
  const [generating, setGenerating] = useState(false);
  const [revealedKey, setRevealedKey] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [revokeConfirm, setRevokeConfirm] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const auth = getStoredAuth();
  const tenantId = auth?.tenantId;

  useEffect(() => {
    if (!auth) {
      router.push("/login?from=eventaas");
      return;
    }
    if (!tenantId) return;

    Promise.all([
      api.get<ApiPlanLimits>("/api/v1/tenants/me/api-limits"),
      api.get<TenantUsage>("/api/v1/tenants/me/usage"),
      api.get<ApiKey[]>(`/api/v1/tenants/${tenantId}/api-keys`),
    ])
      .then(([limitsRes, usageRes, keysRes]) => {
        setLimits(limitsRes);
        setUsage(usageRes);
        setKeys(keysRes || []);
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tenantId]);

  const refreshKeys = async () => {
    if (!tenantId) return;
    const data = await api.get<ApiKey[]>(`/api/v1/tenants/${tenantId}/api-keys`);
    setKeys(data || []);
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tenantId || !newKeyName.trim()) return;
    setGenerating(true);
    try {
      const res = await api.post<{ rawKey: string; message: string }>(
        `/api/v1/tenants/${tenantId}/api-keys`,
        { name: newKeyName.trim() }
      );
      setRevealedKey(res.rawKey);
      setNewKeyName("");
      await refreshKeys();
      showToast(t("apiDashboard.toast.generated"));
    } catch (err: any) {
      showToast(err?.message || t("apiDashboard.toast.generateFailed"));
    } finally {
      setGenerating(false);
    }
  };

  const handleRevoke = async (keyId: string) => {
    if (!tenantId) return;
    try {
      await api.delete(`/api/v1/tenants/${tenantId}/api-keys/${keyId}`);
      setRevokeConfirm(null);
      const revoked = keys.find((k) => k.keyId === keyId);
      if (revealedKey && revoked?.keyPrefix && revealedKey.startsWith(revoked.keyPrefix)) {
        setRevealedKey(null);
      }
      await refreshKeys();
      showToast(t("apiDashboard.toast.revoked"));
    } catch (err: any) {
      showToast(err?.message || t("apiDashboard.toast.revokeFailed"));
    }
  };

  const copyKey = () => {
    if (!revealedKey) return;
    navigator.clipboard.writeText(revealedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSignOut = () => {
    clearStoredAuth();
    router.push("/login");
  };

  const activeKeys = keys.filter((k) => !k.revoked);
  const revokedKeys = keys.filter((k) => k.revoked);
  const hasNoApiPlan = !limits?.apiPlanName;
  const used = usage?.used ?? 0;
  const limit = usage?.limit;
  const usagePct = limit ? Math.min(100, Math.round((used / limit) * 100)) : 0;
  const quotaExceeded = !!limit && used >= limit;

  return (
    <div className="min-h-screen bg-[#f9fafb] text-[#374151]">
      {toast && (
        <div className="fixed top-5 right-5 z-50 bg-[#1a1a1a] text-white text-xs font-semibold px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2">
          <Star size={12} className="text-[#FF4747]" />
          {toast}
        </div>
      )}

      <nav className="border-b border-[#e5e7eb] bg-white px-8 py-4 flex items-center justify-between sticky top-0 z-40">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-[#FF4747] flex items-center justify-center">
            <Zap size={16} className="text-white" />
          </div>
          <div>
            <div className="font-display font-bold text-sm text-[#1a1a1a]">{t("apiDashboard.header.title")}</div>
            <div className="text-[10px] text-[#888]">{t("apiDashboard.header.subtitle")}</div>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <Link href="/admin" className="text-xs font-semibold text-[#666] hover:text-[#FF4747] transition-colors flex items-center gap-1.5">
            <LayoutDashboard size={13} /> {t("apiDashboard.header.fullDashboardLink")}
          </Link>
          <button
            onClick={handleSignOut}
            className="text-xs font-semibold text-[#666] hover:text-red-600 transition-colors flex items-center gap-1.5 cursor-pointer"
          >
            <LogOut size={13} /> {t("apiDashboard.header.signOut")}
          </button>
        </div>
      </nav>

      <main className="p-8 max-w-[860px] mx-auto space-y-6">
        {/* Plan & usage */}
        <div className="bg-white border border-[#e5e7eb] rounded-2xl p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-[#1a1a1a]">{t("apiDashboard.plan.title")}</h2>
            <Link href="/eventaas#pricing" className="text-xs font-semibold text-[#FF4747] hover:underline">
              {t("apiDashboard.plan.upgrade")}
            </Link>
          </div>

          {loading ? (
            <p className="text-xs text-[#888]">{t("apiDashboard.plan.loading")}</p>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <span className="text-[9px] uppercase tracking-wider px-2.5 py-1 rounded-full bg-[#FF4747]/10 text-[#FF4747] border border-[#FF4747]/20 font-bold">
                  {limits?.apiPlanName || t("apiDashboard.plan.none")}
                </span>
                <span className="text-xs text-[#888]">{t("apiDashboard.plan.currentPlan")}</span>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs text-[#555] mb-1.5">
                  <span>{t("apiDashboard.plan.callsThisMonth")}</span>
                  <span className="font-mono">
                    {used.toLocaleString()} {t("apiDashboard.plan.of")}{" "}
                    {limit != null ? limit.toLocaleString() : t("apiDashboard.plan.unlimited")}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-[#f3f4f6] overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${quotaExceeded ? "bg-red-500" : "bg-[#FF4747]"}`}
                    style={{ width: `${limit ? usagePct : 4}%` }}
                  />
                </div>
                {limit != null && !quotaExceeded && (
                  <p className="text-[10px] text-[#aaa] mt-1.5">
                    {t("apiDashboard.plan.remaining", { count: (usage?.remaining ?? Math.max(0, limit - used)).toLocaleString() })}
                  </p>
                )}
                {quotaExceeded && (
                  <p className="text-[10px] text-red-600 font-semibold mt-1.5">{t("apiDashboard.plan.quotaExceeded")}</p>
                )}
              </div>

              {hasNoApiPlan && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-xs text-amber-800">
                  {t("apiDashboard.plan.noPlanNotice")}
                </div>
              )}
            </>
          )}
        </div>

        {/* Explainer */}
        <div className="bg-white border border-[#e5e7eb] rounded-2xl p-6 space-y-2">
          <h2 className="text-sm font-bold text-[#1a1a1a]">{t("apiDashboard.explainer.title")}</h2>
          <p className="text-xs text-[#555] leading-relaxed">
            {t("apiDashboard.explainer.pre")}
            <code className="mx-1 px-1.5 py-0.5 bg-[#f3f4f6] rounded text-[#EB4203] font-mono text-[10px]">X-API-Key</code>
            {t("apiDashboard.explainer.post")}
          </p>
          <div className="mt-3 bg-[#1a1a1a] rounded-xl px-5 py-3 font-mono text-[10px] text-green-400 leading-relaxed">
            <span className="text-[#aaa]"># Example</span><br />
            curl -X GET https://api.yoevent.com/api/v1/events \<br />
            {"  "}-H <span className="text-yellow-300">&quot;X-API-Key: ye_live_...&quot;</span> \<br />
            {"  "}-H <span className="text-yellow-300">&quot;X-Tenant-Id: your-tenant-id&quot;</span>
          </div>
          <Link href="/developers" className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#FF4747] hover:underline pt-1">
            <Code2 size={12} /> API docs
          </Link>
        </div>

        {/* Revealed key banner */}
        {revealedKey && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-3">
            <div className="flex items-center gap-2 text-amber-700 text-xs font-bold">
              <AlertTriangle size={14} />
              {t("apiDashboard.revealedKey.banner")}
            </div>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-white border border-amber-200 rounded-xl px-4 py-2.5 font-mono text-[11px] text-[#1a1a1a] break-all">
                {revealedKey}
              </code>
              <button
                onClick={copyKey}
                className="shrink-0 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Copy size={12} /> {copied ? t("apiDashboard.revealedKey.copied") : t("apiDashboard.revealedKey.copy")}
              </button>
            </div>
            <button onClick={() => setRevealedKey(null)} className="text-[10px] text-amber-600 underline cursor-pointer">
              {t("apiDashboard.revealedKey.dismiss")}
            </button>
          </div>
        )}

        {/* Generate new key */}
        <div className="bg-white border border-[#e5e7eb] rounded-2xl p-6">
          <h2 className="text-sm font-bold text-[#1a1a1a] mb-4">{t("apiDashboard.generate.title")}</h2>
          <form onSubmit={handleGenerate} className="flex gap-3">
            <input
              type="text"
              placeholder={t("apiDashboard.generate.namePlaceholder")}
              value={newKeyName}
              onChange={(e) => setNewKeyName(e.target.value)}
              className="flex-1 bg-[#f9fafb] border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-xs text-[#1a1a1a] placeholder:text-[#aaa] outline-none focus:border-[#EB4203] transition-colors"
              required
              maxLength={100}
            />
            <button
              type="submit"
              disabled={generating || !newKeyName.trim()}
              className="shrink-0 px-5 py-2.5 bg-[#EB4203] hover:bg-[#c23b02] text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <Plus size={14} /> {generating ? t("apiDashboard.generate.generating") : t("apiDashboard.generate.submit")}
            </button>
          </form>
          <p className="text-[10px] text-[#888] mt-2">{t("apiDashboard.generate.limitNote")}</p>
        </div>

        {/* Active keys */}
        <div className="bg-white border border-[#e5e7eb] rounded-2xl p-6">
          <h2 className="text-sm font-bold text-[#1a1a1a] mb-4">{t("apiDashboard.active.title", { count: activeKeys.length })}</h2>
          {loading ? (
            <p className="text-xs text-[#888]">{t("apiDashboard.active.loading")}</p>
          ) : activeKeys.length === 0 ? (
            <p className="text-xs text-[#888] py-8 text-center border border-dashed border-[#e5e7eb] rounded-xl">
              {t("apiDashboard.active.empty")}
            </p>
          ) : (
            <div className="space-y-3">
              {activeKeys.map((key) => (
                <div key={key.keyId} className="flex items-center justify-between p-4 bg-[#f9fafb] border border-[#e5e7eb] rounded-xl gap-4">
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-[#1a1a1a] truncate">{key.name}</div>
                    <div className="flex items-center gap-3 mt-1">
                      <code className="text-[10px] text-[#555] font-mono">{key.keyPrefix}••••••••••••</code>
                      <span className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-green-50 text-green-700 border border-green-100 font-semibold">
                        {key.planTier}
                      </span>
                    </div>
                    <div className="text-[9px] text-[#aaa] mt-1 font-mono">
                      {t("apiDashboard.active.created", { date: new Date(key.createdAt).toLocaleDateString() })}
                      {key.lastUsedAt
                        ? ` · ${t("apiDashboard.active.lastUsed", { date: new Date(key.lastUsedAt).toLocaleDateString() })}`
                        : ` · ${t("apiDashboard.active.neverUsed")}`}
                    </div>
                  </div>
                  {revokeConfirm === key.keyId ? (
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-[10px] text-red-600 font-semibold">{t("apiDashboard.active.revokeConfirm")}</span>
                      <button
                        onClick={() => handleRevoke(key.keyId)}
                        className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold rounded-lg cursor-pointer transition-colors"
                      >
                        {t("apiDashboard.active.yes")}
                      </button>
                      <button
                        onClick={() => setRevokeConfirm(null)}
                        className="px-3 py-1.5 bg-[#e5e7eb] hover:bg-[#d1d5db] text-[#1a1a1a] text-[10px] font-bold rounded-lg cursor-pointer transition-colors"
                      >
                        {t("apiDashboard.active.no")}
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setRevokeConfirm(key.keyId)}
                      className="shrink-0 p-2 text-[#888] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                      title={t("apiDashboard.active.revokeTitle")}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Revoked keys */}
        {revokedKeys.length > 0 && (
          <div className="bg-white border border-[#e5e7eb] rounded-2xl p-6">
            <h2 className="text-sm font-bold text-[#aaa] mb-4">{t("apiDashboard.revoked.title", { count: revokedKeys.length })}</h2>
            <div className="space-y-2">
              {revokedKeys.map((key) => (
                <div key={key.keyId} className="flex items-center justify-between p-4 bg-[#f9fafb] border border-[#e5e7eb] rounded-xl gap-4 opacity-50">
                  <div className="min-w-0">
                    <div className="text-xs font-bold text-[#1a1a1a] truncate line-through">{key.name}</div>
                    <code className="text-[10px] text-[#555] font-mono">{key.keyPrefix}••••••••••••</code>
                  </div>
                  <span className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-100 font-semibold shrink-0">
                    {t("apiDashboard.revoked.badge")}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
