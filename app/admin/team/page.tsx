"use client";
import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { Plus, ChevronDown, User, X, Users } from "lucide-react";
import { getStoredAuth } from "@/app/utils/api";
import { eventService } from "@/app/utils/services/eventService";

const inp = "w-full bg-white border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-sm text-[#1a1a1a] placeholder:text-[#aaa] outline-none focus:border-[#FF4747] transition-colors";
const label = "block text-[10px] font-semibold text-[#888] uppercase tracking-wider mb-1.5";

export default function TeamPage() {
  const auth = getStoredAuth();
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [team, setTeam] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [form, setForm] = useState({ name: "", position: "", bio: "", photoUrl: "" });

  const showToast = (msg: string) => { setToast(msg); setTimeout(() => setToast(null), 3000); };

  useEffect(() => {
    const load = async () => {
      try {
        const evs = await eventService.getMyEvents();
        setEvents(evs || []);
        if (evs?.length) setSelectedEventId(evs[0].eventId);
      } catch {}
    };
    load();
  }, []);

  useEffect(() => {
    if (!selectedEventId) return;
    loadTeam(selectedEventId);
  }, [selectedEventId]);

  const loadTeam = async (eventId: string) => {
    setLoading(true);
    const tenantId = auth?.tenantId;
    try {
      const nets = await eventService.getNetworkings();
      setTeam((nets || []).filter((n: any) =>
        (n.eventId === eventId || n.event?.eventId === eventId) &&
        n.role === "TEAM_MEMBER" &&
        (!tenantId || !n.tenantId || n.tenantId === tenantId)
      ));
    } catch {} finally { setLoading(false); }
  };

  const addMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !selectedEventId) return;
    setSaving(true);
    try {
      await eventService.createNetworking({
        eventId: selectedEventId,
        role: "TEAM_MEMBER",
        name: form.name,
        skills: form.position,        // position stored in skills
        availability: form.bio,       // bio stored in availability
        photoUrl: form.photoUrl || undefined,
        status: "ACTIVE",
      });
      setForm({ name: "", position: "", bio: "", photoUrl: "" });
      await loadTeam(selectedEventId);
      showToast("Team member added!");
    } catch { showToast("Failed to add team member."); }
    finally { setSaving(false); }
  };

  const removeMember = async (id: string) => {
    try {
      await eventService.deleteNetworking(id);
      await loadTeam(selectedEventId);
      showToast("Removed.");
    } catch { showToast("Failed to remove."); }
  };

  const selectedEvent = events.find(e => e.eventId === selectedEventId);

  return (
    <div className="flex bg-[#f9fafb] min-h-screen text-[#1a1a1a]">
      <Sidebar />

      {toast && (
        <div className="fixed top-5 right-5 z-50 bg-[#1a1a1a] text-white text-sm font-semibold px-5 py-3 rounded-2xl shadow-xl">{toast}</div>
      )}

      <div className="ml-[220px] flex-1 flex flex-col">
        <header className="h-[60px] bg-white border-b border-[#e5e7eb] flex items-center justify-between px-8 sticky top-0 z-40">
          <h1 className="font-display text-xl font-bold text-[#FF4747]">Team Management</h1>
          {events.length > 0 && (
            <div className="relative">
              <select value={selectedEventId} onChange={e => setSelectedEventId(e.target.value)}
                className="appearance-none bg-white border border-[#e5e7eb] text-[#1a1a1a] text-sm rounded-xl px-4 py-1.5 pr-8 outline-none cursor-pointer focus:border-[#FF4747]">
                {events.map(ev => <option key={ev.eventId} value={ev.eventId}>{ev.title}</option>)}
              </select>
              <ChevronDown size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#aaa] pointer-events-none" />
            </div>
          )}
        </header>

        <main className="p-8">
          {!selectedEventId ? (
            <div className="text-center py-20 text-[#aaa]">
              <Users size={40} className="mx-auto mb-3 opacity-30" />
              <p>No events found. Create an event first.</p>
            </div>
          ) : (
            <div className="max-w-5xl grid md:grid-cols-[1fr_380px] gap-8">

              {/* Team Grid */}
              <div>
                <h2 className="font-display font-bold text-[#1a1a1a] mb-5">
                  Team for <span className="text-[#FF4747]">{selectedEvent?.title}</span>
                  <span className="ml-2 text-sm font-normal text-[#aaa]">({team.length} member{team.length !== 1 ? "s" : ""})</span>
                </h2>

                {loading ? (
                  <div className="grid md:grid-cols-3 gap-5">
                    {[1,2,3].map(i => <div key={i} className="bg-white border border-[#e5e7eb] rounded-2xl p-5 animate-pulse h-40" />)}
                  </div>
                ) : team.length === 0 ? (
                  <div className="bg-white border border-dashed border-[#e5e7eb] rounded-3xl p-14 text-center text-[#aaa]">
                    <User size={36} className="mx-auto mb-3 opacity-30" />
                    <p className="text-sm">No team members yet for this event.</p>
                    <p className="text-xs mt-1">Add your first team member using the form.</p>
                  </div>
                ) : (
                  <div className="grid md:grid-cols-3 gap-5">
                    {team.map((m, i) => {
                      const id = m.connectionId || m.id;
                      return (
                        <div key={id || i} className="bg-white border border-[#e5e7eb] rounded-2xl p-5 relative group hover:border-[#FF4747]/30 hover:shadow-md transition-all">
                          <button onClick={() => removeMember(id)} className="absolute top-3 right-3 w-7 h-7 bg-[#fafafa] border border-[#f0f0f0] rounded-full flex items-center justify-center text-[#aaa] hover:bg-red-50 hover:text-red-500 hover:border-red-200 opacity-0 group-hover:opacity-100 transition-all cursor-pointer">
                            <X size={12} />
                          </button>
                          <div className="flex flex-col items-center text-center">
                            {m.photoUrl ? (
                              <img src={m.photoUrl} alt={m.name} className="w-16 h-16 rounded-full object-cover mb-3 border-2 border-[#f0f0f0]" />
                            ) : (
                              <div className="w-16 h-16 rounded-full bg-[#F7E998] flex items-center justify-center text-[#1a1a1a] font-black text-xl mb-3">{(m.name || "?").charAt(0)}</div>
                            )}
                            <div className="font-bold text-sm text-[#1a1a1a]">{m.name}</div>
                            {m.skills && <div className="text-xs text-[#FF4747] font-semibold mt-0.5">{m.skills}</div>}
                            {m.availability && <div className="text-xs text-[#888] mt-2 leading-relaxed line-clamp-3">{m.availability}</div>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Add Member Form */}
              <div className="bg-white border border-[#e5e7eb] rounded-3xl p-7 h-fit">
                <h3 className="font-display font-bold text-[#1a1a1a] mb-5">Add Team Member</h3>
                <form onSubmit={addMember} className="space-y-4">
                  <div><label className={label}>Full Name *</label><input required placeholder="Jane Doe" value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} className={inp} /></div>
                  <div><label className={label}>Position / Role</label><input placeholder="e.g. Event Director" value={form.position} onChange={e => setForm(f => ({ ...f, position: e.target.value }))} className={inp} /></div>
                  <div><label className={label}>Bio / Credentials</label><textarea placeholder="Brief bio..." value={form.bio} onChange={e => setForm(f => ({ ...f, bio: e.target.value }))} rows={3} className={inp + " resize-none"} /></div>

                  <div>
                    <label className={label}>Profile Photo</label>
                    <label className="flex items-center gap-3 border-2 border-dashed border-[#e5e7eb] rounded-2xl p-4 cursor-pointer hover:border-[#FF4747] transition-colors group">
                      {form.photoUrl ? (
                        <img src={form.photoUrl} alt="Preview" className="w-12 h-12 rounded-full object-cover shrink-0" />
                      ) : (
                        <div className="w-12 h-12 rounded-full bg-[#fafafa] border border-[#e5e7eb] flex items-center justify-center shrink-0">
                          <User size={18} className="text-[#ccc] group-hover:text-[#FF4747] transition-colors" />
                        </div>
                      )}
                      <span className="text-sm text-[#888] group-hover:text-[#FF4747] transition-colors">{form.photoUrl ? "Click to change" : "Upload photo"}</span>
                      <input type="file" accept="image/*" className="hidden" onChange={e => { const f = e.target.files?.[0]; if (!f) return; const r = new FileReader(); r.onload = ev => setForm(f => ({ ...f, photoUrl: ev.target?.result as string })); r.readAsDataURL(f); }} />
                    </label>
                    {form.photoUrl && <button type="button" onClick={() => setForm(f => ({ ...f, photoUrl: "" }))} className="text-xs text-red-500 mt-1 hover:underline cursor-pointer">Remove photo</button>}
                  </div>

                  <button type="submit" disabled={saving} className="w-full py-3 bg-[#FF4747] text-white text-sm font-bold rounded-xl hover:bg-[#e03e3e] transition-colors cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2">
                    <Plus size={15} />{saving ? "Adding..." : "Add Team Member"}
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
