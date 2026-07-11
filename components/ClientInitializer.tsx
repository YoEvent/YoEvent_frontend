"use client";

import { useEffect, useState } from "react";
import { api, clearStoredAuth, getStoredAuth } from "@/app/utils/api";
import { syncEvents } from "@/app/utils/duckdb";
import { useRouter } from "next/navigation";

export default function ClientInitializer() {
  const router = useRouter();
  const [forbiddenMsg, setForbiddenMsg] = useState<string | null>(null);

  // Service Worker + DuckDB sync
  useEffect(() => {
    if (typeof window !== "undefined" && "serviceWorker" in navigator) {
      if (process.env.NODE_ENV === "development") {
        navigator.serviceWorker.getRegistrations().then((registrations) => {
          if (registrations.length > 0) {
            for (let registration of registrations) {
              registration.unregister().then(() => {
                console.log("Unregistered service worker in development mode to prevent caching.");
              });
            }
            if ("caches" in window) {
              caches.keys().then((keys) => {
                keys.forEach((key) => caches.delete(key));
              });
            }
            setTimeout(() => {
              window.location.reload();
            }, 150);
          }
        });
      } else {
        navigator.serviceWorker
          .register("/sw.js")
          .then((reg) => console.log("Service Worker registered on scope:", reg.scope))
          .catch((err) => console.warn("Service Worker registration failed:", err));
      }
    }

    const runSync = async () => {
      try {
        console.log("Starting local DuckDB synchronization...");
        const events = await api.get<any[]>("/api/v1/events");
        if (events && Array.isArray(events)) {
          await syncEvents(events);
        }
      } catch (err) {
        console.warn("Failed to synchronize events with local DuckDB (offline?):", err);
      }
    };

    runSync();
    const interval = setInterval(runSync, 60000);
    return () => clearInterval(interval);
  }, []);

  // Global 403 handler — fires when backend RBAC rejects a request
  useEffect(() => {
    const handleForbidden = (e: Event) => {
      const detail = (e as CustomEvent).detail as { path: string; hasTenant?: boolean; message?: string };
      const isTenantPath = detail?.path && (detail.path.includes("/tenants") || detail.path.includes("/tenantsettings"));
      
      if (detail?.hasTenant && isTenantPath) {
        // The user's tenant may have been deleted (TenantDeletedEvent cascade)
        setForbiddenMsg("Your workspace no longer exists or your permissions have been revoked. Please re-login.");
      } else if (detail?.message && !detail.message.includes("Status: 403")) {
        setForbiddenMsg(detail.message);
      } else {
        setForbiddenMsg("You don't have permission to perform this action.");
      }
    };

    window.addEventListener("yowevent:forbidden", handleForbidden);
    return () => window.removeEventListener("yowevent:forbidden", handleForbidden);
  }, []);

  const handleForbiddenDismiss = () => setForbiddenMsg(null);

  const handleForbiddenLogout = () => {
    clearStoredAuth();
    setForbiddenMsg(null);
    router.push("/login");
  };

  if (!forbiddenMsg) return null;

  const isWorkspaceIssue = forbiddenMsg.includes("workspace");
  // Detect if the forbidden happened while on an admin / organizer path
  const isAdminPath = typeof window !== "undefined" && window.location.pathname.startsWith("/admin");

  return (
    <div className="fixed top-4 right-4 z-[9999] bg-white border border-red-200 shadow-xl rounded-2xl p-4 max-w-sm w-full">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl bg-red-50 flex items-center justify-center shrink-0 mt-0.5">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10" /><line x1="12" y1="8" x2="12" y2="12" /><line x1="12" y1="16" x2="12.01" y2="16" />
          </svg>
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-[#1a1a1a]">Access Denied</p>
          <p className="text-xs text-[#666] mt-0.5 leading-relaxed">{forbiddenMsg}</p>
          {(isWorkspaceIssue || isAdminPath) && (
            <button
              onClick={handleForbiddenLogout}
              className="mt-2 text-xs font-semibold text-red-600 hover:underline cursor-pointer"
            >
              {isAdminPath
                ? "Re-login to refresh your session →"
                : "Log out and re-login →"}
            </button>
          )}
        </div>
        <button
          onClick={handleForbiddenDismiss}
          className="shrink-0 text-[#bbb] hover:text-[#666] transition-colors cursor-pointer mt-0.5"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
    </div>
  );
}
