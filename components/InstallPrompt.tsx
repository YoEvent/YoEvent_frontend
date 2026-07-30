"use client";

import { useEffect, useState } from "react";
import { Download, X } from "lucide-react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISSED_KEY = "ye_pwa_install_dismissed";

export default function InstallPrompt() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(display-mode: standalone)").matches) return; // already installed
    if (localStorage.getItem(DISMISSED_KEY)) return;

    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setVisible(true);
    };
    const onInstalled = () => {
      setVisible(false);
      setDeferredPrompt(null);
    };

    window.addEventListener("beforeinstallprompt", onBeforeInstallPrompt);
    window.addEventListener("appinstalled", onInstalled);
    return () => {
      window.removeEventListener("beforeinstallprompt", onBeforeInstallPrompt);
      window.removeEventListener("appinstalled", onInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
    setVisible(false);
  };

  const handleDismiss = () => {
    localStorage.setItem(DISMISSED_KEY, "1");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-sm z-[9998] bg-[#1a1a1a] text-white rounded-2xl shadow-2xl p-4 flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl bg-[#FF4747] flex items-center justify-center shrink-0 font-black">Y</div>
      <div className="flex-1 min-w-0">
        <p className="text-xs font-bold">Install YowEvent</p>
        <p className="text-[11px] text-white/60">Add it to your home screen for faster, app-like access.</p>
      </div>
      <button
        onClick={handleInstall}
        className="shrink-0 flex items-center gap-1.5 bg-[#FF4747] hover:bg-[#e03e3e] text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors cursor-pointer"
      >
        <Download size={12} /> Install
      </button>
      <button onClick={handleDismiss} className="shrink-0 text-white/40 hover:text-white transition-colors cursor-pointer">
        <X size={14} />
      </button>
    </div>
  );
}
