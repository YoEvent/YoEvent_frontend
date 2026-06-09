"use client";
import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { Settings, Save, Percent, DollarSign, TrendingDown, ArrowDownCircle, Info } from "lucide-react";
import { authService } from "@/app/utils/services/authService";

export default function PlatformCommissionPage() {
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
      showToast("success", "Commission settings saved.");
    } catch {
      showToast("error", "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  const handleWithdraw = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const amt = parseFloat(withdrawAmount);
    if (!amt || amt <= 0) return;
    if (revenue && amt > revenue.availableBalance) {
      showToast("error", "Amount exceeds available balance.");
      return;
    }
    setWithdrawing(true);
    try {
      await authService.recordPlatformWithdrawal({ amount: amt, note: withdrawNote });
      setWithdrawAmount("");
      setWithdrawNote("");
      showToast("success", `Withdrawal of $${amt.toFixed(2)} recorded.`);
      await loadRevenue();
    } catch {
      showToast("error", "Failed to record withdrawal.");
    } finally {
      setWithdrawing(false);
    }
  };

  const fmt = (n: number | undefined) =>
    n != null ? `$${Number(n).toFixed(2)}` : "—";

  return (
    <div className="flex bg-[#111] min-h-screen text-[#e0e0e0]">
      <Sidebar />
      <div className="ml-[220px] flex-1 flex flex-col">
        <header className="h-[60px] bg-[#161616] border-b border-[#222] flex items-center px-8 sticky top-0 z-40">
          <Settings size={18} className="text-[#d4c9a8] mr-3" />
          <h1 className="font-display text-xl font-bold text-white">Platform Commission</h1>
        </header>

        <main className="p-8 space-y-8 max-w-4xl">

          {/* ── STRIPE NOTICE ── */}
          <div className="bg-[#1a1a12] border border-[#3a3520] rounded-2xl p-5 flex gap-4">
            <Info size={16} className="text-amber-400 flex-shrink-0 mt-0.5" />
            <div className="text-xs text-[#a89a54] leading-relaxed space-y-1">
              <p className="font-semibold text-[#d4b84a]">Stripe does not split payments automatically</p>
              <p>
                Stripe captures the <span className="text-[#e0d090]">full ticket price</span> from the buyer in a single
                PaymentIntent — the platform fee is calculated and stored in the database only.
                To automatically route the organizer's net share via Stripe, <span className="text-[#e0d090]">Stripe Connect</span> is required
                (application fees on destination charges). Without it, the platform receives all funds and
                must transfer the organizer's net amount manually. Use the withdrawal section below to track those payouts.
              </p>
            </div>
          </div>

          {/* ── REVENUE DASHBOARD ── */}
          <div className="grid grid-cols-3 gap-5">
            {[
              {
                label: "Total Collected",
                value: fmt(revenue?.totalCollected),
                sub: "Sum of all platform fees on orders",
                color: "text-[#d4c9a8]",
              },
              {
                label: "Total Withdrawn",
                value: fmt(revenue?.totalWithdrawn),
                sub: "Recorded organizer payouts",
                color: "text-red-400",
              },
              {
                label: "Available Balance",
                value: fmt(revenue?.availableBalance),
                sub: "Collected minus withdrawn",
                color: "text-green-400",
              },
            ].map((card, i) => (
              <div key={i} className="bg-gradient-to-br from-[#1e1e1e] to-[#252525] border border-[#2a2a2a] rounded-2xl p-6">
                <div className="text-[10px] text-[#555] uppercase tracking-wider mb-2 font-bold">{card.label}</div>
                <div className={`font-display text-3xl font-bold mb-1 ${card.color}`}>{card.value}</div>
                <div className="text-[10px] text-[#555]">{card.sub}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-8">
            {/* ── COMMISSION RATE SETTINGS ── */}
            <div className="space-y-6">
              <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl p-6 space-y-5">
                <h2 className="font-display font-bold text-white flex items-center gap-2">
                  <Percent size={16} className="text-[#d4c9a8]" /> Commission Rates
                </h2>

                {/* Info blurb */}
                <ul className="text-[10px] text-[#555] list-disc list-inside space-y-1">
                  <li><span className="text-[#999]">FREE &amp; BASIC</span> — percentage of each order total</li>
                  <li><span className="text-[#999]">PREMIUM</span> — fixed flat fee per order</li>
                </ul>

                <form onSubmit={handleSave} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-[#555] uppercase tracking-wider mb-1.5">
                      FREE &amp; BASIC Rate (%)
                    </label>
                    <div className="relative">
                      <Percent size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
                      <input
                        type="number" min="0" max="100" step="0.01"
                        value={baseRate}
                        onChange={(e) => setBaseRate(e.target.value)}
                        className="w-full bg-[#252525] border border-[#333] rounded-xl pl-8 pr-4 py-2.5 text-sm text-white outline-none focus:border-[#d4c9a8] transition-colors"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-bold text-[#555] uppercase tracking-wider mb-1.5">
                      PREMIUM Flat Fee ($)
                    </label>
                    <div className="relative">
                      <DollarSign size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
                      <input
                        type="number" min="0" step="0.01"
                        value={flatFee}
                        onChange={(e) => setFlatFee(e.target.value)}
                        className="w-full bg-[#252525] border border-[#333] rounded-xl pl-8 pr-4 py-2.5 text-sm text-white outline-none focus:border-[#d4c9a8] transition-colors"
                        required
                      />
                    </div>
                  </div>

                  {updatedAt && (
                    <p className="text-[10px] text-[#3a3a3a]">
                      Last updated: {new Date(updatedAt).toLocaleString()}
                    </p>
                  )}

                  <button
                    type="submit" disabled={saving}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#d4c9a8] hover:bg-[#c8bb96] disabled:opacity-50 text-[#1a1a1a] text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                  >
                    <Save size={13} />
                    {saving ? "Saving…" : "Save Rates"}
                  </button>
                </form>
              </div>

              {/* Rate preview */}
              <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl p-5">
                <p className="text-[10px] text-[#555] uppercase tracking-wider font-bold mb-3">Example on a $100 order</p>
                <table className="w-full text-xs">
                  <tbody className="divide-y divide-[#222]">
                    {[
                      { plan: "FREE", fee: `${parseFloat(baseRate) || 0}%`, ex: `$${((parseFloat(baseRate) || 0) * 1).toFixed(2)}` },
                      { plan: "BASIC", fee: `${parseFloat(baseRate) || 0}%`, ex: `$${((parseFloat(baseRate) || 0) * 1).toFixed(2)}` },
                      { plan: "PREMIUM", fee: `$${parseFloat(flatFee) || 0} flat`, ex: `$${(parseFloat(flatFee) || 0).toFixed(2)}` },
                    ].map((r) => (
                      <tr key={r.plan}>
                        <td className="py-2.5 text-[#ccc] font-medium">{r.plan}</td>
                        <td className="py-2.5 text-[#888]">{r.fee}</td>
                        <td className="py-2.5 text-right text-[#d4c9a8] font-mono">{r.ex}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ── WITHDRAWAL ── */}
            <div className="space-y-6">
              <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl p-6">
                <h2 className="font-display font-bold text-white flex items-center gap-2 mb-4">
                  <ArrowDownCircle size={16} className="text-[#d4c9a8]" /> Record Withdrawal
                </h2>
                <p className="text-[10px] text-[#555] leading-relaxed mb-4">
                  Use this to log when you transfer the organizer's net share from your Stripe or bank account.
                  This deducts from the Available Balance — it does not trigger a real Stripe transfer.
                </p>
                <form onSubmit={handleWithdraw} className="space-y-4">
                  <div>
                    <label className="block text-[10px] font-bold text-[#555] uppercase tracking-wider mb-1.5">Amount ($)</label>
                    <div className="relative">
                      <DollarSign size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#555]" />
                      <input
                        type="number" min="0.01" step="0.01"
                        placeholder="e.g. 150.00"
                        value={withdrawAmount}
                        onChange={(e) => setWithdrawAmount(e.target.value)}
                        className="w-full bg-[#252525] border border-[#333] rounded-xl pl-8 pr-4 py-2.5 text-sm text-white placeholder:text-[#444] outline-none focus:border-[#d4c9a8] transition-colors"
                        required
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-[#555] uppercase tracking-wider mb-1.5">Note / Reason</label>
                    <input
                      type="text"
                      placeholder="e.g. Bank transfer to Acme Events Ltd"
                      value={withdrawNote}
                      onChange={(e) => setWithdrawNote(e.target.value)}
                      className="w-full bg-[#252525] border border-[#333] rounded-xl px-4 py-2.5 text-sm text-white placeholder:text-[#444] outline-none focus:border-[#d4c9a8] transition-colors"
                    />
                  </div>
                  <button
                    type="submit" disabled={withdrawing}
                    className="w-full flex items-center justify-center gap-2 py-2.5 bg-[#252525] hover:bg-[#2e2e2e] border border-[#3a3a3a] disabled:opacity-50 text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
                  >
                    <TrendingDown size={13} className="text-red-400" />
                    {withdrawing ? "Recording…" : "Record Withdrawal"}
                  </button>
                </form>
              </div>

              {/* Withdrawal history */}
              <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl p-6">
                <h2 className="text-xs font-bold text-[#888] uppercase tracking-wider mb-4">Withdrawal History</h2>
                {withdrawals.length === 0 ? (
                  <p className="text-xs text-[#444] text-center py-4">No withdrawals recorded yet.</p>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {[...withdrawals].reverse().map((w, i) => (
                      <div key={w.withdrawalId || i} className="flex justify-between items-start p-3 bg-[#161616] border border-[#252525] rounded-xl">
                        <div>
                          <p className="text-xs text-[#999]">{w.note || "No note"}</p>
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
