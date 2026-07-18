"use client";
import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { Settings, Save, Percent, DollarSign, TrendingDown, ArrowDownCircle, Info } from "lucide-react";
import { authService } from "@/app/utils/services/authService";
import { useLanguage } from "@/app/context/LanguageContext";

export default function PlatformCommissionPage() {
  const { t } = useLanguage();
  // Commission settings
  const [baseRate, setBaseRate] = useState<string>("10.00");
  const [flatFee, setFlatFee] = useState<string>("2.00");
  const [updatedAt, setUpdatedAt] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Revenue
  const [revenue, setRevenue] = useState<{ totalCollected: number; totalWithdrawn: number; availableBalance: number } | null>(null);
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [withdrawAmount, setWithdrawAmount] = useState<string>("");
  const [withdrawNote, setWithdrawNote] = useState<string>("");
  const [withdrawing, setWithdrawing] = useState(false);

  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 3500);
  };

  const loadRevenue = async () => {
    try {
      const [rev, wds] = await Promise.all([
        authService.getPlatformRevenue(),
        authService.getPlatformWithdrawals(),
      ]);
      setRevenue(rev);
      setWithdrawals(wds || []);
    } catch {
      // silently ignore if service not reachable yet
    }
  };

  useEffect(() => {
    authService.getCommissionSettings()
      .then((data) => {
        if (data.baseCommissionRate != null) setBaseRate(String(data.baseCommissionRate));
        if (data.premiumCommissionFlatFee != null) setFlatFee(String(data.premiumCommissionFlatFee));
        if (data.updatedAt) setUpdatedAt(data.updatedAt);
      })
      .catch(() => {});

    loadRevenue();
  }, []);

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    try {
      const data = await authService.updateCommissionSettings({
        baseCommissionRate: parseFloat(baseRate),
        premiumCommissionFlatFee: parseFloat(flatFee),
      });
      if (data.updatedAt) setUpdatedAt(data.updatedAt);
      showToast("success", t("adminPlatform.toast.settingsSaved"));
    } catch {
      showToast("error", t("adminPlatform.toast.settingsSaveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const handleWithdraw = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const amt = parseFloat(withdrawAmount);
    if (!amt || amt <= 0) return;
    if (revenue && amt > revenue.availableBalance) {
      showToast("error", t("adminPlatform.toast.amountExceeds"));
      return;
    }
    setWithdrawing(true);
    try {
      await authService.recordPlatformWithdrawal({ amount: amt, note: withdrawNote });
      setWithdrawAmount("");
      setWithdrawNote("");
      showToast("success", t("adminPlatform.toast.withdrawalRecorded", { amount: amt.toFixed(2) }));
      await loadRevenue();
    } catch {
      showToast("error", t("adminPlatform.toast.withdrawalFailed"));
    } finally {
      setWithdrawing(false);
    }
  };

  const fmt = (n: number | undefined) =>
    n != null ? `$${Number(n).toFixed(2)}` : "—";

  return (
    <div className="flex bg-[#f9fafb] min-h-screen text-[#374151]">
      <Sidebar />
      <div className="ml-[220px] flex-1 flex flex-col">
        <header className="h-[60px] bg-white border-b border-[#e5e7eb] flex items-center px-8 sticky top-0 z-40">
          <Settings size={18} className="text-[#FF4747] mr-3" />
          <h1 className="font-display text-xl font-bold text-[#FF4747]">{t("adminPlatform.header.title")}</h1>
        </header>

        <main className="p-8 space-y-8 max-w-4xl">

          {/* ── STRIPE NOTICE ── */}
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 flex gap-4">
            <Info size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-amber-700 leading-relaxed space-y-1">
              <p className="font-semibold text-amber-800">{t("adminPlatform.notice.title")}</p>
              <p>
                {t("adminPlatform.notice.part1")}<span className="font-semibold text-amber-700">{t("adminPlatform.notice.highlight1")}</span>{t("adminPlatform.notice.part2")}<span className="font-semibold text-amber-700">{t("adminPlatform.notice.highlight2")}</span>{t("adminPlatform.notice.part3")}
              </p>
            </div>
          </div>

          {/* ── REVENUE DASHBOARD ── */}
          <div className="grid grid-cols-3 gap-5">
            {[
              {
                label: t("adminPlatform.revenue.totalCollectedLabel"),
                value: fmt(revenue?.totalCollected),
                sub: t("adminPlatform.revenue.totalCollectedSub"),
                color: "text-[#FF4747]",
              },
              {
                label: t("adminPlatform.revenue.totalWithdrawnLabel"),
                value: fmt(revenue?.totalWithdrawn),
                sub: t("adminPlatform.revenue.totalWithdrawnSub"),
                color: "text-red-400",
              },
              {
                label: t("adminPlatform.revenue.availableBalanceLabel"),
                value: fmt(revenue?.availableBalance),
                sub: t("adminPlatform.revenue.availableBalanceSub"),
                color: "text-green-400",
              },
            ].map((card, i) => (
              <div key={i} className="bg-white border border-[#e5e7eb] rounded-2xl p-6">
                <div className="text-[10px] text-[#888] uppercase tracking-wider mb-2 font-bold">{card.label}</div>
                <div className={`font-display text-3xl font-bold mb-1 ${card.color}`}>{card.value}</div>
                <div className="text-[10px] text-[#555]">{card.sub}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-8">
            {/* ── COMMISSION RATE SETTINGS ── */}
            <div className="space-y-6">
              <div className="bg-white border border-[#e5e7eb] rounded-2xl p-6 space-y-5">
                <h2 className="font-display font-bold text-[#FF4747] flex items-center gap-2">
                  <Percent size={16} className="text-[#FF4747]" /> {t("adminPlatform.rates.title")}
                </h2>

                {/* Info blurb */}
                <ul className="text-[10px] text-[#555] list-disc list-inside space-y-1">
                  <li><span className="text-[#999]">{t("adminPlatform.rates.infoTierLabel")}</span>{t("adminPlatform.rates.infoTierDesc")}</li>
                  <li><span className="text-[#999]">{t("adminPlatform.rates.infoPremiumLabel")}</span>{t("adminPlatform.rates.infoPremiumDesc")}</li>
                </ul>

                <form onSubmit={handleSave} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-[#555] uppercase tracking-wider mb-1.5">
                      {t("adminPlatform.rates.baseRateLabel")}
                    </label>
                    <div className="relative">
                      <Percent size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
                      <input
                        type="number" min="0" max="100" step="0.01"
                        value={baseRate}
                        onChange={(e) => setBaseRate(e.target.value)}
                        className="w-full bg-[#ffffff] border border-[#e5e7eb] rounded-xl pl-8 pr-4 py-2.5 text-sm text-[#1a1a1a] outline-none focus:border-[#FF4747] transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#555] uppercase tracking-wider mb-1.5">
                      {t("adminPlatform.rates.flatFeeLabel")}
                    </label>
                    <div className="relative">
                      <DollarSign size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
                      <input
                        type="number" min="0" step="0.01"
                        value={flatFee}
                        onChange={(e) => setFlatFee(e.target.value)}
                        className="w-full bg-[#ffffff] border border-[#e5e7eb] rounded-xl pl-8 pr-4 py-2.5 text-sm text-[#1a1a1a] outline-none focus:border-[#FF4747] transition-colors"
                        required
                      />
                    </div>
                  </div>

                  {updatedAt && (
                    <p className="text-[10px] text-[#3a3a3a]">
                      {t("adminPlatform.rates.lastUpdated", { date: new Date(updatedAt).toLocaleString() })}
                    </p>
                  )}

                  <button
                    type="submit" disabled={saving}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#F7E998] hover:bg-[#FF4747] hover:text-white disabled:opacity-50 text-[#1a1a1a] text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                  >
                    <Save size={13} />
                    {saving ? t("adminPlatform.rates.saving") : t("adminPlatform.rates.save")}
                  </button>
                </form>
              </div>

              {/* Rate preview */}
              <div className="bg-white border border-[#e5e7eb] rounded-2xl p-5">
                <p className="text-[10px] text-[#555] uppercase tracking-wider font-bold mb-3">{t("adminPlatform.preview.title")}</p>
                <table className="w-full text-xs">
                  <tbody className="divide-y divide-[#f0f0f0]">
                    {[
                      { plan: "FREE", fee: `${parseFloat(baseRate) || 0}%`, ex: `$${((parseFloat(baseRate) || 0) * 1).toFixed(2)}` },
                      { plan: "BASIC", fee: `${parseFloat(baseRate) || 0}%`, ex: `$${((parseFloat(baseRate) || 0) * 1).toFixed(2)}` },
                      { plan: "PREMIUM", fee: `$${parseFloat(flatFee) || 0} flat`, ex: `$${(parseFloat(flatFee) || 0).toFixed(2)}` },
                    ].map((r) => (
                      <tr key={r.plan}>
                        <td className="py-2.5 text-[#1a1a1a] font-medium">{r.plan}</td>
                        <td className="py-2.5 text-[#555]">{r.fee}</td>
                        <td className="py-2.5 text-right text-[#FF4747] font-mono">{r.ex}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── WITHDRAWAL ── */}
            <div className="space-y-6">
              <div className="bg-white border border-[#e5e7eb] rounded-2xl p-6">
                <h2 className="font-display font-bold text-[#FF4747] flex items-center gap-2 mb-4">
                  <ArrowDownCircle size={16} className="text-[#FF4747]" /> {t("adminPlatform.withdrawal.title")}
                </h2>
                <p className="text-[10px] text-[#555] leading-relaxed mb-4">
                  {t("adminPlatform.withdrawal.description")}
                </p>
                <form onSubmit={handleWithdraw} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-[#555] uppercase tracking-wider mb-1.5">{t("adminPlatform.withdrawal.amountLabel")}</label>
                    <div className="relative">
                      <DollarSign size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
                      <input
                        type="number" min="0.01" step="0.01"
                        placeholder={t("adminPlatform.withdrawal.amountPlaceholder")}
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        className="w-full bg-[#ffffff] border border-[#e5e7eb] rounded-xl pl-8 pr-4 py-2.5 text-sm text-[#1a1a1a] placeholder:text-[#aaa] outline-none focus:border-[#FF4747] transition-colors"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#555] uppercase tracking-wider mb-1.5">{t("adminPlatform.withdrawal.noteLabel")}</label>
                    <input
                      type="text"
                      placeholder={t("adminPlatform.withdrawal.notePlaceholder")}
                      value={withdrawNote}
                      onChange={(e) => setWithdrawNote(e.target.value)}
                      className="w-full bg-[#ffffff] border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-sm text-[#1a1a1a] placeholder:text-[#aaa] outline-none focus:border-[#FF4747] transition-colors"
                    />
                  </div>
                  <button
                    type="submit" disabled={withdrawing}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#ffffff] hover:bg-[#2e2e2e] border border-[#3a3a3a] disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                  >
                    <TrendingDown size={13} className="text-red-400" />
                    {withdrawing ? t("adminPlatform.withdrawal.recording") : t("adminPlatform.withdrawal.record")}
                  </button>
                </form>
              </div>

              {/* Withdrawal history */}
              <div className="bg-white border border-[#e5e7eb] rounded-2xl p-6">
                <h2 className="text-xs font-bold text-[#555] uppercase tracking-wider mb-4">{t("adminPlatform.withdrawal.historyTitle")}</h2>
                {withdrawals.length === 0 ? (
                  <p className="text-xs text-[#444] text-center py-4">{t("adminPlatform.withdrawal.empty")}</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {[...withdrawals].reverse().map((w, i) => (
                      <div key={w.withdrawalId || i} className="flex justify-between items-start p-3 bg-white border border-[#252525] rounded-xl">
                        <div>
                          <p className="text-xs text-[#999]">{w.note || t("adminPlatform.withdrawal.noNote")}</p>
                          <p className="text-[10px] text-[#555] mt-0.5">
                            {w.recordedAt ? new Date(w.recordedAt).toLocaleString() : "—"}
                          </p>
                        </div>
                        <span className="text-sm font-bold text-red-400 font-mono ml-4 flex-shrink-0">
                          -${Number(w.amount).toFixed(2)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>

      {toast && (
        <div className={`fixed bottom-6 right-6 px-5 py-3 rounded-xl text-xs font-semibold shadow-xl z-50 ${
          toast.type === "success"
            ? "bg-green-900 text-green-300 border border-green-700"
            : "bg-red-900 text-red-300 border border-red-700"
        }`}>
          {toast.msg}
        </div>
      )}
    </div>
  );
}
