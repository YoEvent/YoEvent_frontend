"use client";
import { useState, useEffect, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import { History, MessageSquare, ShieldAlert, TrendingDown, Radio, Plus, Trash2, Pencil, Save, Star, X, HelpCircle, ThumbsUp, Globe, CheckCircle, BarChart2, ChevronDown, Megaphone } from "lucide-react";
import { api, getStoredAuth } from "@/app/utils/api";
import { eventService } from "@/app/utils/services/eventService";

type SubTab = "performance" | "polls" | "qa" | "feedbacks" | "announcements";

const inp = "w-full bg-white border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-sm text-[#1a1a1a] placeholder:text-[#aaa] outline-none focus:border-[#FF4747] transition-colors";
const label = "block text-[10px] font-semibold text-[#888] uppercase tracking-wider mb-1.5";
const saveBtn = "flex items-center gap-2 px-5 py-2.5 bg-[#FF4747] text-white text-xs font-bold rounded-xl hover:bg-[#e03e3e] transition-colors cursor-pointer disabled:opacity-50";

const typeColors: Record<string, string> = {
  GENERAL: "bg-blue-50 text-blue-700 border-blue-100",
  URGENT: "bg-red-50 text-red-700 border-red-100",
  SCHEDULE_CHANGE: "bg-orange-50 text-orange-700 border-orange-100",
  REMINDER: "bg-amber-50 text-amber-700 border-amber-100",
  LOGISTICS: "bg-purple-50 text-purple-700 border-purple-100",
};

export default function EngagementsPage() {
  const [tab, setTab] = useState<SubTab>("performance");
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Performance data
  const [analytics, setAnalytics] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [feedbacks, setFeedbacks] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);

  // Polls data
  const [polls, setPolls] = useState<any[]>([]);
  const [editingPoll, setEditingPoll] = useState<any>(null);
  const [pollForm, setPollForm] = useState({ question: "", options: ["", ""] });
  const pollFormRef = useRef<HTMLFormElement>(null);

  // Q&A data
  const [sessions, setSessions] = useState<any[]>([]);
  const [selectedSessionId, setSelectedSessionId] = useState<string>("");
  const [questions, setQuestions] = useState<any[]>([]);
  const [answerForm, setAnswerForm] = useState<Record<string, string>>({});
  const [editingQA, setEditingQA] = useState<any>(null);
  const [qaForm, setQaForm] = useState({ sessionId: "", questionText: "", isAnonymous: false, answerText: "" });
  const qaFormRef = useRef<HTMLFormElement>(null);

  // Announcements data
  const [announcements, setAnnouncements] = useState<any[]>([]);
  const [editingAnnouncement, setEditingAnnouncement] = useState<any>(null);
  const [announcementForm, setAnnouncementForm] = useState({ title: "", content: "", type: "GENERAL" });
  const announcementFormRef = useRef<HTMLFormElement>(null);

  // Computed filtered lists for active session scope
  const filteredPolls = selectedSessionId
    ? polls.filter((p: any) => (p.sessionId || p.session?.id || p.session?.sessionId) === selectedSessionId)
    : polls;

  const filteredAnnouncements = selectedSessionId
    ? announcements.filter((a: any) => (a.sessionId || a.session?.id || a.session?.sessionId) === selectedSessionId)
    : announcements;

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3000);
  };

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
      loadEngagementData(selectedEventId);
    }
  }, [selectedEventId]);

  useEffect(() => {
    if (selectedSessionId) {
      loadSessionQA(selectedSessionId);
      setQaForm(q => ({ ...q, sessionId: selectedSessionId }));
    } else {
      setQuestions([]);
    }
  }, [selectedSessionId]);

  const loadEngagementData = async (eventId: string) => {
    setLoading(true);
    try {
      const [analyticsList, logsList, feedbacksList, ordersList, pollsList, sessionsList, announcementsList] = await Promise.all([
        api.get<any[]>("/api/v1/eventanalyticss").catch(() => []),
        api.get<any[]>("/api/v1/auditlogs").catch(() => []),
        api.get<any[]>("/api/v1/feedbacks").catch(() => []),
        api.get<any[]>("/api/v1/orders").catch(() => []),
        eventService.getPolls().catch(() => []),
        eventService.getSessions().catch(() => []),
        eventService.getAnnouncements().catch(() => []),
      ]);

      const byEvent = (item: any) => item.eventId === eventId || item.event?.eventId === eventId;

      setAnalytics(analyticsList.filter(byEvent));
      setAuditLogs(logsList || []);
      setFeedbacks(feedbacksList.filter(byEvent));
      setOrders(ordersList.filter(byEvent));
      setPolls(pollsList.filter(byEvent));
      setAnnouncements(announcementsList.filter(byEvent));
      
      const eventSessions = sessionsList.filter(byEvent);
      setSessions(eventSessions);
      if (eventSessions.length > 0) {
        setSelectedSessionId(eventSessions[0].sessionId || eventSessions[0].id);
      } else {
        setSelectedSessionId("");
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const loadSessionQA = async (sessionId: string) => {
    try {
      const questionsList = await eventService.getQaQuestions();
      setQuestions((questionsList || []).filter((q) => q.sessionId === sessionId));
    } catch (err) {
      console.error(err);
    }
  };

  // Poll operations
  const savePoll = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId || !pollForm.question.trim()) return;
    setSaving(true);
    const auth = getStoredAuth();
    const payload = {
      eventId: selectedEventId,
      tenantId: auth?.tenantId,
      question: pollForm.question,
      options: JSON.stringify(pollForm.options.filter(Boolean)),
      isActive: true,
      sessionId: selectedSessionId || undefined,
    };
    try {
      if (editingPoll) {
        await eventService.updatePoll(editingPoll.pollId || editingPoll.id, payload);
        setEditingPoll(null);
        showToast("success", "Poll updated!");
      } else {
        await eventService.createPoll(payload);
        showToast("success", "Poll created!");
      }
      setPollForm({ question: "", options: ["", ""] });
      await loadEngagementData(selectedEventId);
    } catch {
      showToast("error", "Failed to save poll.");
    } finally {
      setSaving(false);
    }
  };

  const deletePoll = async (id: string) => {
    if (!confirm("Delete this poll?")) return;
    try {
      await eventService.deletePoll(id);
      if (editingPoll?.pollId === id || editingPoll?.id === id) {
        setEditingPoll(null);
        setPollForm({ question: "", options: ["", ""] });
      }
      await loadEngagementData(selectedEventId);
      showToast("success", "Poll deleted!");
    } catch {
      showToast("error", "Failed to delete poll.");
    }
  };

  // Q&A operations
  const saveQA = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId || !qaForm.sessionId || !qaForm.questionText.trim()) return;
    setSaving(true);
    const auth = getStoredAuth();
    const payload = {
      eventId: selectedEventId,
      sessionId: qaForm.sessionId,
      tenantId: auth?.tenantId,
      questionText: qaForm.questionText,
      isAnonymous: qaForm.isAnonymous,
      answerText: qaForm.answerText || undefined,
      isAnswered: !!qaForm.answerText?.trim(),
      upvotes: editingQA ? editingQA.upvotes : 0,
    };
    try {
      if (editingQA) {
        await eventService.updateQaQuestion(editingQA.questionId || editingQA.id, payload);
        setEditingQA(null);
        showToast("success", "Question updated!");
      } else {
        await eventService.createQaQuestion(payload);
        showToast("success", "Question added!");
      }
      setQaForm({ sessionId: selectedSessionId, questionText: "", isAnonymous: false, answerText: "" });
      if (selectedSessionId) loadSessionQA(selectedSessionId);
    } catch {
      showToast("error", "Failed to save Q&A question.");
    } finally {
      setSaving(false);
    }
  };

  const deleteQA = async (id: string) => {
    if (!confirm("Delete this Q&A question?")) return;
    try {
      await eventService.deleteQaQuestion(id);
      if (editingQA?.questionId === id || editingQA?.id === id) {
        setEditingQA(null);
        setQaForm({ sessionId: selectedSessionId, questionText: "", isAnonymous: false, answerText: "" });
      }
      if (selectedSessionId) loadSessionQA(selectedSessionId);
      showToast("success", "Question deleted!");
    } catch {
      showToast("error", "Failed to delete question.");
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

      if (selectedSessionId) loadSessionQA(selectedSessionId);
      showToast("success", "Answer submitted!");
    } catch {
      showToast("error", "Failed to submit answer.");
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

      if (selectedSessionId) loadSessionQA(selectedSessionId);
    } catch (err) {
      console.error(err);
    }
  };

  // Announcement operations
  const handlePostAnnouncement = async (e: React.FormEvent) => {
    e.preventDefault();
    const auth = getStoredAuth();
    if (!selectedEventId || !auth || !announcementForm.title) return;
    const payload = {
      eventId: selectedEventId,
      authorId: auth.userId,
      tenantId: auth.tenantId,
      title: announcementForm.title,
      content: announcementForm.content,
      type: announcementForm.type,
      publishedAt: new Date().toISOString(),
      isPinned: true,
      sessionId: selectedSessionId || undefined,
    };
    try {
      setSaving(true);
      if (editingAnnouncement) {
        await eventService.updateAnnouncement(editingAnnouncement.announcementId || editingAnnouncement.id, payload);
        setEditingAnnouncement(null);
        showToast("success", "Announcement updated!");
      } else {
        await eventService.createAnnouncement(payload);
        showToast("success", "Announcement posted!");
      }
      setAnnouncementForm({ title: "", content: "", type: "GENERAL" });
      await loadEngagementData(selectedEventId);
    } catch (err) {
      console.error("Failed to post announcement:", err);
      showToast("error", "Failed to save announcement.");
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteAnnouncement = async (id: string) => {
    if (!confirm("Delete this announcement?")) return;
    try {
      await eventService.deleteAnnouncement(id);
      if (editingAnnouncement?.announcementId === id || editingAnnouncement?.id === id) {
        setEditingAnnouncement(null);
        setAnnouncementForm({ title: "", content: "", type: "GENERAL" });
      }
      await loadEngagementData(selectedEventId);
      showToast("success", "Announcement deleted!");
    } catch (err) {
      console.error("Failed to delete announcement:", err);
      showToast("error", "Failed to delete announcement.");
    }
  };

  // Performance computations
  const totalRegs = analytics.reduce((sum, item) => sum + (item.totalRegistrations || 0), 0);
  const totalCheckins = analytics.reduce((sum, item) => sum + (item.totalCheckIns || 0), 0);
  const totalRev = analytics.reduce((sum, item) => sum + (item.totalRevenue || 0), 0);
  const totalViews = analytics.reduce((sum, item) => sum + (item.pageViews || 0), 0);
  const totalPlatformFee = orders.reduce((sum, o) => sum + (parseFloat(o.platformFee) || 0), 0);
  const netPayout = totalRev - totalPlatformFee;

  const activeEvent = events.find((e) => e.eventId === selectedEventId || e.id === selectedEventId);
  const activeSession = sessions.find((s) => s.sessionId === selectedSessionId || s.id === selectedSessionId);

  return (
    <div className="flex bg-[#f9fafb] min-h-screen text-[#374151]">
      <Sidebar />
      <div className="ml-[220px] flex-1 flex flex-col">
        {/* TOAST */}
        {toast && (
          <div className={`fixed top-5 right-5 z-50 px-5 py-3 rounded-2xl shadow-xl text-xs font-semibold text-white ${toast.type === "success" ? "bg-green-700" : "bg-red-700"}`}>{toast.text}</div>
        )}

        {/* HEADER */}
        <header className="h-[60px] bg-white border-b border-[#e5e7eb] flex items-center justify-between px-8 sticky top-0 z-40">
          <h1 className="font-display text-xl font-bold text-[#EB4203]">Engagements & Reports</h1>
          <div className="flex items-center gap-4">
            {events.length > 0 && (
              <div className="relative">
                <select
                  value={selectedEventId}
                  onChange={(e) => {
                    setSelectedEventId(e.target.value);
                    setEditingPoll(null);
                    setPollForm({ question: "", options: ["", ""] });
                    setEditingAnnouncement(null);
                    setAnnouncementForm({ title: "", content: "", type: "GENERAL" });
                    setEditingQA(null);
                    setQaForm({ sessionId: "", questionText: "", isAnonymous: false, answerText: "" });
                  }}
                  className="appearance-none bg-white border border-[#e5e7eb] text-[#1a1a1a] text-sm rounded-lg px-4 py-1.5 pr-8 outline-none cursor-pointer"
                >
                  {events.map((ev) => (
                    <option key={ev.eventId || ev.id} value={ev.eventId || ev.id}>
                      {ev.title}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#555] pointer-events-none" />
              </div>
            )}

            {sessions.length > 0 && (
              <div className="relative">
                <select
                  value={selectedSessionId}
                  onChange={(e) => {
                    const sessId = e.target.value;
                    setSelectedSessionId(sessId);
                    setQaForm(q => ({ ...q, sessionId: sessId }));
                  }}
                  className="appearance-none bg-white border border-[#e5e7eb] text-[#1a1a1a] text-sm rounded-lg px-4 py-1.5 pr-8 outline-none cursor-pointer"
                >
                  {sessions.map((s) => (
                    <option key={s.sessionId || s.id} value={s.sessionId || s.id}>
                      {s.title}
                    </option>
                  ))}
                </select>
                <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#555] pointer-events-none" />
              </div>
            )}
          </div>
        </header>

        <main className="p-8 space-y-6 max-w-[1400px]">
          {/* TABS */}
          <div className="flex gap-1 bg-[#f5f5f5] border border-[#e5e7eb] rounded-xl p-1 w-fit">
            {([
              ["performance", "Performance", BarChart2],
              ["polls", "Live Polls", Radio],
              ["qa", "Live Q&A", HelpCircle],
              ["feedbacks", "Feedbacks", MessageSquare],
              ["announcements", "Announcements", Megaphone],
            ] as const).map(([key, label, Icon]) => (
              <button key={key} onClick={() => setTab(key)}
                className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${tab === key ? "bg-[#FF4747] text-white" : "text-[#666] hover:text-[#1a1a1a]"}`}>
                <Icon size={15} />{label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-[#e5e7eb] border-t-[#EB4203] rounded-full animate-spin" /></div>
          ) : tab === "performance" ? (
            // PERFORMANCE SUBTAB
            <div className="space-y-6">
              <div className="grid grid-cols-4 gap-5">
                {[
                  { label: "Total Registrations", value: totalRegs, subtitle: "Ticket holders", color: "text-[#EB4203]" },
                  { label: "Total Check-ins", value: totalCheckins, subtitle: "People attended", color: "text-blue-600" },
                  { label: "Total Page Views", value: totalViews, subtitle: "Landing page visits", color: "text-purple-600" },
                  { label: "Gross Revenue", value: `${totalRev.toLocaleString()} FCFA`, subtitle: "Before platform fee", color: "text-green-600" },
                ].map((stat, i) => (
                  <div key={i} className="bg-white border border-[#e5e7eb] rounded-2xl p-6 shadow-sm">
                    <div className="text-[10px] text-[#666] uppercase tracking-wider mb-2 font-bold">{stat.label}</div>
                    <div className={`font-display text-2xl font-bold mb-1 ${stat.color}`}>{stat.value}</div>
                    <div className="text-xs text-[#888]">{stat.subtitle}</div>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div className="bg-white border border-[#e5e7eb] rounded-2xl p-6 flex items-center gap-5 shadow-sm">
                  <div className="w-10 h-10 rounded-xl bg-red-50 flex items-center justify-center flex-shrink-0">
                    <TrendingDown size={18} className="text-red-500" />
                  </div>
                  <div>
                    <div className="text-[10px] text-[#666] uppercase tracking-wider mb-1 font-bold">Platform Fee Deducted</div>
                    <div className="font-display text-xl font-bold text-red-500">{totalPlatformFee.toLocaleString()} FCFA</div>
                    <div className="text-xs text-[#888] mt-0.5">Sum of all commission across {orders.length} order(s)</div>
                  </div>
                </div>
                <div className="bg-white border border-[#e5e7eb] rounded-2xl p-6 flex items-center gap-5 shadow-sm">
                  <div className="w-10 h-10 rounded-xl bg-green-50 flex items-center justify-center flex-shrink-0">
                    <span className="text-green-600 font-bold text-sm">$</span>
                  </div>
                  <div>
                    <div className="text-[10px] text-[#666] uppercase tracking-wider mb-1 font-bold">Net Payout</div>
                    <div className="font-display text-xl font-bold text-green-600">{netPayout.toLocaleString()} FCFA</div>
                    <div className="text-xs text-[#888] mt-0.5">Gross revenue minus platform fee</div>
                  </div>
                </div>
              </div>

              {/* AUDIT LOGS */}
              <div className="bg-white border border-[#e5e7eb] rounded-2xl p-6 shadow-sm">
                <h2 className="font-display font-bold text-[#EB4203] mb-5 flex items-center gap-2">
                  <History size={18} className="text-[#EB4203]" /> Immutable Compliance Logs
                </h2>
                <div className="overflow-x-auto max-h-[300px]">
                  <table className="w-full text-left text-xs text-[#1a1a1a]">
                    <tbody className="divide-y divide-[#e5e7eb]">
                      {auditLogs.slice(0, 15).map((log, idx) => (
                        <tr key={`${log.logId || log.id || idx}-${idx}`} className="hover:bg-[#f9fafb] transition-colors">
                          <td className="p-4 font-medium text-[#1a1a1a] flex items-center gap-2">
                            <ShieldAlert size={12} className="text-orange-500" />
                            {log.action}
                          </td>
                          <td className="p-4 text-[#666] font-mono text-[10px]">{log.entityType}</td>
                          <td className="p-4 text-[#666]">{new Date(log.timestamp).toLocaleString()}</td>
                        </tr>
                      ))}
                      {auditLogs.length === 0 && (
                        <tr>
                          <td colSpan={3} className="p-8 text-center text-[#666]">
                            No compliance actions recorded.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          ) : tab === "polls" ? (
            // POLLS SUBTAB
            <div className="grid lg:grid-cols-[1.8fr_1.2fr] gap-8">
              {/* Polls list */}
              <div className="space-y-4">
                <h3 className="font-display font-bold text-[#1a1a1a]">Live Polls</h3>
                {filteredPolls.length === 0 ? (
                  <div className="bg-white border border-[#e5e7eb] rounded-2xl p-10 text-center text-[#aaa]">No polls launched for this session yet.</div>
                ) : filteredPolls.map((p, idx) => {
                  const id = p.pollId || p.id;
                  const opts = typeof p.options === "string" ? JSON.parse(p.options) : (p.options || []);
                  return (
                    <div key={`${id || idx}-${idx}`} className={`bg-white border rounded-2xl p-5 transition-colors ${editingPoll?.pollId === id ? "border-[#FF4747] ring-1 ring-[#FF4747]/20" : "border-[#e5e7eb]"}`}>
                      <div className="flex items-start justify-between gap-2 mb-3">
                        <div className="font-semibold text-sm text-[#1a1a1a]">{p.question}</div>
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => {
                            setEditingPoll(p);
                            setPollForm({ question: p.question || "", options: opts.length >= 2 ? opts : [...opts, ""] });
                            pollFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                          }} className="p-1.5 text-[#555] hover:bg-stone-100 rounded-lg transition-colors cursor-pointer">
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => deletePoll(id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                      <ul className="space-y-1.5">
                        {opts.map((opt: string, i: number) => (
                          <li key={i} className="text-xs text-[#555] flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-[#F7E998] text-[#7a6a00] flex items-center justify-center text-[10px] font-black shrink-0">{i + 1}</span>
                            {opt}
                          </li>
                        ))}
                      </ul>
                      <span className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full mt-3.5 inline-block ${p.isActive ? "bg-green-100 text-green-700" : "bg-[#fafafa] text-[#888]"}`}>{p.isActive ? "ACTIVE" : "INACTIVE"}</span>
                    </div>
                  );
                })}
              </div>

              {/* Poll Create/Edit Form */}
              <div className="bg-white border border-[#e5e7eb] rounded-3xl p-7 h-fit">
                <div className="flex items-center justify-between mb-5">
                  <h4 className="font-bold text-sm text-[#1a1a1a]">{editingPoll ? "Edit Poll" : "Create Poll"}</h4>
                  {editingPoll && (
                    <button type="button" onClick={() => { setEditingPoll(null); setPollForm({ question: "", options: ["", ""] }); }} className="text-xs text-[#888] hover:text-[#1a1a1a] cursor-pointer underline">Cancel edit</button>
                  )}
                </div>
                <form ref={pollFormRef} onSubmit={savePoll} className="space-y-4">
                  <div>
                    <label className={label}>Question *</label>
                    <input required placeholder="e.g. What topic interests you most?" value={pollForm.question} onChange={e => setPollForm(f => ({ ...f, question: e.target.value }))} className={inp} />
                  </div>
                  <div>
                    <label className={label}>Options</label>
                    {pollForm.options.map((opt, i) => (
                      <div key={i} className="flex gap-2 mb-2">
                        <input placeholder={`Option ${i + 1}`} value={opt} onChange={e => { const opts = [...pollForm.options]; opts[i] = e.target.value; setPollForm(f => ({ ...f, options: opts })); }} className={inp} />
                        {pollForm.options.length > 2 && <button type="button" onClick={() => setPollForm(f => ({ ...f, options: f.options.filter((_, j) => j !== i) }))} className="p-2 text-red-400 hover:text-red-600 cursor-pointer"><X size={14} /></button>}
                      </div>
                    ))}
                    {pollForm.options.length < 6 && <button type="button" onClick={() => setPollForm(f => ({ ...f, options: [...f.options, ""] }))} className="text-xs text-[#FF4747] font-semibold cursor-pointer hover:underline">+ Add option</button>}
                  </div>
                  <button type="submit" disabled={saving} className={saveBtn + " w-full justify-center"}>
                    <Save size={13} /> {editingPoll ? (saving ? "Saving..." : "Save Poll") : (saving ? "Launching..." : "Launch Poll")}
                  </button>
                </form>
              </div>
            </div>
          ) : tab === "qa" ? (
            // LIVE Q&A SUBTAB
            <div className="grid lg:grid-cols-[1.8fr_1.2fr] gap-8">
              {/* Questions list */}
              <div className="space-y-4">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-display font-bold text-[#1a1a1a]">Moderation Q&A {activeSession && <span className="text-xs font-normal text-[#666] ml-2">(for {activeSession.title})</span>}</h3>
                </div>

                <div className="space-y-3">
                  {questions.map((q, idx) => {
                    const id = q.questionId || q.id;
                    return (
                      <div key={`${id || idx}-${idx}`} className={`p-4 bg-white border rounded-xl space-y-3 transition-colors ${editingQA?.questionId === id ? "border-[#FF4747] ring-1 ring-[#FF4747]/20" : "border-[#e5e7eb]"}`}>
                        <div className="flex justify-between items-start">
                          <div className="text-xs text-[#1a1a1a] leading-relaxed font-medium">
                            &ldquo;{q.questionText}&rdquo;
                          </div>
                          <div className="flex gap-2 items-center">
                            <button
                              onClick={() => handleUpvoteQuestion(id)}
                              className="flex items-center gap-1 text-[10px] text-blue-600 hover:text-blue-500 font-bold bg-blue-50 rounded-lg px-2.5 py-1 cursor-pointer border border-blue-100"
                            >
                              <ThumbsUp size={11} /> {q.upvotes || 0}
                            </button>
                            <button onClick={() => {
                              setEditingQA(q);
                              setQaForm({
                                sessionId: q.sessionId || selectedSessionId,
                                questionText: q.questionText || "",
                                isAnonymous: q.isAnonymous || false,
                                answerText: q.answerText || "",
                              });
                              qaFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                            }} className="p-1 text-[#555] hover:bg-stone-100 rounded-md transition-colors cursor-pointer">
                              <Pencil size={12} />
                            </button>
                            <button onClick={() => deleteQA(id)} className="p-1 text-red-500 hover:bg-red-50 rounded-md transition-colors cursor-pointer">
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>

                        {q.isAnswered ? (
                          <div className="p-3 bg-green-50 border border-green-100 rounded-lg text-xs text-green-700">
                            <strong className="block text-[9px] uppercase tracking-wider text-green-600 font-bold mb-1">
                              Answered
                            </strong>
                            {q.answerText}
                          </div>
                        ) : (
                          <div className="flex gap-2">
                            <input
                              placeholder="Type answer..."
                              value={answerForm[id] || ""}
                              onChange={(e) => setAnswerForm({ ...answerForm, [id]: e.target.value })}
                              className="flex-1 bg-[#ffffff] border border-[#e5e7eb] rounded-lg px-3 py-1.5 text-xs text-[#1a1a1a] placeholder:text-[#aaa] outline-none"
                            />
                            <button
                              onClick={() => handleAnswerQuestion(id)}
                              className="bg-green-700 hover:bg-green-600 text-white rounded-lg px-4 text-xs font-semibold cursor-pointer shrink-0"
                            >
                              Submit
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })}
                  {questions.length === 0 && (
                    <div className="text-center text-xs text-[#555] py-8 border border-dashed border-[#e5e7eb] rounded-xl bg-white">
                      No questions posted yet for this session.
                    </div>
                  )}
                </div>
              </div>

              {/* QA Create/Edit Form */}
              <div className="bg-white border border-[#e5e7eb] rounded-3xl p-7 h-fit">
                <div className="flex items-center justify-between mb-5">
                  <h4 className="font-bold text-sm text-[#1a1a1a]">{editingQA ? "Edit Q&A Question" : "Add Q&A Question"}</h4>
                  {editingQA && (
                    <button type="button" onClick={() => { setEditingQA(null); setQaForm({ sessionId: selectedSessionId, questionText: "", isAnonymous: false, answerText: "" }); }} className="text-xs text-[#888] hover:text-[#1a1a1a] cursor-pointer underline">Cancel edit</button>
                  )}
                </div>
                {sessions.length === 0 ? (
                  <div className="text-xs text-[#888] bg-[#fafafa] border border-[#f0f0f0] rounded-xl p-4">
                    Add at least one session first — Q&A questions are linked to sessions.
                  </div>
                ) : (
                  <form ref={qaFormRef} onSubmit={saveQA} className="space-y-4">
                    <div>
                      <label className={label}>Session *</label>
                      <select value={qaForm.sessionId} onChange={e => setQaForm(f => ({ ...f, sessionId: e.target.value }))} className={inp} required>
                        <option value="">— Select session —</option>
                        {sessions.map(s => <option key={`${s.sessionId || s.id}`} value={s.sessionId || s.id}>{s.title}</option>)}
                      </select>
                    </div>
                    <div>
                      <label className={label}>Question *</label>
                      <textarea required placeholder="Enter a question for attendees..." value={qaForm.questionText} onChange={e => setQaForm(f => ({ ...f, questionText: e.target.value }))} rows={3} className={inp + " resize-none"} />
                    </div>
                    <div>
                      <label className={label}>Answer (Optional)</label>
                      <textarea placeholder="Answer text..." value={qaForm.answerText} onChange={e => setQaForm(f => ({ ...f, answerText: e.target.value }))} rows={2} className={inp + " resize-none"} />
                    </div>
                    <label className="flex items-center gap-2 cursor-pointer text-xs text-[#555] font-semibold">
                      <input type="checkbox" checked={qaForm.isAnonymous} onChange={e => setQaForm(f => ({ ...f, isAnonymous: e.target.checked }))} className="rounded border-[#e5e7eb]" />
                      Post anonymously
                    </label>
                    <button type="submit" disabled={saving} className={saveBtn + " w-full justify-center"}>
                      <Save size={13} /> {editingQA ? (saving ? "Saving..." : "Save Question") : (saving ? "Adding..." : "Add Question")}
                    </button>
                  </form>
                )}
              </div>
            </div>
          ) : tab === "feedbacks" ? (
            // FEEDBACKS SUBTAB
            <div className="bg-white border border-[#e5e7eb] rounded-2xl p-6">
              <h2 className="font-display font-bold text-[#EB4203] mb-5 flex items-center gap-2">
                <MessageSquare size={18} className="text-[#EB4203]" /> Attendee Feedback <span className="text-xs font-normal text-[#666] ml-2 mt-1">(for {activeEvent?.title || "selected event"})</span>
              </h2>
              <div className="space-y-4">
                {feedbacks.map((f, idx) => (
                  <div key={`${f.feedbackId || f.id || idx}-${idx}`} className="p-4 bg-white border border-[#e5e7eb] rounded-xl space-y-2">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] text-[#888] font-mono">User ID: {(f.userId || "").substring(0, 8)}...</span>
                      <div className="flex items-center gap-0.5 text-amber-400 text-xs">
                        {"★".repeat(f.rating || 0)}
                        {"☆".repeat(5 - (f.rating || 0))}
                      </div>
                    </div>
                    <p className="text-xs text-[#1a1a1a] italic leading-relaxed">&ldquo;{f.comment || f.message}&rdquo;</p>
                  </div>
                ))}
                {feedbacks.length === 0 && (
                  <div className="text-center text-xs text-[#555] py-12">
                    No attendee feedbacks received yet.
                  </div>
                )}
              </div>
            </div>
          ) : (
            // ANNOUNCEMENTS SUBTAB
            <div className="grid lg:grid-cols-[1.8fr_1.2fr] gap-8">
              {/* List */}
              <div className="space-y-4">
                <h3 className="font-display font-bold text-[#1a1a1a]">Event Announcements</h3>
                {filteredAnnouncements.length === 0 ? (
                  <div className="bg-white border border-[#e5e7eb] rounded-2xl p-10 text-center text-[#aaa]">No announcements broadcasted for this session yet.</div>
                ) : filteredAnnouncements.map((a, idx) => {
                  const id = a.announcementId || a.id;
                  return (
                    <div key={`${id || idx}-${idx}`} className="bg-white border border-[#e5e7eb] rounded-xl p-5 hover:border-[#FF4747]/20 transition-all">
                      <div className="flex justify-between items-start">
                        <div>
                          <span className={`text-[8px] font-bold px-2.5 py-0.5 rounded-full border ${typeColors[a.type] || typeColors.GENERAL} uppercase tracking-wider`}>
                            {a.type || "GENERAL"}
                          </span>
                          <div className="text-sm font-bold text-[#1a1a1a] mt-2">{a.title}</div>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          <button onClick={() => {
                            setEditingAnnouncement(a);
                            setAnnouncementForm({ title: a.title, content: a.content, type: a.type || "GENERAL" });
                            announcementFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                          }} className="p-1.5 text-[#555] hover:bg-stone-100 rounded-lg transition-colors cursor-pointer">
                            <Pencil size={13} />
                          </button>
                          <button onClick={() => handleDeleteAnnouncement(id)} className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer">
                            <Trash2 size={13} />
                          </button>
                        </div>
                      </div>
                      <div className="text-xs text-[#555] leading-relaxed mt-2 italic">&ldquo;{a.content}&rdquo;</div>
                      <div className="text-[9px] text-[#888] mt-3 font-mono">
                        Posted on {new Date(a.publishedAt).toLocaleString()}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Form */}
              <div className="bg-white border border-[#e5e7eb] rounded-3xl p-7 h-fit">
                <div className="flex items-center justify-between mb-5">
                  <h4 className="font-bold text-sm text-[#1a1a1a]">{editingAnnouncement ? "Edit Announcement" : "Create Announcement"}</h4>
                  {editingAnnouncement && (
                    <button type="button" onClick={() => { setEditingAnnouncement(null); setAnnouncementForm({ title: "", content: "", type: "GENERAL" }); }} className="text-xs text-[#888] hover:text-[#1a1a1a] cursor-pointer underline">Cancel edit</button>
                  )}
                </div>
                <form ref={announcementFormRef} onSubmit={handlePostAnnouncement} className="space-y-4">
                  <div>
                    <label className={label}>Announcement Title *</label>
                    <input required placeholder="e.g. Venue Change / Event Delay" value={announcementForm.title} onChange={e => setAnnouncementForm(f => ({ ...f, title: e.target.value }))} className={inp} />
                  </div>
                  <div>
                    <label className={label}>Announcement Category</label>
                    <select value={announcementForm.type} onChange={e => setAnnouncementForm(f => ({ ...f, type: e.target.value }))} className={inp}>
                      <option value="GENERAL">General</option>
                      <option value="URGENT">Urgent</option>
                      <option value="SCHEDULE_CHANGE">Schedule Change</option>
                      <option value="REMINDER">Reminder</option>
                      <option value="LOGISTICS">Logistics</option>
                    </select>
                  </div>
                  <div>
                    <label className={label}>Content *</label>
                    <textarea required placeholder="Write your broadcast content here..." value={announcementForm.content} onChange={e => setAnnouncementForm(f => ({ ...f, content: e.target.value }))} rows={4} className={inp + " resize-none"} />
                  </div>
                  <button type="submit" disabled={saving} className={saveBtn + " w-full justify-center"}>
                    <Megaphone size={13} /> {editingAnnouncement ? (saving ? "Saving..." : "Save Announcement") : (saving ? "Broadcasting..." : "Broadcast Announcement")}
                  </button>
                </form>
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
