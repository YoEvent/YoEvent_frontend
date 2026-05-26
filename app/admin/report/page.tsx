"use client";
import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { BarChart, History, MessageSquare, ShieldAlert } from "lucide-react";
import { api, getStoredAuth } from "@/app/utils/api";
import { eventService } from "@/app/utils/services/eventService";

export default function ReportPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);

  const fetchReportData = async () => {
    const auth = getStoredAuth();
    if (!auth) return;
    try {
      const evs = await eventService.getEventsByTenant(auth.tenantId);
      setEvents(evs || []);
      if (evs && evs.length > 0 && !selectedEventId) {
        setSelectedEventId(evs[0].eventId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchReportDetails = async (eventId: string) => {
    if (!eventId) return;
    try {
      const [analyticsList, logsList, feedbacksList] = await Promise.all([
        api.get<any[]>("/api/v1/eventanalyticss"),
        api.get<any[]>("/api/v1/auditlogs"),
        api.get<any[]>("/api/v1/feedbacks"),
      ]);

      setAnalytics((analyticsList || []).filter((a) => a.eventId === eventId));
      setAuditLogs(logsList || []); // Audit logs are tenant/global-scoped
      setFeedbacks((feedbacksList || []).filter((f) => f.eventId === eventId));
    } catch (err) {
      console.error("Failed to load report metrics:", err);
    }
  };

  useEffect(() => {
    fetchReportData();
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      fetchReportDetails(selectedEventId);
    }
  }, [selectedEventId]);

  // Aggregate values
  const totalRegs = analytics.reduce((sum, item) => sum + (item.totalRegistrations || 0), 0);
  const totalCheckins = analytics.reduce((sum, item) => sum + (item.totalCheckIns || 0), 0);
  const totalRev = analytics.reduce((sum, item) => sum + (item.totalRevenue || 0), 0);
  const totalViews = analytics.reduce((sum, item) => sum + (item.pageViews || 0), 0);

  const activeEvent = events.find((e) => e.eventId === selectedEventId || e.id === selectedEventId);

  return (
    <div className="flex bg-[#111] min-h-screen text-[#e0e0e0]">
      <Sidebar />
      <div className="ml-[220px] flex-1 flex flex-col">
        {/* HEADER */}
        <header className="h-[60px] bg-[#161616] border-b border-[#222] flex items-center justify-between px-8 sticky top-0 z-40">
          <h1 className="font-display text-xl font-bold text-white">Event Performance Reports</h1>
          <div className="flex items-center gap-3">
            <label className="text-xs text-[#666] uppercase tracking-wider font-semibold">Active Event</label>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="bg-[#222] border border-[#333] rounded-lg px-3 py-1.5 text-sm text-[#ddd] outline-none"
            >
              {events.map((ev) => (
                <option key={ev.eventId} value={ev.eventId}>
                  {ev.title}
                </option>
              ))}
            </select>
          </div>
        </header>

        <main className="p-8 space-y-8">
          {/* STATS */}
          <div className="grid grid-cols-4 gap-5">
            {[
              { label: "Total Registrations", value: totalRegs, subtitle: "Ticket holders", color: "text-[#d4c9a8]" },
              { label: "Total Check-ins", value: totalCheckins, subtitle: "People attended", color: "text-blue-400" },
              { label: "Total Revenue", value: `$${totalRev}`, subtitle: "Gross payout", color: "text-green-400" },
              { label: "Total Page Views", value: totalViews, subtitle: "Landing page visits", color: "text-purple-400" },
            ].map((stat, i) => (
              <div key={i} className="bg-gradient-to-br from-[#1e1e1e] to-[#252525] border border-[#2a2a2a] rounded-2xl p-6">
                <div className="text-[10px] text-[#555] uppercase tracking-wider mb-2 font-bold">{stat.label}</div>
                <div className={`font-display text-3xl font-bold mb-1 ${stat.color}`}>{stat.value}</div>
                <div className="text-xs text-[#666]">{stat.subtitle}</div>
              </div>
            ))}
          </div>

          {/* AUDIT LOGS & FEEDBACK */}
          <div className="grid grid-cols-[2fr_1.2fr] gap-8">
            {/* AUDIT LOGS */}
            <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl p-6">
              <h2 className="font-display font-bold text-white mb-5 flex items-center gap-2">
                <History size={18} className="text-[#d4c9a8]" /> Immutable Compliance Logs
              </h2>
              <div className="overflow-x-auto max-h-[400px]">
                <table className="w-full text-left text-xs text-[#ddd]">
                  <thead className="bg-[#161616] text-[10px] text-[#555] uppercase tracking-wider sticky top-0 z-10">
                    <tr>
                      <th className="p-4 rounded-l-xl">Action</th>
                      <th className="p-4">Resource</th>
                      <th className="p-4 rounded-r-xl">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#222]">
                    {auditLogs.slice(0, 10).map((log) => (
                      <tr key={log.logId} className="hover:bg-[#252525] transition-colors">
                        <td className="p-4 font-medium text-white flex items-center gap-2">
                          <ShieldAlert size={12} className="text-orange-400" />
                          {log.action}
                        </td>
                        <td className="p-4 text-[#888] font-mono text-[10px]">{log.entityType}</td>
                        <td className="p-4 text-[#888]">{new Date(log.timestamp).toLocaleString()}</td>
                      </tr>
                    ))}
                    {auditLogs.length === 0 && (
                      <tr>
                        <td colSpan={3} className="p-8 text-center text-[#555]">
                          No compliance actions recorded.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            {/* ATTENDEE FEEDBACK */}
            <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl p-6 flex flex-col">
              <h2 className="font-display font-bold text-white mb-5 flex items-center gap-2">
                <MessageSquare size={18} className="text-[#d4c9a8]" /> Attendee Feedback <span className="text-xs font-normal text-[#666] ml-2 mt-1">(for {activeEvent?.title || "selected event"})</span>
              </h2>
              <div className="flex-1 space-y-4 overflow-y-auto max-h-[400px] pr-2">
                {feedbacks.map((f) => (
                  <div key={f.feedbackId} className="p-4 bg-[#161616] border border-[#2a2a2a] rounded-xl space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-[#555] font-mono">User ID: {f.userId.substring(0, 8)}...</span>
                      <div className="flex items-center gap-1 text-amber-400 text-xs">
                        {"★".repeat(f.rating)}
                        {"☆".repeat(5 - f.rating)}
                      </div>
                    </div>
                    <p className="text-xs text-[#ccc] italic leading-relaxed">&ldquo;{f.comment}&rdquo;</p>
                  </div>
                ))}
                {feedbacks.length === 0 && (
                  <div className="text-center text-xs text-[#555] py-8 flex-1 flex items-center justify-center">
                    No attendee comments received yet.
                  </div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
