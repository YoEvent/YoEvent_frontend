"use client";
import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { DollarSign, Send, Landmark, RefreshCw, Clock, ArrowUpRight, HelpCircle, AlertTriangle, Trash2 } from "lucide-react";
import { getStoredAuth } from "@/app/utils/api";
import { paymentService } from "@/app/utils/services/paymentService";

export default function PayoutsPage() {
  const [balance, setBalance] = useState<number>(0);
  const [currency, setCurrency] = useState<string>("XAF");
  const [withdrawals, setWithdrawals] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [amount, setAmount] = useState<string>("");
  const [provider, setProvider] = useState<string>("momo");
  const [formError, setFormError] = useState<string | null>(null);

  // Notifications
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 4000);
  };

  const fetchPayoutDetails = async () => {
    const auth = getStoredAuth();
    if (!auth?.tenantId) return;
    setLoading(true);
    try {
      // 1. Fetch available balance
      const balRes = await paymentService.getAvailableBalance();
      setBalance(balRes.availableBalance || 0);
      setCurrency(balRes.currency || "XAF");

      // 2. Fetch withdrawal history
      const wList = await paymentService.getWithdrawals();
      setWithdrawals(wList || []);
    } catch (err: any) {
      console.error("Failed to load payout details:", err);
      showToast("error", err.message || "Failed to load balance details.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPayoutDetails();
  }, []);

  const handleWithdrawalRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    const auth = getStoredAuth();
    if (!auth?.tenantId) return;

    setFormError(null);
    const withdrawAmount = parseFloat(amount);
    if (isNaN(withdrawAmount) || withdrawAmount <= 0) {
      const msg = "Please enter a valid amount greater than 0";
      setFormError(msg);
      showToast("error", msg);
      return;
    }

    if (withdrawAmount > balance) {
      const msg = `Insufficient balance. Available is ${balance} ${currency}`;
      setFormError(msg);
      showToast("error", msg);
      return;
    }

    setSubmitting(true);
    try {
      await paymentService.withdraw({
        amount: withdrawAmount,
        provider: provider,
        currency: currency
      });
      showToast("success", `Withdrawal request of ${withdrawAmount} ${currency} submitted successfully!`);
      setAmount("");
      // Refresh balance & list
      fetchPayoutDetails();
    } catch (err: any) {
      console.error("Withdrawal error:", err);
      let errMsg = err.message || "Withdrawal failed.";
      // Clean up Stripe/Api error message prefixes
      if (errMsg.includes("Stripe payout error:")) {
        errMsg = errMsg.replace(/^ApiError:\s*/i, "").replace(/^Stripe\s+payout\s+error:\s*/i, "");
      }
      // Strip technical suggestions or urls like "You can use the /v1/balance..."
      if (errMsg.includes("You can use the")) {
        errMsg = errMsg.split("You can use the")[0].trim();
      }
      // Strip codes or request IDs starting with semicolons
      if (errMsg.includes(";")) {
        errMsg = errMsg.split(";")[0].trim();
      }
      setFormError(errMsg);
      showToast("error", errMsg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteWithdrawal = async (id: string) => {
    if (!confirm("Are you sure you want to delete this withdrawal record from your history?")) return;
    try {
      setLoading(true);
      await paymentService.deleteWithdrawal(id);
      showToast("success", "Withdrawal record deleted successfully.");
      fetchPayoutDetails();
    } catch (err: any) {
      console.error(err);
      showToast("error", err.message || "Failed to delete withdrawal record.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex bg-[#f9fafb] min-h-screen text-[#374151]">
      <Sidebar />
      <div className="ml-[220px] flex-1 flex flex-col">
        {/* HEADER */}
        <header className="h-[60px] bg-white border-b border-[#e5e7eb] flex items-center justify-between px-8 sticky top-0 z-40">
          <h1 className="font-display text-xl font-bold text-[#EB4203]">Organizer Balance & Payouts</h1>
          <button
            onClick={fetchPayoutDetails}
            className="w-8 h-8 bg-white border border-[#e5e7eb] rounded-lg flex items-center justify-center hover:bg-[#2a2a2a] transition-colors cursor-pointer"
          >
            <RefreshCw size={14} className={loading ? "animate-spin" : ""} />
          </button>
        </header>

        <main className="p-8 space-y-8 max-w-5xl">
          {/* BALANCE METRICS & ACTION ROW */}
          <div className="grid md:grid-cols-[1.5fr_2fr] gap-8">
            {/* Balance Card */}
            <div className="bg-white border border-[#e5e7eb] shadow-sm rounded-2xl p-8 flex flex-col justify-between">
              <div>
                <span className="text-[#666] text-xs font-semibold uppercase tracking-wider block mb-2">Available Balance</span>
                <div className="text-4xl font-bold text-[#1a1a1a] font-display flex items-baseline gap-2">
                  <span>{balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                  <span className="text-sm font-semibold text-[#EB4203]">{currency}</span>
                </div>
                <p className="text-[10px] text-[#555] mt-2 leading-relaxed">
                  Calculated from gross ticket sales minus refunded orders and previous payouts.
                </p>
              </div>

              <div className="pt-6 border-t border-[#e5e7eb] mt-6">
                <a
                  href="/admin/seo"
                  className="inline-flex items-center gap-1.5 text-xs text-[#EB4203] hover:text-[#efe084] transition-colors"
                >
                  <Landmark size={14} /> Configure payout destination settings →
                </a>
              </div>
            </div>

            {/* Payout Request Panel */}
            <div className="bg-white border border-[#e5e7eb] rounded-2xl p-8 shadow-sm">
              <h2 className="font-display font-bold text-[#EB4203] mb-2 flex items-center gap-2">
                <Send size={18} className="text-[#EB4203]" /> Request Payout
              </h2>
              <p className="text-xs text-[#666] mb-5">
                Transfer your funds to your configured Mobile Money account or Bank Card.
              </p>

              {formError && (
                <div className="mb-5 p-4 bg-red-50 border border-red-200 text-red-700 text-xs font-semibold rounded-2xl flex items-start gap-2.5 animate-fadeIn">
                  <AlertTriangle size={15} className="shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={handleWithdrawalRequest} className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-medium text-[#555] uppercase tracking-wider mb-1.5">Payout Method</label>
                    <select
                      value={provider}
                      onChange={(e) => setProvider(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-[#e5e7eb] rounded-xl text-xs text-[#1a1a1a] outline-none focus:border-[#F7E998] transition-colors"
                    >
                      <option value="momo">MTN / Orange Mobile Money</option>
                      <option value="stripe">Stripe Payout (Connected Card)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-[#555] uppercase tracking-wider mb-1.5">Amount to Withdraw ({currency})</label>
                    <input
                      type="number"
                      required
                      min="1"
                      step="0.01"
                      placeholder="0.00"
                      value={amount}
                      onChange={(e) => setAmount(e.target.value)}
                      className="w-full px-4 py-2.5 bg-white border border-[#e5e7eb] rounded-xl text-xs text-[#1a1a1a] placeholder:text-[#aaa] outline-none focus:border-[#F7E998] transition-colors"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting || balance <= 0}
                  className="w-full py-3 bg-[#F7E998] hover:bg-[#EB4203] hover:text-white disabled:opacity-50 text-[#1a1a1a] text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                >
                  <ArrowUpRight size={14} />
                  {submitting ? "Processing Request..." : balance <= 0 ? "No Funds Available" : "Trigger Withdrawal"}
                </button>
              </form>
            </div>
          </div>

          {/* HISTORY TABLE */}
          <div className="bg-white border border-[#e5e7eb] rounded-2xl p-6">
            <h2 className="font-display font-bold text-[#EB4203] mb-5 flex items-center gap-2">
              <Clock size={18} className="text-[#EB4203]" /> Withdrawal History
            </h2>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-[#1a1a1a]">
                <thead className="bg-white text-[10px] text-[#555] uppercase tracking-wider">
                  <tr>
                    <th className="p-4 rounded-l-xl">Withdrawal ID</th>
                    <th className="p-4">Requested Date</th>
                    <th className="p-4">Amount</th>
                    <th className="p-4">Provider</th>
                    <th className="p-4">Reference</th>
                    <th className="p-4">Status</th>
                    <th className="p-4 rounded-r-xl">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#222]">
                  {withdrawals.map((w) => {
                    const amt = parseFloat(w.amount) || 0;
                    return (
                      <tr key={w.withdrawalId} className="hover:bg-[#ffffff] transition-colors">
                        <td className="p-4 font-mono text-[10px] text-[#999]">{w.withdrawalId?.substring(0, 8)}...</td>
                        <td className="p-4 text-[#555]">{w.createdAt ? new Date(w.createdAt).toLocaleDateString() : "—"}</td>
                        <td className="p-4 text-[#1a1a1a] font-medium">{amt.toFixed(2)} {w.currency}</td>
                        <td className="p-4 text-zinc-400 capitalize">{w.provider === "momo" ? "Mobile Money" : w.provider}</td>
                        <td className="p-4 font-mono text-[10px] text-[#555]">{w.providerReference || "—"}</td>
                        <td className="p-4">
                          <span
                            className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold ${
                              w.status === "SUCCESSFUL" ? "bg-green-50 text-green-700 border border-green-100" :
                              w.status === "PENDING" ? "bg-amber-500/15 text-amber-400" :
                              "bg-red-50 text-red-700 border border-red-100"
                            }`}
                          >
                            {w.status}
                          </span>
                        </td>
                        <td className="p-4">
                          <button
                            onClick={() => handleDeleteWithdrawal(w.withdrawalId)}
                            className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg border border-transparent hover:border-red-100 transition-all cursor-pointer flex items-center justify-center"
                            title="Delete Log"
                          >
                            <Trash2 size={13} />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {withdrawals.length === 0 && (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-[#555]">
                        No previous withdrawals recorded.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </main>
      </div>

      {/* TOAST NOTIFICATION */}
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
