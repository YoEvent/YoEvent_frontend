"use client";

import { useEffect } from "react";
import { api } from "@/app/utils/api";
import { syncEvents } from "@/app/utils/duckdb";

/**
 * Client side initialization component to register PWA service worker and sync DuckDB.
 *
 * @author Thomas Djotio Ndié
 * @since 2026-05-27
 */
export default function ClientInitializer() {
  useEffect(() => {
    // 1. Service Worker Registration for PWA capability
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

    // 2. Synchronize server-side events with client-side DuckDB-Wasm
    const runSync = async () => {
      try {
        console.log("Starting local DuckDB synchronization...");
        // Fetch all events from API gateway
        const events = await api.get<any[]>("/api/v1/events");
        if (events && Array.isArray(events)) {
          await syncEvents(events);
        }
      } catch (err) {
        console.warn("Failed to synchronize events with local DuckDB (offline?):", err);
      }
    };

    // Run sync on load and set up interval sync every 60 seconds
    runSync();
    const interval = setInterval(runSync, 60000);
    return () => clearInterval(interval);
  }, []);

  return null;
}
