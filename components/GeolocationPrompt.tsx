"use client";

import { useState } from "react";
import { MapPin, X } from "lucide-react";
import { authService } from "@/app/utils/services/authService";

const CHOICE_KEY = "ye_location_prompt_choice";

/** Whether the user has already answered (allowed or declined) the location prompt before. */
export function hasAnsweredLocationPrompt(): boolean {
  if (typeof window === "undefined") return true;
  try {
    return !!localStorage.getItem(CHOICE_KEY);
  } catch {
    return true;
  }
}

export default function GeolocationPrompt({ userId, onDone }: { userId: string; onDone: () => void }) {
  const [status, setStatus] = useState<"idle" | "requesting" | "granted" | "error">("idle");

  const finish = (choice: "granted" | "declined") => {
    try {
      localStorage.setItem(CHOICE_KEY, choice);
    } catch {}
    onDone();
  };

  const handleAllow = () => {
    if (typeof navigator === "undefined" || !("geolocation" in navigator)) {
      finish("declined");
      return;
    }
    setStatus("requesting");
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        try {
          await authService.updateUserLocation(userId, pos.coords.latitude, pos.coords.longitude);
        } catch {
          // best-effort — still count this as a granted choice so we don't ask again
        }
        setStatus("granted");
        setTimeout(() => finish("granted"), 700);
      },
      () => {
        setStatus("error");
        setTimeout(() => finish("declined"), 900);
      },
      { timeout: 10000, enableHighAccuracy: false }
    );
  };

  const handleDecline = () => finish("declined");

  return (
    <div className="fixed inset-0 z-[9999] bg-black/40 flex items-center justify-center px-4">
      <div className="bg-white rounded-3xl shadow-2xl border border-[#e5e7eb] max-w-sm w-full p-7 relative">
        {status === "idle" && (
          <button
            onClick={handleDecline}
            aria-label="Dismiss"
            className="absolute top-4 right-4 text-[#aaa] hover:text-[#1a1a1a] transition-colors cursor-pointer"
          >
            <X size={16} />
          </button>
        )}

        <div className="w-12 h-12 rounded-2xl bg-[#FF4747]/10 flex items-center justify-center mb-4">
          <MapPin size={22} className="text-[#FF4747]" />
        </div>

        {status === "granted" ? (
          <>
            <h3 className="font-display text-lg font-bold text-[#1a1a1a] mb-1">Thanks!</h3>
            <p className="text-sm text-[#888]">We'll use your location to show events happening near you.</p>
          </>
        ) : status === "error" ? (
          <>
            <h3 className="font-display text-lg font-bold text-[#1a1a1a] mb-1">No worries</h3>
            <p className="text-sm text-[#888]">You can always enable location later from your browser settings.</p>
          </>
        ) : (
          <>
            <h3 className="font-display text-lg font-bold text-[#1a1a1a] mb-1">Find events near you</h3>
            <p className="text-sm text-[#888] mb-6">
              Share your location so we can recommend and sort events close to you. You can always change this later.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDecline}
                className="flex-1 py-2.5 border border-[#e5e7eb] text-[#555] rounded-full text-sm font-semibold hover:bg-[#f5f5f5] transition-colors cursor-pointer"
              >
                Not now
              </button>
              <button
                onClick={handleAllow}
                disabled={status === "requesting"}
                className="flex-1 py-2.5 bg-[#FF4747] text-white rounded-full text-sm font-semibold hover:bg-[#e03e3e] transition-colors cursor-pointer disabled:opacity-60"
              >
                {status === "requesting" ? "Requesting…" : "Allow Location"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
