"use client";

import { api } from "./api";
import { saveQueuedAction } from "./offlineDb";

export interface ExecuteOrQueueParams<T = any> {
  actionType: string;
  endpoint: string;
  method: "POST" | "PUT" | "PATCH" | "DELETE";
  payload?: any;
  meta?: Record<string, any>;
  onOfflineFallback?: () => T | Promise<T>;
}

/**
 * Execute an API mutation online or queue it into IndexedDB when offline.
 */
export async function executeOrQueueAction<T = any>({
  actionType,
  endpoint,
  method,
  payload,
  meta,
  onOfflineFallback,
}: ExecuteOrQueueParams<T>): Promise<{ success: boolean; data?: T; isOffline?: boolean }> {
  if (typeof window !== "undefined" && navigator.onLine) {
    try {
      const data = await api.request<T>(endpoint, {
        method,
        body: payload ? JSON.stringify(payload) : undefined,
      });
      return { success: true, data, isOffline: false };
    } catch (err: any) {
      // Check if network error (e.g. status === 0, fetch failure, socket hangup)
      const isNetworkError =
        !navigator.onLine ||
        err?.message?.toLowerCase().includes("network") ||
        err?.message?.toLowerCase().includes("fetch") ||
        err?.message?.toLowerCase().includes("failed to fetch") ||
        err?.status === 0;

      if (!isNetworkError) {
        throw err;
      }
    }
  }

  // Queue for offline processing
  await saveQueuedAction({
    actionType,
    endpoint,
    method,
    payload,
    meta,
  });

  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent("yowevent:actionqueued"));
  }

  let fallbackData: T | undefined = undefined;
  if (onOfflineFallback) {
    fallbackData = await onOfflineFallback();
  }

  return { success: true, data: fallbackData, isOffline: true };
}
