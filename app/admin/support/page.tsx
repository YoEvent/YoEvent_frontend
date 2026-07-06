"use client";
import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { Send, ChevronDown, Mail, Star } from "lucide-react";
import { getStoredAuth } from "@/app/utils/api";
import { eventService } from "@/app/utils/services/eventService";

export default function SupportPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [campaigns, setCampaigns] = useState<any[]>([]);
  const [campaignForm, setCampaignForm] = useState({ subject: "", targetAudience: "All Attendees", body: "" });
  const [toast, setToast] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    const fetchEvents = async () => {
      const auth = getStoredAuth();
      if (!auth) return;
      try {
        const evs = await eventService.getMyEvents();
        setEvents(evs || []);
        if (evs && evs.length > 0) {
          setSelectedEventId(evs[0].eventId);
        }
      } catch (err) {
        console.error(err);
      }
    };
    fetchEvents();
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      fetchEventEngagement(selectedEventId);
    }
  }, [selectedEventId]);

  const fetchEventEngagement = async (eventId: string) => {
    if (!eventId) return;
    try {
      const campaignsList = await eventService.getEmailCampaigns();
      setCampaigns((campaignsList || []).filter((c) => c.eventId === eventId));
    } catch (err) {
      console.error("Failed to load engagement context:", err);
    }
  };

  const handleLaunchCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    const auth = getStoredAuth();
    if (!selectedEventId || !auth || !campaignForm.subject) return;
    setSaving(true);
    try {
      await eventService.createEmailCampaign({
        tenantId: auth.tenantId,
        eventId: selectedEventId,
        subject: campaignForm.subject,
        body: campaignForm.body,
        targetAudience: campaignForm.targetAudience,
        scheduledAt: new Date().toISOString(),
        status: "SENT",
      });
      setCampaignForm({ subject: "", targetAudience: "All Attendees", body: "" });
      await fetchEventEngagement(selectedEventId);
      showToast("Email Campaign launched successfully!");
    } catch (err) {
      console.error("Failed to post campaign:", err);
      showToast("Failed to launch campaign.");
    } finally {
      setSaving(false);
    }
  };

  const activeEvent = events.find((e) => e.eventId === selectedEventId || e.id === selectedEventId);

  return (
    <div className="flex bg-[#f9fafb] min-h-screen text-[#374151]">
      <Sidebar />
      <div className="ml-[220px] flex-1 flex flex-col">
        {/* TOAST */}
        {toast && (
          <div className="fixed top-5 right-5 z-50 bg-[#1a1a1a] text-white text-xs font-semibold px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2">
            <Star size={12} className="text-[#FF4747]" />
            {toast}
          </div>
        )}

        {/* HEADER */}
        <header className="h-[60px] bg-white border-b border-[#e5e7eb] flex items-center justify-between px-8 sticky top-0 z-40">
          <h1 className="font-display text-xl font-bold text-[#EB4203]">Support & Broadcasting</h1>
          {events.length > 0 && (
            <div className="relative">
              <select
                value={selectedEventId}
                onChange={(e) => setSelectedEventId(e.target.value)}
                className="appearance-none bg-white border border-[#e5e7eb] text-[#1a1a1a] text-sm rounded-lg px-4 py-1.5 pr-8 outline-none cursor-pointer"
              >
                {events.map((ev) => (
                  <option key={ev.eventId} value={ev.eventId}>
                    {ev.title}
                  </option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#555] pointer-events-none" />
            </div>
          )}
        </header>

        <main className="p-8 max-w-[1200px] space-y-6">
          {/* EMAIL CAMPAIGNS */}
          <div className="bg-white border border-[#e5e7eb] rounded-2xl p-6">
            <h2 className="font-display font-bold text-[#EB4203] mb-5 flex items-center gap-2">
              <Mail size={18} className="text-[#EB4203]" /> Scheduled Email Campaigns <span className="text-xs font-normal text-[#666] ml-2 mt-1">(for {activeEvent?.title || "selected event"})</span>
            </h2>
            <div className="grid md:grid-cols-[1fr_1.5fr] gap-8">
              <form onSubmit={handleLaunchCampaign} className="space-y-4">
                <div>
                  <label className="block text-[10px] font-semibold text-[#888] uppercase tracking-wider mb-1.5">Email Subject</label>
                  <input
                    placeholder="e.g. Welcome to the conference!"
                    value={campaignForm.subject}
                    onChange={(e) => setCampaignForm({ ...campaignForm, subject: e.target.value })}
                    className="w-full bg-[#ffffff] border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-xs text-[#1a1a1a] placeholder:text-[#aaa] outline-none focus:border-[#FF4747] transition-colors"
                    required
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-[#888] uppercase tracking-wider mb-1.5">Target Audience</label>
                  <select
                    value={campaignForm.targetAudience}
                    onChange={(e) => setCampaignForm({ ...campaignForm, targetAudience: e.target.value })}
                    className="w-full bg-[#ffffff] border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-xs text-[#1a1a1a] outline-none cursor-pointer"
                  >
                    <option value="All Attendees">All Attendees</option>
                    <option value="Sponsors Only">Sponsors Only</option>
                    <option value="Exhibitors Only">Exhibitors Only</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-[#888] uppercase tracking-wider mb-1.5">Body Message</label>
                  <textarea
                    placeholder="Write campaign body content..."
                    value={campaignForm.body}
                    onChange={(e) => setCampaignForm({ ...campaignForm, body: e.target.value })}
                    rows={6}
                    className="w-full bg-[#ffffff] border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-xs text-[#1a1a1a] placeholder:text-[#aaa] outline-none resize-none focus:border-[#FF4747] transition-colors"
                    required
                  />
                </div>
                <button
                  type="submit"
                  disabled={saving}
                  className="w-full py-2.5 bg-[#EB4203] hover:bg-[#c23b02] text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Send size={14} /> {saving ? "Sending Campaign..." : "Send Email Campaign"}
                </button>
              </form>

              <div className="space-y-4 max-h-[450px] overflow-y-auto pr-2">
                <h3 className="text-xs font-bold text-[#1a1a1a] uppercase tracking-wider text-[#666] mb-3">Broadcast History</h3>
                {campaigns.map((c) => (
                  <div key={c.campaignId || c.id} className="p-4 bg-white border border-[#e5e7eb] rounded-xl flex justify-between items-start hover:border-[#FF4747]/20 transition-all">
                    <div className="space-y-1.5 max-w-[70%]">
                      <div className="text-xs font-bold text-[#1a1a1a]">{c.subject}</div>
                      <p className="text-[10px] text-[#555] leading-relaxed line-clamp-2 italic">
                        &ldquo;{c.body}&rdquo;
                      </p>
                      <div className="text-[8px] text-[#888] font-mono">
                        Sent on {new Date(c.scheduledAt).toLocaleString()}
                      </div>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-green-50 text-green-700 border border-green-100 uppercase tracking-wider shrink-0">
                      {c.status}
                    </span>
                  </div>
                ))}
                {campaigns.length === 0 && (
                  <div className="text-center text-xs text-[#888] py-16 h-full flex flex-col items-center justify-center border border-dashed border-[#e5e7eb] rounded-2xl">
                    No marketing campaigns scheduled yet.
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
