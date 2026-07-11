"use client";
import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { Code2, Plus, Trash2, Eye, EyeOff, Copy, Star, AlertTriangle } from "lucide-react";
import { api } from "@/app/utils/api";
import { getStoredAuth } from "@/app/utils/api";

interface ApiKey {
  keyId: string;
  name: string;
  keyPrefix: string;
  planTier: string;
  revoked: boolean;
  createdAt: string;
  lastUsedAt?: string;
}

export default function DevelopersPage() {
  const [keys, setKeys] = useState<ApiKey[]>([]);
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

  const tenantId = getStoredAuth()?.tenantId;

  const fetchKeys = async () => {
    if (!tenantId) return;
    try {
      const data = await api.get<ApiKey[]>(`/api/v1/tenants/${tenantId}/api-keys`);
      setKeys(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, []);

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
      await fetchKeys();
      showToast("API key generated — save it now, it won't be shown again.");
    } catch (err: any) {
      showToast(err?.message || "Failed to generate key.");
    } finally {
      setGenerating(false);
    }
  };

  const handleRevoke = async (keyId: string) => {
    if (!tenantId) return;
    try {
      await api.delete(`/api/v1/tenants/${tenantId}/api-keys/${keyId}`);
      setRevokeConfirm(null);
      if (revealedKey && keys.find((k) => k.keyId === keyId)?.keyPrefix && revealedKey.startsWith(keys.find((k) => k.keyId === keyId)!.keyPrefix)) {
        setRevealedKey(null);
      }
      await fetchKeys();
      showToast("API key revoked.");
    } catch (err: any) {
      showToast(err?.message || "Failed to revoke key.");
    }
  };

  const copyKey = () => {
    if (!revealedKey) return;
    navigator.clipboard.writeText(revealedKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const activeKeys = keys.filter((k) => !k.revoked);
  const revokedKeys = keys.filter((k) => k.revoked);

  return (
    <div className="flex bg-[#f9fafb] min-h-screen text-[#374151]">
      <Sidebar />
      <div className="ml-[220px] flex-1 flex flex-col">
        {toast && (
          <div className="fixed top-5 right-5 z-50 bg-[#1a1a1a] text-white text-xs font-semibold px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2">
            <Star size={12} className="text-[#FF4747]" />
            {toast}
          </div>
        )}

        <header className="h-[60px] bg-white border-b border-[#e5e7eb] flex items-center px-8 sticky top-0 z-40">
          <h1 className="font-display text-xl font-bold text-[#EB4203] flex items-center gap-2">
            <Code2 size={20} /> Developers — API Keys
          </h1>
        </header>

        <main className="p-8 max-w-[860px] space-y-6">
          {/* Explainer */}
          <div className="bg-white border border-[#e5e7eb] rounded-2xl p-6 space-y-2">
            <h2 className="text-sm font-bold text-[#1a1a1a]">YoEvent as a Service (EaaS)</h2>
            <p className="text-xs text-[#555] leading-relaxed">
              Use your API key to call YoEvent endpoints from your own application. Include it in the
              <code className="mx-1 px-1.5 py-0.5 bg-[#f3f4f6] rounded text-[#EB4203] font-mono text-[10px]">X-API-Key</code>
              header with every request. Your plan tier determines the monthly call quota enforced on all keys.
            </p>
            <div className="mt-3 bg-[#1a1a1a] rounded-xl px-5 py-3 font-mono text-[10px] text-green-400 leading-relaxed">
              <span className="text-[#aaa]"># Example</span><br />
              curl -X GET https://api.yoevent.com/api/v1/events \<br />
              {"  "}-H <span className="text-yellow-300">&quot;X-API-Key: ye_live_...&quot;</span> \<br />
              {"  "}-H <span className="text-yellow-300">&quot;X-Tenant-Id: your-tenant-id&quot;</span>
            </div>
          </div>

          {/* Revealed key banner */}
          {revealedKey && (
            <div className="bg-amber-50 border border-amber-200 rounded-2xl p-5 space-y-3">
              <div className="flex items-center gap-2 text-amber-700 text-xs font-bold">
                <AlertTriangle size={14} />
                Your new API key — copy it now. It will not be shown again.
              </div>
              <div className="flex items-center gap-2">
                <code className="flex-1 bg-white border border-amber-200 rounded-xl px-4 py-2.5 font-mono text-[11px] text-[#1a1a1a] break-all">
                  {revealedKey}
                </code>
                <button
                  onClick={copyKey}
                  className="shrink-0 px-4 py-2.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Copy size={12} /> {copied ? "Copied!" : "Copy"}
                </button>
              </div>
              <button
                onClick={() => setRevealedKey(null)}
                className="text-[10px] text-amber-600 underline cursor-pointer"
              >
                I&apos;ve saved it, dismiss
              </button>
            </div>
          )}

          {/* Generate new key */}
          <div className="bg-white border border-[#e5e7eb] rounded-2xl p-6">
            <h2 className="text-sm font-bold text-[#1a1a1a] mb-4">Generate New API Key</h2>
            <form onSubmit={handleGenerate} className="flex gap-3">
              <input
                type="text"
                placeholder="Key name (e.g. My App Production)"
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
                <Plus size={14} /> {generating ? "Generating..." : "Generate Key"}
              </button>
            </form>
            <p className="text-[10px] text-[#888] mt-2">Maximum 10 active keys per tenant.</p>
          </div>

          {/* Active keys */}
          <div className="bg-white border border-[#e5e7eb] rounded-2xl p-6">
            <h2 className="text-sm font-bold text-[#1a1a1a] mb-4">Active Keys ({activeKeys.length})</h2>
            {loading ? (
              <p className="text-xs text-[#888]">Loading...</p>
            ) : activeKeys.length === 0 ? (
              <p className="text-xs text-[#888] py-8 text-center border border-dashed border-[#e5e7eb] rounded-xl">
                No active API keys. Generate one above.
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
                        Created {new Date(key.createdAt).toLocaleDateString()}
                        {key.lastUsedAt ? ` · Last used ${new Date(key.lastUsedAt).toLocaleDateString()}` : " · Never used"}
                      </div>
                    </div>
                    {revokeConfirm === key.keyId ? (
                      <div className="flex items-center gap-2 shrink-0">
                        <span className="text-[10px] text-red-600 font-semibold">Revoke?</span>
                        <button
                          onClick={() => handleRevoke(key.keyId)}
                          className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-[10px] font-bold rounded-lg cursor-pointer transition-colors"
                        >
                          Yes
                        </button>
                        <button
                          onClick={() => setRevokeConfirm(null)}
                          className="px-3 py-1.5 bg-[#e5e7eb] hover:bg-[#d1d5db] text-[#1a1a1a] text-[10px] font-bold rounded-lg cursor-pointer transition-colors"
                        >
                          No
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setRevokeConfirm(key.keyId)}
                        className="shrink-0 p-2 text-[#888] hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        title="Revoke key"
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
              <h2 className="text-sm font-bold text-[#aaa] mb-4">Revoked Keys ({revokedKeys.length})</h2>
              <div className="space-y-2">
                {revokedKeys.map((key) => (
                  <div key={key.keyId} className="flex items-center justify-between p-4 bg-[#f9fafb] border border-[#e5e7eb] rounded-xl gap-4 opacity-50">
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-[#1a1a1a] truncate line-through">{key.name}</div>
                      <code className="text-[10px] text-[#555] font-mono">{key.keyPrefix}••••••••••••</code>
                    </div>
                    <span className="text-[9px] uppercase tracking-wider px-2 py-0.5 rounded-full bg-red-50 text-red-600 border border-red-100 font-semibold shrink-0">
                      Revoked
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
