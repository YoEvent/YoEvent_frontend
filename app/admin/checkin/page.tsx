"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import Sidebar from "@/components/Sidebar";
import QrScanner from "@/components/QrScanner";
import { eventService } from "@/app/utils/services/eventService";
import { getStoredAuth } from "@/app/utils/api";
import { savePendingCheckIn, getPendingCheckIns, deletePendingCheckIn, countPendingCheckIns } from "@/app/utils/offlineDb";
import {
  ScanLine, Check, X, AlertCircle, Search, QrCode, Users,
  Calendar, ChevronRight, CheckCircle2, XCircle, Camera, Keyboard,
  Maximize, Minimize, WifiOff, RefreshCw
} from "lucide-react";
import { useLanguage } from "@/app/context/LanguageContext";

const inp = "w-full bg-white border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-sm text-[#1a1a1a] placeholder:text-[#aaa] outline-none focus:border-[#FF4747] transition-colors";
const label = "block text-[10px] font-semibold text-[#888] uppercase tracking-wider mb-1.5";

type CheckInResult = { success: boolean; message: string; registration?: any };

export default function CheckInPage() {
  const { t } = useLanguage();
  const auth = getStoredAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState("");
  const [registrations, setRegistrations] = useState<any[]>([]);
  const [loadingRegs, setLoadingRegs] = useState(false);
  const [manualCode, setManualCode] = useState("");
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState<CheckInResult | null>(null);
  const [search, setSearch] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const [scanMode, setScanMode] = useState<"manual" | "camera">("camera");
  const [kioskMode, setKioskMode] = useState(false);
  const [isOnline, setIsOnline] = useState(true);
  const [offlineQueueCount, setOfflineQueueCount] = useState(0);
  const [syncing, setSyncing] = useState(false);
  const [showEventDropdown, setShowEventDropdown] = useState(false);
  const [showSessionDropdown, setShowSessionDropdown] = useState(false);

  useEffect(() => {
    const load = async () => {
      try {
        const evs = await eventService.getMyEvents();
        const filtered = (evs || []).filter((e: any) => !auth?.tenantId || !e.tenantId || e.tenantId === auth.tenantId);
        setEvents(filtered);
        if (filtered.length) setSelectedEventId(filtered[0].eventId);
      } catch {}
    };
    load();
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      loadRegistrations(selectedEventId);
      loadSessions(selectedEventId);
    }
  }, [selectedEventId]);

  const loadRegistrations = async (eventId: string) => {
    setLoadingRegs(true);
    try {
      const regs = await eventService.getRegistrationsByEvent(eventId).catch(() => []);
      setRegistrations(regs || []);
    } catch {} finally { setLoadingRegs(false); }
  };

  const loadSessions = async (eventId: string) => {
    try {
      const all = await eventService.getSessions().catch(() => []);
      const eventSessions = (all || []).filter((s: any) => s.eventId === eventId || s.event?.eventId === eventId);
      setSessions(eventSessions);
      setSelectedSessionId(eventSessions[0]?.sessionId || eventSessions[0]?.id || "");
    } catch {}
  };

  // Syncs any check-ins queued in IndexedDB while the device was offline —
  // matches the pattern useOfflineSync uses for pending events.
  const syncPendingCheckIns = useCallback(async () => {
    if (!navigator.onLine || syncing) return;
    setSyncing(true);
    try {
      const pending = await getPendingCheckIns();
      for (const item of pending) {
        try {
          await eventService.checkInRegistration(item.registrationId, item.sessionId);
          await deletePendingCheckIn(item.id);
        } catch {
          // leave queued, retry next time we come online
        }
      }
      setOfflineQueueCount(await countPendingCheckIns());
      if (selectedEventId) await loadRegistrations(selectedEventId);
    } finally {
      setSyncing(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedEventId]);

  useEffect(() => {
    setIsOnline(navigator.onLine);
    countPendingCheckIns().then(setOfflineQueueCount);

    const onOnline = () => { setIsOnline(true); syncPendingCheckIns(); };
    const onOffline = () => setIsOnline(false);
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    syncPendingCheckIns();
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const toggleKioskMode = async () => {
    try {
      if (!kioskMode) {
        await document.documentElement.requestFullscreen();
        setKioskMode(true);
      } else {
        if (document.fullscreenElement) await document.exitFullscreen();
        setKioskMode(false);
      }
    } catch {
      // Fullscreen can be denied (e.g. no user gesture, browser policy) — the rest
      // of kiosk mode (bigger touch targets, hidden sidebar) still applies below.
      setKioskMode((k) => !k);
    }
  };

  const doCheckIn = async (regId: string) => {
    if (!selectedSessionId) {
      setResult({ success: false, message: "Select a session before checking in." });
      return;
    }
    setProcessing(true);
    setResult(null);

    if (!navigator.onLine) {
      try {
        await savePendingCheckIn(regId, selectedSessionId);
        setOfflineQueueCount(await countPendingCheckIns());
        // Optimistic local update so the kiosk operator sees it as done immediately.
        setRegistrations((prev) =>
          prev.map((r: any) => (r.registrationId || r.id) === regId
            ? { ...r, checkedIn: true, checkedInAt: new Date().toISOString() }
            : r)
        );
        setResult({ success: true, message: "Checked in offline — will sync automatically once back online." });
        setManualCode("");
      } catch (err: any) {
        setResult({ success: false, message: err.message || "Failed to queue offline check-in." });
      } finally {
        setProcessing(false);
        setTimeout(() => inputRef.current?.focus(), 100);
      }
      return;
    }

    try {
      const updated = await eventService.checkInRegistration(regId, selectedSessionId);
      setResult({ success: true, message: t("adminCheckin.result.checkInSuccessMessage"), registration: updated });
      setManualCode("");
      await loadRegistrations(selectedEventId);
    } catch (err: any) {
      setResult({ success: false, message: err.message || t("adminCheckin.result.checkInFailedDefault") });
    } finally {
      setProcessing(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  };

  const resolveAndCheckIn = async (rawCode: string) => {
    if (!rawCode.trim()) return;

    let match = null;
    const searchCode = rawCode.trim();

    // Check if it's an order QR code
    if (searchCode.startsWith("YOEVENT:ORDER:")) {
      const orderId = searchCode.substring("YOEVENT:ORDER:".length);
      setProcessing(true);
      try {
        const order = await eventService.getOrderById(orderId);
        if (order && order.userId) {
          match = registrations.find((r: any) => r.userId === order.userId);
        }
      } catch (err: any) {
        console.error("Failed to fetch order for check-in:", err);
      } finally {
        setProcessing(false);
      }
    }

    // If not found by order yet, search normally
    if (!match) {
      match = registrations.find((r: any) =>
        r.confirmationCode?.toUpperCase() === searchCode.toUpperCase() ||
        (r.registrationId || r.id)?.startsWith(searchCode) ||
        r.qrCode?.includes(searchCode)
      );
    }

    if (!match) {
      setResult({ success: false, message: `No registration found matching "${searchCode}". Check the confirmation code and try again.` });
      return;
    }

    if (match.checkedIn) {
      setResult({ success: false, message: `Already checked in at ${match.checkedInAt ? new Date(match.checkedInAt).toLocaleTimeString() : "earlier"}.` });
      return;
    }

    await doCheckIn(match.registrationId || match.id);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") resolveAndCheckIn(manualCode);
  };

  const filteredRegs = registrations.filter((r: any) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (r.confirmationCode || "").toLowerCase().includes(q) ||
      (r.registrationId || r.id || "").toLowerCase().includes(q);
  });

  const checkedInCount = registrations.filter((r: any) => r.checkedIn).length;
  const notCheckedInCount = registrations.length - checkedInCount;

  return (
    <div className={`flex bg-[#f9fafb] min-h-screen text-[#1a1a1a] ${kioskMode ? "text-lg" : ""}`}>
      {!kioskMode && <Sidebar />}

      <div className={`${kioskMode ? "" : "ml-[220px]"} flex-1 p-8`}>
        <div className="max-w-4xl mx-auto">

          {/* Header */}
          <div className="mb-8 flex items-start justify-between gap-4">
            <div>
              <p className="text-xs text-[#aaa] font-semibold uppercase tracking-widest mb-1">Admin</p>
              <h1 className="font-display font-black text-3xl text-[#1a1a1a] flex items-center gap-3">
                <ScanLine size={28} className="text-[#FF4747]" /> Check-in Scanner
              </h1>
              <p className="text-[#888] text-sm mt-1">Scan QR codes or enter confirmation codes to check attendees in.</p>
            </div>
            <button
              type="button"
              onClick={toggleKioskMode}
              title={kioskMode ? "Exit kiosk mode" : "Enter kiosk mode (fullscreen, unattended device)"}
              className="shrink-0 flex items-center gap-1.5 px-3 py-2 bg-white border border-[#e5e7eb] rounded-xl text-xs font-semibold text-[#666] hover:text-[#FF4747] transition-colors cursor-pointer"
            >
              {kioskMode ? <Minimize size={14} /> : <Maximize size={14} />}
              {kioskMode ? "Exit kiosk" : "Kiosk mode"}
            </button>
          </div>

          {/* Offline / sync status */}
          {(!isOnline || offlineQueueCount > 0) && (
            <div className={`mb-6 rounded-2xl p-4 flex items-center gap-3 text-xs border ${!isOnline ? "bg-amber-50 border-amber-200 text-amber-800" : "bg-blue-50 border-blue-200 text-blue-800"}`}>
              {!isOnline ? <WifiOff size={16} className="shrink-0" /> : <RefreshCw size={16} className={`shrink-0 ${syncing ? "animate-spin" : ""}`} />}
              <span className="flex-1">
                {!isOnline
                  ? "You're offline — check-ins are being queued on this device and will sync automatically once reconnected."
                  : `${offlineQueueCount} check-in${offlineQueueCount === 1 ? "" : "s"} queued from earlier — ${syncing ? "syncing now…" : "syncing…"}`}
              </span>
              {offlineQueueCount > 0 && <span className="shrink-0 font-bold">{offlineQueueCount}</span>}
            </div>
          )}

          {/* Event + session selector */}
          <div className="bg-white border border-[#e5e7eb] rounded-2xl p-5 mb-6 grid sm:grid-cols-2 gap-4">
            <div>
              <label className={label}><Calendar size={10} className="inline mr-1" />Select Event</label>
              <div className="relative">
                <button type="button" onClick={() => setShowEventDropdown(v => !v)} className={inp + " flex items-center justify-between gap-2 cursor-pointer"}>
                  <span className="truncate">{events.find((ev: any) => ev.eventId === selectedEventId)?.title || "No events found"}</span>
                  <ChevronRight size={14} className={`text-[#aaa] transition-transform shrink-0 ${showEventDropdown ? "rotate-90" : ""}`} />
                </button>
                {showEventDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowEventDropdown(false)} />
                    <div className="absolute z-50 mt-1 w-full bg-white border border-[#e5e7eb] rounded-xl shadow-lg overflow-hidden max-h-60 overflow-y-auto">
                      {events.length === 0 && <div className="px-4 py-2.5 text-xs text-[#aaa]">No events found</div>}
                      {events.map((ev: any) => (
                        <button key={ev.eventId} type="button" onClick={() => { setSelectedEventId(ev.eventId); setShowEventDropdown(false); }} className={`w-full text-left px-4 py-2.5 text-xs hover:bg-[#fafafa] transition-colors cursor-pointer ${selectedEventId === ev.eventId ? "text-[#FF4747] font-semibold bg-[#fff5f5]" : "text-[#1a1a1a]"}`}>
                          {ev.title}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
            <div>
              <label className={label}><ScanLine size={10} className="inline mr-1" />Select Session</label>
              <div className="relative">
                <button type="button" onClick={() => setShowSessionDropdown(v => !v)} className={inp + " flex items-center justify-between gap-2 cursor-pointer"}>
                  <span className="truncate">{sessions.find((s: any) => (s.sessionId || s.id) === selectedSessionId)?.title || "No sessions found"}</span>
                  <ChevronRight size={14} className={`text-[#aaa] transition-transform shrink-0 ${showSessionDropdown ? "rotate-90" : ""}`} />
                </button>
                {showSessionDropdown && (
                  <>
                    <div className="fixed inset-0 z-40" onClick={() => setShowSessionDropdown(false)} />
                    <div className="absolute z-50 mt-1 w-full bg-white border border-[#e5e7eb] rounded-xl shadow-lg overflow-hidden max-h-60 overflow-y-auto">
                      {sessions.length === 0 && <div className="px-4 py-2.5 text-xs text-[#aaa]">No sessions found</div>}
                      {sessions.map((s: any) => (
                        <button key={s.sessionId || s.id} type="button" onClick={() => { setSelectedSessionId(s.sessionId || s.id); setShowSessionDropdown(false); }} className={`w-full text-left px-4 py-2.5 text-xs hover:bg-[#fafafa] transition-colors cursor-pointer ${selectedSessionId === (s.sessionId || s.id) ? "text-[#FF4747] font-semibold bg-[#fff5f5]" : "text-[#1a1a1a]"}`}>
                          {s.title}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </div>
              {!selectedSessionId && (
                <p className="text-[10px] text-red-500 mt-1.5">A session must be selected before check-in.</p>
              )}
            </div>
          </div>

          {/* Stats */}
          {registrations.length > 0 && (
            <div className="grid grid-cols-3 gap-4 mb-6">
              {[
                { label: "Total Registrations", value: registrations.length, color: "#6366f1", bg: "#6366f1" },
                { label: "Checked In", value: checkedInCount, color: "#10b981", bg: "#10b981" },
                { label: "Pending", value: notCheckedInCount, color: "#f59e0b", bg: "#f59e0b" },
              ].map(s => (
                <div key={s.label} className="bg-white border border-[#e5e7eb] rounded-2xl p-5 flex items-center gap-4">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: `${s.bg}15` }}>
                    <div className="w-3 h-3 rounded-full" style={{ background: s.bg }} />
                  </div>
                  <div>
                    <div className="font-black text-2xl text-[#1a1a1a]">{s.value}</div>
                    <div className="text-xs text-[#888]">{s.label}</div>
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-6">

            {/* Manual / camera check-in */}
            <div className="space-y-4">
              <div className="bg-white border border-[#e5e7eb] rounded-2xl p-6">
                <div className="flex items-center justify-between mb-1">
                  <h2 className="font-bold text-sm text-[#1a1a1a] flex items-center gap-2">
                    <QrCode size={16} className="text-[#FF4747]" /> Check-in
                  </h2>
                  <div className="flex bg-[#f5f5f5] rounded-full p-1 border border-[#e5e7eb]">
                    <button
                      type="button"
                      onClick={() => setScanMode("camera")}
                      className={`px-2.5 py-1 text-[10px] font-bold rounded-full transition-all cursor-pointer flex items-center gap-1 ${scanMode === "camera" ? "bg-[#FF4747] text-white" : "text-[#666]"}`}
                    >
                      <Camera size={11} /> Camera
                    </button>
                    <button
                      type="button"
                      onClick={() => setScanMode("manual")}
                      className={`px-2.5 py-1 text-[10px] font-bold rounded-full transition-all cursor-pointer flex items-center gap-1 ${scanMode === "manual" ? "bg-[#FF4747] text-white" : "text-[#666]"}`}
                    >
                      <Keyboard size={11} /> Manual
                    </button>
                  </div>
                </div>
                <p className="text-xs text-[#888] mb-4">
                  {scanMode === "camera"
                    ? "Point the camera at an attendee's QR code — check-in fires automatically on detection."
                    : "Enter a confirmation code or paste QR data, then press Enter or click Check In."}
                </p>

                {scanMode === "camera" && (
                  <div className="mb-3">
                    <QrScanner
                      paused={processing}
                      onDetected={(value) => resolveAndCheckIn(value)}
                    />
                  </div>
                )}

                <div className="space-y-3">
                  <input
                    ref={inputRef}
                    autoFocus={scanMode === "manual"}
                    value={manualCode}
                    onChange={e => setManualCode(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Confirmation code or scan QR..."
                    className={inp + " font-mono"}
                  />
                  <button
                    type="button"
                    onClick={() => resolveAndCheckIn(manualCode)}
                    disabled={processing || !manualCode.trim() || !selectedEventId || !selectedSessionId}
                    className="w-full py-3 bg-[#FF4747] text-white font-bold rounded-xl hover:bg-[#e03e3e] transition-colors disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2"
                  >
                    {processing
                      ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Checking In...</>
                      : <><Check size={16} /> Check In</>
                    }
                  </button>
                </div>
              </div>

              {/* Result */}
              {result && (
                <div className={`rounded-2xl p-5 border ${result.success ? "bg-green-50 border-green-200" : "bg-red-50 border-red-200"}`}>
                  <div className="flex items-start gap-3">
                    {result.success
                      ? <CheckCircle2 size={22} className="text-green-600 shrink-0 mt-0.5" />
                      : <XCircle size={22} className="text-red-500 shrink-0 mt-0.5" />
                    }
                    <div>
                      <div className={`font-bold text-sm ${result.success ? "text-green-800" : "text-red-700"}`}>
                        {result.success ? "Check-in Successful!" : "Check-in Failed"}
                      </div>
                      <div className={`text-xs mt-1 ${result.success ? "text-green-700" : "text-red-600"}`}>
                        {result.message}
                      </div>
                      {result.registration?.confirmationCode && (
                        <div className="text-xs text-green-600 font-mono mt-1.5 font-semibold">
                          {result.registration.confirmationCode}
                        </div>
                      )}
                    </div>
                    <button type="button" onClick={() => setResult(null)} className="ml-auto text-[#888] hover:text-[#1a1a1a] cursor-pointer">
                      <X size={16} />
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Registrations list */}
            <div className="bg-white border border-[#e5e7eb] rounded-2xl overflow-hidden">
              <div className="p-4 border-b border-[#f0f0f0]">
                <div className="flex items-center gap-2 mb-3">
                  <Users size={14} className="text-[#FF4747]" />
                  <h2 className="font-bold text-sm text-[#1a1a1a]">Attendees</h2>
                  <span className="text-[10px] font-bold bg-[#FF4747]/10 text-[#FF4747] px-1.5 py-0.5 rounded-full">{registrations.length}</span>
                </div>
                <div className="relative">
                  <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#aaa]" />
                  <input
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                    placeholder="Search by confirmation code..."
                    className="w-full bg-[#f5f5f5] border border-[#e5e7eb] rounded-lg pl-8 pr-3 py-2 text-xs text-[#1a1a1a] outline-none focus:border-[#FF4747] transition-colors"
                  />
                </div>
              </div>

              <div className="overflow-y-auto max-h-[480px]">
                {loadingRegs ? (
                  <div className="flex items-center justify-center py-12 text-[#aaa]">
                    <div className="w-6 h-6 border-3 border-[#f0f0f0] border-t-[#FF4747] rounded-full animate-spin" />
                  </div>
                ) : filteredRegs.length === 0 ? (
                  <div className="py-12 text-center text-xs text-[#aaa]">
                    {registrations.length === 0 ? "No registrations for this event yet." : "No results match your search."}
                  </div>
                ) : (
                  filteredRegs.map((r: any) => (
                    <div key={r.registrationId || r.id} className="flex items-center gap-3 px-4 py-3 border-b border-[#f5f5f5] last:border-0 hover:bg-[#fafafa] transition-colors">
                      <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${r.checkedIn ? "bg-green-100" : "bg-[#fafafa] border border-[#e5e7eb]"}`}>
                        {r.checkedIn ? <Check size={13} className="text-green-600" /> : <QrCode size={13} className="text-[#ccc]" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-mono font-semibold text-[#1a1a1a] truncate">{r.confirmationCode || (r.registrationId || r.id)?.substring(0, 12)}</div>
                        {r.checkedIn && <div className="text-[10px] text-green-600">{r.checkedInAt ? new Date(r.checkedInAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "Checked in"}</div>}
                      </div>
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0 ${r.checkedIn ? "bg-green-100 text-green-700" : "bg-[#f5f5f5] text-[#888]"}`}>
                        {r.checkedIn ? "In" : r.status || "Reg."}
                      </span>
                      {!r.checkedIn && (
                        <button
                          type="button"
                          onClick={() => doCheckIn(r.registrationId || r.id)}
                          disabled={processing || !selectedSessionId}
                          className="shrink-0 flex items-center gap-1 px-2.5 py-1 text-[10px] font-bold bg-green-500 text-white rounded-lg hover:bg-green-600 transition-colors cursor-pointer disabled:opacity-50"
                        >
                          <Check size={10} /> In
                        </button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
