"use client";
import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { Plus, HelpCircle, Megaphone, Send, ThumbsUp } from "lucide-react";
import { getStoredAuth } from "@/app/utils/api";
import { eventService } from "@/app/utils/services/eventService";

export default function SupportPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [questions, setQuestions] = useState<any[]>([]);
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [campaigns, setCampaigns] = useState<any[]>([]);

  // Form states
  const [announcementForm, setAnnouncementForm] = useState({ title: "", content: "" });
  const [campaignForm, setCampaignForm] = useState({ subject: "", targetAudience: "All Attendees", body: "" });
  const [answerForm, setAnswerForm] = useState<Record<string, string>>({});

  const fetchSupportData = async () => {
    const auth = getStoredAuth();
    if (!auth) return;
    try {
      const evs = await eventService.getMyEvents();
      setEvents(evs || []);
      if (evs && evs.length > 0 && !selectedEventId) {
        setSelectedEventId(evs[0].eventId);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchEventEngagement = async (eventId: string) => {
    if (!eventId) return;
    try {
      // 1. Fetch sessions
      const sessionsList = await eventService.getSessions();
      const eventSessions = (sessionsList || []).filter((s) => s.eventId === eventId);
      setSessions(eventSessions);
      if (eventSessions.length > 0 && !selectedSessionId) {
        setSelectedSessionId(eventSessions[0].sessionId);
      }

      // 2. Fetch announcements & campaigns
      const [announcementsList, campaignsList] = await Promise.all([
        eventService.getAnnouncements(),
        eventService.getEmailCampaigns(),
      ]);

      setAnnouncements((announcementsList || []).filter((a) => a.eventId === eventId));
      setCampaigns((campaignsList || []).filter((c) => c.eventId === eventId));
    } catch (err) {
      console.error("Failed to load engagement context:", err);
    }
  };

  const fetchSessionQA = async (sessionId: string) => {
    if (!sessionId) return;
    try {
      const questionsList = await eventService.getQaQuestions();
      setQuestions((questionsList || []).filter((q) => q.sessionId === sessionId));
    } catch (err) {
      console.error("Failed to load Q&A:", err);
    }
  };

  useEffect(() => {
    fetchSupportData();
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      fetchEventEngagement(selectedEventId);
    }
  }, [selectedEventId]);

  useEffect(() => {
    if (selectedSessionId) {
      fetchSessionQA(selectedSessionId);
    } else {
      setQuestions([]);
    }
  }, [selectedSessionId]);

  const handlePostAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    const auth = getStoredAuth();
    if (!selectedEventId || !auth || !announcementForm.title) return;
    try {
      await eventService.createAnnouncement({
        eventId: selectedEventId,
        authorId: auth.userId,
        title: announcementForm.title,
        content: announcementForm.content,
        publishedAt: new Date().toISOString(),
        isPinned: true,
      });
      setAnnouncementForm({ title: "", content: "" });
      fetchEventEngagement(selectedEventId);
    } catch (err) {
      console.error("Failed to post announcement:", err);
    }
  };

  const handleLaunchCampaign = async (e: React.FormEvent) => {
    e.preventDefault();
    const auth = getStoredAuth();
    if (!selectedEventId || !auth || !campaignForm.subject) return;
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
      fetchEventEngagement(selectedEventId);
    } catch (err) {
      console.error("Failed to post campaign:", err);
    }
  };

  const handleAnswerQuestion = async (questionId: string) => {
    const text = answerForm[questionId];
    if (!text || !text.trim()) return;
    try {
      const q = questions.find((item) => item.questionId === questionId);
      if (!q) return;

      await eventService.updateQaQuestion(questionId, {
        ...q,
        isAnswered: true,
        answerText: text,
      });

      setAnswerForm((prev) => {
        const copy = { ...prev };
        delete copy[questionId];
        return copy;
      });

      if (selectedSessionId) fetchSessionQA(selectedSessionId);
    } catch (err) {
      console.error("Failed to answer question:", err);
    }
  };

  const handleUpvoteQuestion = async (questionId: string) => {
    try {
      const q = questions.find((item) => item.questionId === questionId);
      if (!q) return;

      await eventService.updateQaQuestion(questionId, {
        ...q,
        upvotes: (q.upvotes || 0) + 1,
      });

      if (selectedSessionId) fetchSessionQA(selectedSessionId);
    } catch (err) {
      console.error("Failed to upvote question:", err);
    }
  };

  const activeEvent = events.find((e) => e.eventId === selectedEventId || e.id === selectedEventId);
  const activeSession = sessions.find((s) => s.sessionId === selectedSessionId || s.id === selectedSessionId);

  return (
    <div className="flex bg-[#f9fafb] min-h-screen text-[#374151]">
      <Sidebar />
      <div className="ml-[220px] flex-1 flex flex-col">
        {/* HEADER */}
        <header className="h-[60px] bg-white border-b border-[#e5e7eb] flex items-center justify-between px-8 sticky top-0 z-40">
          <h1 className="font-display text-xl font-bold text-[#EB4203]">Engagement & Broadcasting</h1>
          <div className="flex items-center gap-3">
            <label className="text-xs text-[#666] uppercase tracking-wider font-semibold">Active Event</label>
            <select
              value={selectedEventId}
              onChange={(e) => setSelectedEventId(e.target.value)}
              className="bg-white border border-[#e5e7eb] rounded-lg px-3 py-1.5 text-sm text-[#1a1a1a] outline-none"
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
          {/* Q&A & ANNOUNCEMENTS */}
          <div className="grid grid-cols-[2fr_1.2fr] gap-8">
            {/* Q&A MODERATION */}
            <div className="bg-white border border-[#e5e7eb] rounded-2xl p-6">
              <div className="flex justify-between items-center mb-5">
                <h2 className="font-display font-bold text-[#EB4203] flex items-center gap-2">
                  <HelpCircle size={18} className="text-[#EB4203]" /> Live Session Q&A {activeSession && <span className="text-xs font-normal text-[#666] ml-2 mt-1">(for {activeSession.title})</span>}
                </h2>
                <select
                  value={selectedSessionId}
                  onChange={(e) => setSelectedSessionId(e.target.value)}
                  className="bg-white border border-[#e5e7eb] rounded-lg px-3 py-1.5 text-xs text-[#1a1a1a] outline-none"
                >
                  <option value="">Select Session...</option>
                  {sessions.map((s) => (
                    <option key={s.sessionId} value={s.sessionId}>
                      {s.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* LIST */}
              <div className="space-y-4">
                {questions.map((q) => (
                  <div key={q.questionId} className="p-4 bg-white border border-[#e5e7eb] rounded-xl space-y-3">
                    <div className="flex justify-between items-start">
                      <div className="text-xs text-white leading-relaxed font-medium">
                        &ldquo;{q.questionText}&rdquo;
                      </div>
                      <button
                        onClick={() => handleUpvoteQuestion(q.questionId)}
                        className="flex items-center gap-1 text-[10px] text-blue-400 hover:text-blue-300 font-bold bg-blue-900/10 rounded-lg px-2 py-1 cursor-pointer"
                      >
                        <ThumbsUp size={12} /> {q.upvotes || 0}
                      </button>
                    </div>

                    {q.isAnswered ? (
                      <div className="p-3 bg-green-950/20 border border-green-800/30 rounded-lg text-xs text-green-300">
                        <strong className="block text-[9px] uppercase tracking-wider text-green-500 font-bold mb-1">
                          Answered
                        </strong>
                        {q.answerText}
                      </div>
                    ) : (
                      <div className="flex gap-2">
                        <input
                          placeholder="Type answer..."
                          value={answerForm[q.questionId] || ""}
                          onChange={(e) => setAnswerForm({ ...answerForm, [q.questionId]: e.target.value })}
                          className="flex-1 bg-[#ffffff] border border-[#e5e7eb] rounded-lg px-3 py-1.5 text-xs text-white placeholder:text-[#555] outline-none"
                        />
                        <button
                          onClick={() => handleAnswerQuestion(q.questionId)}
                          className="bg-green-700 hover:bg-green-600 text-white rounded-lg px-3 text-xs font-semibold cursor-pointer"
                        >
                          Submit
                        </button>
                      </div>
                    )}
                  </div>
                ))}
                {questions.length === 0 && (
                  <div className="text-center text-xs text-[#555] py-8">
                    No questions posted yet for this session.
                  </div>
                )}
              </div>
            </div>

            {/* ANNOUNCEMENTS */}
            <div className="bg-white border border-[#e5e7eb] rounded-2xl p-6 flex flex-col">
              <h2 className="font-display font-bold text-[#EB4203] mb-5 flex items-center gap-2">
                <Megaphone size={18} className="text-[#EB4203]" /> Announcements <span className="text-xs font-normal text-[#666] ml-2 mt-1">(for {activeEvent?.title || "selected event"})</span>
              </h2>
              <form onSubmit={handlePostAnnouncement} className="space-y-4 mb-6">
                <input
                  placeholder="Announcement Title"
                  value={announcementForm.title}
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, title: e.target.value })}
                  className="w-full bg-[#ffffff] border border-[#e5e7eb] rounded-xl px-4 py-2 text-xs text-white placeholder:text-[#555] outline-none"
                  required
                />
                <textarea
                  placeholder="Content..."
                  value={announcementForm.content}
                  onChange={(e) => setAnnouncementForm({ ...announcementForm, content: e.target.value })}
                  rows={2}
                  className="w-full bg-[#ffffff] border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-[#555] outline-none resize-none"
                  required
                />
                <button
                  type="submit"
                  className="w-full py-2 bg-[#EB4203] hover:bg-[#c23b02] text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Megaphone size={14} /> Broadcast Announcement
                </button>
              </form>

              <div className="flex-1 space-y-4 overflow-y-auto max-h-[300px]">
                {announcements.map((a) => (
                  <div key={a.announcementId} className="p-3.5 bg-white border border-[#e5e7eb] rounded-xl">
                    <div className="text-xs font-bold text-[#1a1a1a]">{a.title}</div>
                    <div className="text-[10px] text-[#555] leading-relaxed mt-1">{a.content}</div>
                    <div className="text-[8px] text-[#555] mt-2 font-mono">
                      {new Date(a.publishedAt).toLocaleString()}
                    </div>
                  </div>
                ))}
                {announcements.length === 0 && (
                  <div className="text-center text-xs text-[#555] py-8">No announcements broadcasted yet.</div>
                )}
              </div>
            </div>
          </div>

          {/* EMAIL CAMPAIGNS */}
          <div className="bg-white border border-[#e5e7eb] rounded-2xl p-6">
            <h2 className="font-display font-bold text-[#EB4203] mb-5 flex items-center gap-2">
              <Send size={18} className="text-[#EB4203]" /> Scheduled Email Campaigns <span className="text-xs font-normal text-[#666] ml-2 mt-1">(for {activeEvent?.title || "selected event"})</span>
            </h2>
            <div className="grid grid-cols-[1fr_2fr] gap-8">
              <form onSubmit={handleLaunchCampaign} className="space-y-4">
                <input
                  placeholder="Email Subject"
                  value={campaignForm.subject}
                  onChange={(e) => setCampaignForm({ ...campaignForm, subject: e.target.value })}
                  className="w-full bg-[#ffffff] border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-[#555] outline-none"
                  required
                />
                <select
                  value={campaignForm.targetAudience}
                  onChange={(e) => setCampaignForm({ ...campaignForm, targetAudience: e.target.value })}
                  className="w-full bg-[#ffffff] border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-xs text-white outline-none"
                >
                  <option value="All Attendees">All Attendees</option>
                  <option value="Sponsors Only">Sponsors Only</option>
                  <option value="Exhibitors Only">Exhibitors Only</option>
                </select>
                <textarea
                  placeholder="Write campaign body content..."
                  value={campaignForm.body}
                  onChange={(e) => setCampaignForm({ ...campaignForm, body: e.target.value })}
                  rows={4}
                  className="w-full bg-[#ffffff] border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-[#555] outline-none resize-none"
                  required
                />
                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#EB4203] hover:bg-[#c23b02] text-white text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Send size={14} /> Send Email Campaign
                </button>
              </form>

              <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
                {campaigns.map((c) => (
                  <div key={c.campaignId} className="p-4 bg-white border border-[#e5e7eb] rounded-xl flex justify-between items-start">
                    <div className="space-y-1.5 max-w-[70%]">
                      <div className="text-xs font-bold text-[#1a1a1a]">{c.subject}</div>
                      <p className="text-[10px] text-[#1a1a1a] leading-relaxed line-clamp-2 italic">
                        &ldquo;{c.body}&rdquo;
                      </p>
                      <div className="text-[8px] text-[#555] font-mono">
                        Sent on {new Date(c.scheduledAt).toLocaleString()}
                      </div>
                    </div>
                    <span className="px-2.5 py-0.5 rounded-full text-[9px] font-bold bg-green-50 text-green-700 border border-green-100">
                      {c.status}
                    </span>
                  </div>
                ))}
                {campaigns.length === 0 && (
                  <div className="text-center text-xs text-[#555] py-8 h-full flex items-center justify-center">
                    No marketing campaigns scheduled.
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
