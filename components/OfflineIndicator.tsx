"use client";

import { useEffect, useState } from "react";
import { WifiOff, RefreshCw, CheckCircle2 } from "lucide-react";
import { countQueuedActions, countPendingEvents, countPendingCheckIns } from "@/app/utils/offlineDb";

export default function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncedCount, setSyncedCount] = useState<number | null>(null);
  const [pendingCount, setPendingCount] = useState<number>(0);

  const checkPending = async () => {
    try {
      const q = await countQueuedActions();
      const e = await countPendingEvents();
      const c = await countPendingCheckIns();
      setPendingCount(q + e + c);
    } catch {
      setPendingCount(0);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;

    setIsOnline(navigator.onLine);
    checkPending();

    const handleOnline = () => {
      setIsOnline(true);
      checkPending();
    };

    const handleOffline = () => {
      setIsOnline(false);
      checkPending();
    };

    const handleSyncStart = () => setIsSyncing(true);
    const handleSyncEnd = () => {
      setIsSyncing(false);
      checkPending();
    };

    const handleResynced = (evt: Event) => {
      const detail = (evt as CustomEvent).detail;
      const count = detail?.count || 1;
      setSyncedCount(count);
      checkPending();
      setTimeout(() => setSyncedCount(null), 4000);
    };

    const handleQueued = () => checkPending();

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("yowevent:syncingstart", handleSyncStart);
    window.addEventListener("yowevent:syncingend", handleSyncEnd);
    window.addEventListener("yowevent:resynced", handleResynced);
    window.addEventListener("yowevent:actionqueued", handleQueued);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener("yowevent:syncingstart", handleSyncStart);
      window.removeEventListener("yowevent:syncingend", handleSyncEnd);
      window.removeEventListener("yowevent:resynced", handleResynced);
      window.removeEventListener("yowevent:actionqueued", handleQueued);
    };
  }, []);

  if (isOnline && !isSyncing && syncedCount === null && pendingCount === 0) {
    return null;
  }

  return (
    <div className="fixed bottom-5 right-5 z-[9999] pointer-events-auto">
      {/* Resynced Success Banner */}
      {syncedCount !== null ? (
        <div className="flex items-center gap-2.5 px-4 py-2.5 bg-emerald-600 text-white rounded-2xl text-xs font-bold shadow-xl animate-bounce">
          <CheckCircle2 size={16} />
          <span>Connected — Resynced {syncedCount} change{syncedCount > 1 ? "s" : ""}</span>
        </div>
      ) : isSyncing ? (
        <div className="flex items-center gap-2.5 px-4 py-2.5 bg-blue-600 text-white rounded-2xl text-xs font-bold shadow-xl">
          <RefreshCw size={15} className="animate-spin" />
          <span>Syncing offline changes...</span>
        </div>
      ) : !isOnline ? (
        <div className="flex items-center gap-2.5 px-4 py-2.5 bg-[#1a1a1a] text-white rounded-2xl text-xs font-bold shadow-xl border border-white/10">
          <WifiOff size={15} className="text-amber-400" />
          <span>
            Offline Mode
            {pendingCount > 0 ? ` (${pendingCount} queued)` : " — Auto-sync when online"}
          </span>
        </div>
      ) : pendingCount > 0 ? (
        <div className="flex items-center gap-2.5 px-4 py-2.5 bg-amber-500 text-white rounded-2xl text-xs font-bold shadow-xl">
          <RefreshCw size={15} className="animate-spin" />
          <span>Syncing {pendingCount} queued change{pendingCount > 1 ? "s" : ""}...</span>
        </div>
      ) : null}
    </div>
  );
}
