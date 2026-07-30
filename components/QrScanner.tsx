"use client";
import { useEffect, useRef, useState } from "react";
import { Camera, CameraOff } from "lucide-react";

interface QrScannerProps {
  onDetected: (rawValue: string) => void;
  /** Pause detection (e.g. while a result is being processed) without tearing down the camera. */
  paused?: boolean;
}

/**
 * Camera-based QR scanner using the native BarcodeDetector API (Chrome/Edge/Android —
 * the realistic kiosk-device targets). Falls back to a message on browsers without it
 * (notably Safari/iOS) rather than silently failing; manual code entry remains available
 * alongside this component for those devices.
 */
export default function QrScanner({ onDetected, paused }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastValueRef = useRef<{ value: string; at: number } | null>(null);
  const [supported, setSupported] = useState<boolean | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    setSupported(typeof window !== "undefined" && "BarcodeDetector" in window);
  }, []);

  useEffect(() => {
    if (!supported) return;
    let cancelled = false;

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
        setActive(true);
        setError(null);

        // @ts-expect-error BarcodeDetector isn't in the default TS DOM lib yet
        const detector = new window.BarcodeDetector({ formats: ["qr_code"] });

        const tick = async () => {
          if (cancelled) return;
          if (!paused && videoRef.current && videoRef.current.readyState >= 2) {
            try {
              const codes = await detector.detect(videoRef.current);
              if (codes.length > 0) {
                const value = codes[0].rawValue as string;
                const now = Date.now();
                // De-dupe: ignore the same value re-detected within 3s (holding the badge
                // steady in front of the camera shouldn't fire the callback every frame).
                if (!lastValueRef.current || lastValueRef.current.value !== value || now - lastValueRef.current.at > 3000) {
                  lastValueRef.current = { value, at: now };
                  onDetected(value);
                }
              }
            } catch {
              // transient decode error — keep scanning
            }
          }
          rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      } catch (err: any) {
        if (!cancelled) setError(err?.message || "Camera access denied.");
      }
    };

    start();
    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
      setActive(false);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supported]);

  if (supported === null) return null;

  if (!supported) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-xs text-amber-800 flex items-center gap-2">
        <CameraOff size={14} className="shrink-0" />
        Camera QR scanning isn't supported on this browser (works on Chrome/Edge/Android). Use manual code entry below.
      </div>
    );
  }

  return (
    <div className="relative rounded-xl overflow-hidden bg-black aspect-video">
      <video ref={videoRef} muted playsInline className="w-full h-full object-cover" />
      {!active && !error && (
        <div className="absolute inset-0 flex items-center justify-center text-white/70 text-xs gap-2">
          <Camera size={14} /> Starting camera…
        </div>
      )}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 text-white text-xs text-center px-6">
          {error}
        </div>
      )}
      {active && (
        <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
          <div className="w-2/3 aspect-square border-2 border-[#FF4747] rounded-2xl" />
        </div>
      )}
    </div>
  );
}
