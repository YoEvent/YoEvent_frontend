"use client";
import { useEffect, useRef, useCallback } from "react";
import { getPendingEvents, deletePendingEvent } from "./offlineDb";
import { eventService } from "./services/eventService";

export function useOfflineSync(onSynced?: (count: number) => void) {
  const syncing = useRef(false);
  const onSyncedRef = useRef(onSynced);
  onSyncedRef.current = onSynced;

  const syncPending = useCallback(async () => {
    if (syncing.current || !navigator.onLine) return;
    syncing.current = true;
    try {
      const pending = await getPendingEvents();
      if (pending.length === 0) return;
      let synced = 0;
      for (const item of pending) {
        try {
          const ev = await eventService.createEvent(item.eventData);
          const id = ev.eventId || (ev as any).id;
          await eventService.createEventSchedule({ ...item.scheduleData, eventId: id });
          await deletePendingEvent(item.id);
          synced++;
        } catch {
          // leave in IndexedDB to retry next time
        }
      }
      if (synced > 0) onSyncedRef.current?.(synced);
    } finally {
      syncing.current = false;
    }
  }, []); // stable reference — uses ref for callback

  useEffect(() => {
    syncPending();
    window.addEventListener("online", syncPending);
    return () => window.removeEventListener("online", syncPending);
  }, [syncPending]);

  return { syncPending };
}
