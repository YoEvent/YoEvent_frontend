"use client";

import { useEffect, useRef, useCallback } from "react";
import { api } from "./api";
import {
  getPendingEvents,
  deletePendingEvent,
  getPendingCheckIns,
  deletePendingCheckIn,
  getQueuedActions,
  deleteQueuedAction,
} from "./offlineDb";
import { eventService } from "./services/eventService";

export function useOfflineSync(onSynced?: (count: number) => void) {
  const syncing = useRef(false);
  const onSyncedRef = useRef(onSynced);
  onSyncedRef.current = onSynced;

  const syncPending = useCallback(async () => {
    if (syncing.current || typeof window === "undefined" || !navigator.onLine) return;
    syncing.current = true;
    let totalSynced = 0;

    window.dispatchEvent(new CustomEvent("yowevent:syncingstart"));

    try {
      // 1. Process pending new events
      const pendingEvents = await getPendingEvents().catch(() => []);
      for (const item of pendingEvents) {
        try {
          const ev = await eventService.createEvent(item.eventData);
          const id = ev.eventId || (ev as any).id;
          for (const day of item.scheduleData) {
            await eventService.createEventSchedule({ ...day, eventId: id });
          }
          await deletePendingEvent(item.id);
          totalSynced++;
        } catch (e) {
          // Leave in IndexedDB for retry on next sync cycle
        }
      }

      // 2. Process pending check-ins
      const pendingCheckins = await getPendingCheckIns().catch(() => []);
      for (const chk of pendingCheckins) {
        try {
          await api.post(`/api/v1/registrations/${chk.registrationId}/check-in`, {
            sessionId: chk.sessionId,
          });
          await deletePendingCheckIn(chk.id);
          totalSynced++;
        } catch (e) {
          // Leave in IndexedDB for retry
        }
      }

      // 3. Process generic queued actions
      const queuedActions = await getQueuedActions().catch(() => []);
      for (const act of queuedActions) {
        try {
          await api.request(act.endpoint, {
            method: act.method,
            body: act.payload ? JSON.stringify(act.payload) : undefined,
          });
          await deleteQueuedAction(act.id);
          totalSynced++;
        } catch (e) {
          // Leave in IndexedDB for retry
        }
      }

      if (totalSynced > 0) {
        onSyncedRef.current?.(totalSynced);
        window.dispatchEvent(new CustomEvent("yowevent:resynced", { detail: { count: totalSynced } }));
      }
    } finally {
      syncing.current = false;
      window.dispatchEvent(new CustomEvent("yowevent:syncingend"));
    }
  }, []);

  useEffect(() => {
    syncPending();
    window.addEventListener("online", syncPending);
    return () => window.removeEventListener("online", syncPending);
  }, [syncPending]);

  return { syncPending };
}
