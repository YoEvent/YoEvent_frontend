"use client";
import { useState, useEffect, useRef } from "react";
import Sidebar from "@/components/Sidebar";
import { CheckCircle, XCircle, Users, Handshake, ChevronDown, Building2, Star, Plus, Trash2, Pencil, Save, Image as ImageIcon, Phone, Globe, Mail, User, Upload } from "lucide-react";
import { getStoredAuth } from "@/app/utils/api";
import { eventService } from "@/app/utils/services/eventService";
import { useLanguage } from "@/app/context/LanguageContext";

type Tab = "sponsors" | "vendors" | "volunteers";

const STATUS_STYLES: Record<string, string> = {
  PENDING:  "bg-amber-900/30 text-amber-300 border border-amber-700/40",
  ACCEPTED: "bg-green-900/30 text-green-400 border border-green-700/40",
  CONFIRMED: "bg-green-900/30 text-green-400 border border-green-700/40",
  REJECTED: "bg-red-900/30 text-red-400 border border-red-700/40",
};

const inp = "w-full bg-white border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-sm text-[#1a1a1a] placeholder:text-[#aaa] outline-none focus:border-[#FF4747] transition-colors";
const label = "block text-[10px] font-semibold text-[#888] uppercase tracking-wider mb-1.5";
const saveBtn = "flex items-center gap-2 px-5 py-2.5 bg-[#FF4747] text-white text-xs font-bold rounded-xl hover:bg-[#e03e3e] transition-colors cursor-pointer disabled:opacity-50";

function MediaUploadField({
  fieldLabel,
  value,
  uploading,
  onUploading,
  onChange,
  onError,
  round,
}: {
  fieldLabel: string;
  value: string;
  uploading: boolean;
  onUploading: (uploading: boolean) => void;
  onChange: (url: string) => void;
  onError: (message: string) => void;
  round?: boolean;
}) {
  const isVideo = /\.(mp4|webm|mov|m4v|ogg)$/i.test(value);
  return (
    <div>
      <label className={label}>{fieldLabel}</label>
      <label className="flex items-center gap-3 border-2 border-dashed border-[#e5e7eb] rounded-xl p-3 cursor-pointer hover:border-[#FF4747] transition-colors group">
        {value ? (
          isVideo ? (
            <video src={value} muted className={`w-12 h-12 object-cover shrink-0 ${round ? "rounded-full" : "rounded-lg"}`} />
          ) : (
            <img src={value} alt="Preview" className={`w-12 h-12 object-cover shrink-0 ${round ? "rounded-full" : "rounded-lg"}`} />
          )
        ) : (
          <div className={`w-12 h-12 bg-[#fafafa] border border-[#e5e7eb] flex items-center justify-center shrink-0 ${round ? "rounded-full" : "rounded-lg"}`}>
            <Upload size={16} className="text-[#ccc] group-hover:text-[#FF4747] transition-colors" />
          </div>
        )}
        <span className="text-xs text-[#888] group-hover:text-[#FF4747] transition-colors">
          {uploading ? "Uploading..." : value ? "Click to change" : "Upload image or video"}
        </span>
        <input
          type="file"
          accept="image/*,video/*"
          className="hidden"
          disabled={uploading}
          onChange={async (e) => {
            const f = e.target.files?.[0];
            e.target.value = "";
            if (!f) return;
            onUploading(true);
            try {
              const res = await eventService.uploadImage(f);
              onChange(res.url);
            } catch (err: any) {
              onError(err?.message || "Upload failed.");
            } finally {
              onUploading(false);
            }
          }}
        />
      </label>
    </div>
  );
}

export default function ApplicationsPage() {
  const { t } = useLanguage();
  const [tab, setTab] = useState<Tab>("sponsors");
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState("");
  const [sponsors, setSponsors] = useState<any[]>([]);
  const [participants, setParticipants] = useState<any[]>([]);
  const [organizations, setOrganizations] = useState<any[]>([]);
  
  const [maxSponsors, setMaxSponsors] = useState(10);
  const [maxVendors, setMaxVendors] = useState(15);
  const [maxVolunteers, setMaxVolunteers] = useState(20);
  
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [uploadingField, setUploadingField] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);

  // Forms
  const [editingSponsor, setEditingSponsor] = useState<any>(null);
  const [sponsorForm, setSponsorForm] = useState({
    organizationId: "",
    newCompanyName: "",
    newCompanyLogo: "",
    newCompanyWebsite: "",
    email: "",
    phone: "",
    contactName: "",
    packageId: "",
    amount: "",
    message: ""
  });

  const [editingParticipant, setEditingParticipant] = useState<any>(null);

  const [vendorForm, setVendorForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    organizationId: "",
    newCompanyName: "",
    newCompanyLogo: "",
    newCompanyWebsite: "",
    status: "pending",
    notes: ""
  });

  const [volunteerForm, setVolunteerForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    bio: "",
    photoUrl: "",
    status: "pending",
    notes: ""
  });

  const sponsorFormRef = useRef<HTMLFormElement>(null);
  const vendorFormRef = useRef<HTMLFormElement>(null);
  const volunteerFormRef = useRef<HTMLFormElement>(null);

  const showToast = (type: "success" | "error", text: string) => {
    setToast({ type, text });
    setTimeout(() => setToast(null), 3500);
  };

  useEffect(() => {
    const auth = getStoredAuth();
    if (!auth) return;
    eventService.getMyEvents().then((evs) => {
      setEvents(evs || []);
      if (evs?.length) setSelectedEventId(evs[0].eventId);
    }).catch(console.error);
  }, []);

  useEffect(() => {
    if (!selectedEventId) return;
    loadApplications(selectedEventId);
  }, [selectedEventId]);

  const loadApplications = async (eventId: string) => {
    setLoading(true);
    try {
      const [eventSponsors, allParticipants, allOrgs] = await Promise.all([
        eventService.getSponsorsByEvent(eventId).catch(() => []),
        eventService.getParticipantsByEvent(eventId).catch(() => []),
        eventService.getOrganizations().catch(() => []),
      ]);
      setSponsors(eventSponsors || []);
      setParticipants(allParticipants || []);
      setOrganizations(allOrgs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Filter Event Participants by roles
  const exhibitors = participants.filter(p => p.role?.id === "a0000000-0000-0000-0000-000000000004");
  const volunteers = participants.filter(p => p.role?.id === "a0000000-0000-0000-0000-000000000003");

  const updateSponsorStatus = async (sponsor: any, status: "ACCEPTED" | "REJECTED") => {
    const id = sponsor.sponsorId || sponsor.id;
    const acceptedCount = sponsors.filter(s => s.status === "ACCEPTED").length;
    if (status === "ACCEPTED" && acceptedCount >= maxSponsors) {
      showToast("error", t("adminApplications.toasts.maxSponsorsReached", { max: maxSponsors }));
      return;
    }
    setActionLoading(id);
    try {
      await eventService.updateSponsor(id, { ...sponsor, status });
      setSponsors(prev => prev.map(s => (s.sponsorId === id || s.id === id) ? { ...s, status } : s));
      showToast("success", status === "ACCEPTED" ? t("adminApplications.toasts.sponsorAccepted") : t("adminApplications.toasts.sponsorRejected"));
    } catch {
      showToast("error", t("adminApplications.toasts.actionFailed"));
    } finally {
      setActionLoading(null);
    }
  };

  const updateParticipantStatus = async (part: any, status: "confirmed" | "rejected") => {
    const id = part.id;
    setActionLoading(id);
    try {
      await eventService.updateParticipant(id, {
        eventId: selectedEventId,
        personId: part.person?.id,
        roleId: part.role?.id,
        status: status
      });
      const statusLabel = status === "confirmed" ? t("adminApplications.toasts.statusConfirmed") : t("adminApplications.toasts.statusRejected");
      showToast("success", t("adminApplications.toasts.participantStatusUpdated", { status: statusLabel }));
      await loadApplications(selectedEventId);
    } catch {
      showToast("error", t("adminApplications.toasts.actionFailed"));
    } finally {
      setActionLoading(null);
    }
  };

  // Save Sponsor
  const saveSponsor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId) return;
    setSaving(true);
    
    try {
      // Resolve organization id
      let orgId = sponsorForm.organizationId;
      if (sponsorForm.newCompanyName.trim()) {
        const org = await eventService.createOrganization({
          name: sponsorForm.newCompanyName,
          website: sponsorForm.newCompanyWebsite || undefined,
          logo: sponsorForm.newCompanyLogo || undefined,
          type: "sponsor"
        });
        orgId = org.id;
      }

      if (!orgId) {
        showToast("error", "Please select or create an organization.");
        setSaving(false);
        return;
      }

      const payload = {
        eventId: selectedEventId,
        organizationId: orgId,
        sponsorshipAmount: sponsorForm.amount ? parseFloat(sponsorForm.amount) : undefined,
        contactName: sponsorForm.contactName,
        email: sponsorForm.email,
        phone: sponsorForm.phone,
        message: sponsorForm.message,
        status: "ACCEPTED",
      };

      if (editingSponsor) {
        await eventService.updateSponsor(editingSponsor.sponsorId || editingSponsor.id, payload);
        setEditingSponsor(null);
        showToast("success", "Sponsor updated!");
      } else {
        await eventService.createSponsor(payload);
        showToast("success", "Sponsor added!");
      }

      setSponsorForm({
        organizationId: "",
        newCompanyName: "",
        newCompanyLogo: "",
        newCompanyWebsite: "",
        email: "",
        phone: "",
        contactName: "",
        packageId: "",
        amount: "",
        message: ""
      });
      await loadApplications(selectedEventId);
    } catch (err: any) {
      showToast("error", err.response?.data?.message || "Failed to save sponsor.");
    } finally {
      setSaving(false);
    }
  };

  const deleteSponsor = async (id: string) => {
    if (!confirm("Delete this sponsor?")) return;
    try {
      await eventService.deleteSponsor(id);
      await loadApplications(selectedEventId);
      showToast("success", "Sponsor deleted!");
    } catch {
      showToast("error", "Failed to delete sponsor.");
    }
  };

  // Save Vendor (Exhibitor)
  const saveVendor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId || !vendorForm.firstName.trim() || !vendorForm.email.trim()) return;
    setSaving(true);

    try {
      // 1. Resolve organization
      let orgId = vendorForm.organizationId;
      if (vendorForm.newCompanyName.trim()) {
        const org = await eventService.createOrganization({
          name: vendorForm.newCompanyName,
          website: vendorForm.newCompanyWebsite || undefined,
          logo: vendorForm.newCompanyLogo || undefined,
          type: "vendor"
        });
        orgId = org.id;
      }

      // 2. Create/Update Person
      const person = await eventService.createPerson({
        firstName: vendorForm.firstName,
        lastName: vendorForm.lastName,
        email: vendorForm.email,
        phone: vendorForm.phone,
        organizationId: orgId || undefined
      });

      // 3. Link Event Participant
      const participantPayload = {
        eventId: selectedEventId,
        personId: person.id,
        roleId: "a0000000-0000-0000-0000-000000000004", // Exhibitor role ID
        status: vendorForm.status,
        notes: vendorForm.notes || undefined
      };

      if (editingParticipant) {
        await eventService.updateParticipant(editingParticipant.id, participantPayload);
        setEditingParticipant(null);
        showToast("success", "Vendor updated!");
      } else {
        await eventService.createParticipant(participantPayload);
        showToast("success", "Vendor added!");
      }

      setVendorForm({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        organizationId: "",
        newCompanyName: "",
        newCompanyLogo: "",
        newCompanyWebsite: "",
        status: "pending",
        notes: ""
      });
      await loadApplications(selectedEventId);
    } catch (err: any) {
      showToast("error", err.response?.data?.message || "Failed to save vendor.");
    } finally {
      setSaving(false);
    }
  };

  // Save Volunteer
  const saveVolunteer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId || !volunteerForm.firstName.trim() || !volunteerForm.email.trim()) return;
    setSaving(true);

    try {
      // 1. Create/Update Person
      const person = await eventService.createPerson({
        firstName: volunteerForm.firstName,
        lastName: volunteerForm.lastName,
        email: volunteerForm.email,
        phone: volunteerForm.phone,
        bio: volunteerForm.bio || undefined,
        profilePhoto: volunteerForm.photoUrl || undefined
      });

      // 2. Link Event Participant
      const participantPayload = {
        eventId: selectedEventId,
        personId: person.id,
        roleId: "a0000000-0000-0000-0000-000000000003", // Volunteer role ID
        status: volunteerForm.status,
        notes: volunteerForm.notes || undefined
      };

      if (editingParticipant) {
        await eventService.updateParticipant(editingParticipant.id, participantPayload);
        setEditingParticipant(null);
        showToast("success", "Volunteer updated!");
      } else {
        await eventService.createParticipant(participantPayload);
        showToast("success", "Volunteer added!");
      }

      setVolunteerForm({
        firstName: "",
        lastName: "",
        email: "",
        phone: "",
        bio: "",
        photoUrl: "",
        status: "pending",
        notes: ""
      });
      await loadApplications(selectedEventId);
    } catch (err: any) {
      showToast("error", err.response?.data?.message || "Failed to save volunteer.");
    } finally {
      setSaving(false);
    }
  };

  const deleteParticipant = async (id: string) => {
    if (!confirm("Delete this participant application?")) return;
    try {
      await eventService.deleteParticipant(id);
      await loadApplications(selectedEventId);
      showToast("success", "Application deleted.");
    } catch {
      showToast("error", "Failed to delete.");
    }
  };

  const selectedEvent = events.find(e => e.eventId === selectedEventId);
  const pendingSponsors = sponsors.filter(s => s.status === "PENDING" || s.status === "pending").length;
  const pendingVendors = exhibitors.filter(v => v.status === "PENDING" || v.status === "pending").length;
  const pendingVolunteers = volunteers.filter(v => v.status === "PENDING" || v.status === "pending").length;

  return (
    <div className="flex bg-[#f9fafb] min-h-screen text-[#374151]">
      <Sidebar />
      <div className="ml-[220px] flex-1 flex flex-col">
        <header className="h-[60px] bg-white border-b border-[#e5e7eb] flex items-center justify-between px-8 sticky top-0 z-40">
          <h1 className="font-display text-xl font-bold text-[#EB4203]">Applications</h1>
          {events.length > 0 && (
            <div className="relative">
              <select
                value={selectedEventId}
                onChange={e => {
                  setSelectedEventId(e.target.value);
                  setEditingSponsor(null);
                  setEditingParticipant(null);
                }}
                className="appearance-none bg-white border border-[#e5e7eb] text-[#1a1a1a] text-sm rounded-lg px-4 py-1.5 pr-8 outline-none cursor-pointer"
              >
                {events.map(ev => (
                  <option key={ev.eventId} value={ev.eventId}>{ev.title}</option>
                ))}
              </select>
              <ChevronDown size={14} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#555] pointer-events-none" />
            </div>
          )}
        </header>

        <main className="p-8 space-y-6 max-w-[1400px]">
          {/* TOAST */}
          {toast && (
            <div className={`fixed top-5 right-5 z-[100] px-5 py-3 rounded-xl text-sm font-semibold shadow-xl ${toast.type === "success" ? "bg-green-700 text-white" : "bg-red-700 text-white"}`}>
              {toast.text}
            </div>
          )}

          {/* STATS */}
          <div className="grid md:grid-cols-3 gap-5">
            <div className="bg-white border border-[#e5e7eb] rounded-2xl p-5 flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-amber-900/30 flex items-center justify-center"><Handshake size={20} className="text-amber-300" /></div>
              <div>
                <p className="text-xs text-[#555] uppercase tracking-wider">Sponsor Partners</p>
                <p className="text-2xl font-bold text-[#1a1a1a]">{sponsors.length} <span className="text-sm font-normal text-amber-300">({pendingSponsors} pending)</span></p>
              </div>
            </div>
            <div className="bg-white border border-[#e5e7eb] rounded-2xl p-5 flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-purple-900/30 flex items-center justify-center"><Building2 size={20} className="text-purple-300" /></div>
              <div>
                <p className="text-xs text-[#555] uppercase tracking-wider">Vendors / Exhibitors</p>
                <p className="text-2xl font-bold text-[#1a1a1a]">{exhibitors.length} <span className="text-sm font-normal text-purple-300">({pendingVendors} pending)</span></p>
              </div>
            </div>
            <div className="bg-white border border-[#e5e7eb] rounded-2xl p-5 flex items-center gap-4">
              <div className="w-11 h-11 rounded-xl bg-blue-900/30 flex items-center justify-center"><Users size={20} className="text-blue-300" /></div>
              <div>
                <p className="text-xs text-[#555] uppercase tracking-wider">Volunteers</p>
                <p className="text-2xl font-bold text-[#1a1a1a]">{volunteers.length} <span className="text-sm font-normal text-blue-300">({pendingVolunteers} pending)</span></p>
              </div>
            </div>
          </div>

          {/* TABS */}
          <div className="flex gap-1 bg-[#f5f5f5] border border-[#e5e7eb] rounded-xl p-1 w-fit">
            {([["sponsors", "Sponsors", Handshake], ["vendors", "Vendors / Exhibitors", Building2], ["volunteers", "Volunteers", Users]] as const).map(([key, label, Icon]) => (
              <button key={key} onClick={() => setTab(key)}
                className={`flex items-center gap-2 px-5 py-2 rounded-lg text-sm font-semibold transition-all cursor-pointer ${tab === key ? "bg-[#FF4747] text-white" : "text-[#666] hover:text-[#1a1a1a]"}`}>
                <Icon size={15} />{label}
              </button>
            ))}
          </div>

          {loading ? (
            <div className="flex justify-center py-16"><div className="w-8 h-8 border-4 border-[#e5e7eb] border-t-[#EB4203] rounded-full animate-spin" /></div>
          ) : tab === "sponsors" ? (
            <div className="grid lg:grid-cols-[1.8fr_1.2fr] gap-8">
              {/* Sponsors List */}
              <div className="space-y-3">
                {sponsors.length === 0 ? (
                  <div className="bg-white border border-[#e5e7eb] rounded-2xl p-10 text-center text-[#555]">No sponsor partners registered.</div>
                ) : sponsors.map((s) => {
                  const id = s.sponsorId || s.id;
                  const org = s.organization;
                  return (
                    <div key={id} className="bg-white border border-[#e5e7eb] rounded-2xl p-5 flex items-center gap-5">
                      {/* Logo */}
                      <div className="w-14 h-14 rounded-xl bg-[#ffffff] border border-[#e5e7eb] flex items-center justify-center shrink-0 overflow-hidden">
                        {org?.logo ? (
                          <img src={org.logo} alt={org.name} className="w-full h-full object-contain p-1" />
                        ) : (
                          <Handshake size={22} className="text-[#444]" />
                        )}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[#1a1a1a] truncate">{org?.name || "Unknown Company"}</p>
                        <p className="text-xs text-[#666] mt-0.5">{s.email || "—"} {s.phone ? `· ${s.phone}` : ""}</p>
                        {org?.website && <p className="text-xs text-[#EB4203] mt-1"><a href={org.website} target="_blank" rel="noopener noreferrer" className="hover:underline">{org.website}</a></p>}
                        {s.message && <p className="text-xs text-[#555] mt-1 line-clamp-2 italic">"{s.message}"</p>}
                      </div>
                      {/* Amount */}
                      {s.sponsorshipAmount && (
                        <div className="text-right shrink-0">
                          <p className="text-xs text-[#555]">Sponsorship</p>
                          <p className="text-sm font-bold text-[#EB4203]">{Number(s.sponsorshipAmount).toLocaleString()} FCFA</p>
                        </div>
                      )}
                      {/* Status */}
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shrink-0 ${STATUS_STYLES[s.status] || STATUS_STYLES.PENDING}`}>
                        {s.status || "PENDING"}
                      </span>
                      {/* Actions */}
                      <div className="flex gap-2 shrink-0">
                        <button
                          onClick={() => {
                            setEditingSponsor(s);
                            setSponsorForm({
                              organizationId: org?.id || "",
                              newCompanyName: "",
                              newCompanyLogo: "",
                              newCompanyWebsite: "",
                              email: s.email || "",
                              phone: s.phone || "",
                              contactName: s.contactName || "",
                              packageId: s.sponsorshipPackage?.packageId || "",
                              amount: s.sponsorshipAmount?.toString() || "",
                              message: s.message || ""
                            });
                            sponsorFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                          }}
                          className="p-1.5 text-[#555] hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => deleteSponsor(id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add Sponsor Form */}
              <div className="bg-white border border-[#e5e7eb] rounded-3xl p-7">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-bold text-sm text-[#1a1a1a]">{editingSponsor ? "Edit Sponsor" : "Add Sponsor"}</h3>
                  {editingSponsor && (
                    <button type="button" onClick={() => { setEditingSponsor(null); setSponsorForm({ organizationId: "", newCompanyName: "", newCompanyLogo: "", newCompanyWebsite: "", email: "", phone: "", contactName: "", packageId: "", amount: "", message: "" }); }} className="text-xs text-[#888] hover:text-[#1a1a1a] cursor-pointer underline">Cancel edit</button>
                  )}
                </div>
                <form ref={sponsorFormRef} onSubmit={saveSponsor} className="space-y-4">
                  <div>
                    <label className={label}>Select Existing Organization</label>
                    <select value={sponsorForm.organizationId} onChange={e => setSponsorForm(f => ({ ...f, organizationId: e.target.value }))} className={inp}>
                      <option value="">— Select Organization —</option>
                      {organizations.map(org => (
                        <option key={org.id} value={org.id}>{org.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={label}>Or Create New Organization</label>
                    <input placeholder="e.g. Acme Corp" value={sponsorForm.newCompanyName} onChange={e => setSponsorForm(f => ({ ...f, newCompanyName: e.target.value }))} className={inp} />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <MediaUploadField
                      fieldLabel="New Org Logo"
                      value={sponsorForm.newCompanyLogo}
                      uploading={uploadingField === "sponsorLogo"}
                      onUploading={(v) => setUploadingField(v ? "sponsorLogo" : null)}
                      onChange={(url) => setSponsorForm(f => ({ ...f, newCompanyLogo: url }))}
                      onError={(msg) => showToast("error", msg)}
                    />
                    <div>
                      <label className={label}>New Org Website</label>
                      <input placeholder="https://..." value={sponsorForm.newCompanyWebsite} onChange={e => setSponsorForm(f => ({ ...f, newCompanyWebsite: e.target.value }))} className={inp} />
                    </div>
                  </div>

                  <div className="border-t border-[#f0f0f0] pt-4 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={label}>Contact Person Name</label>
                        <input placeholder="Jane Doe" value={sponsorForm.contactName} onChange={e => setSponsorForm(f => ({ ...f, contactName: e.target.value }))} className={inp} />
                      </div>
                      <div>
                        <label className={label}>Sponsorship Amount (FCFA)</label>
                        <input type="number" placeholder="500000" value={sponsorForm.amount} onChange={e => setSponsorForm(f => ({ ...f, amount: e.target.value }))} className={inp} />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={label}>Email *</label>
                        <input required type="email" placeholder="partner@acme.com" value={sponsorForm.email} onChange={e => setSponsorForm(f => ({ ...f, email: e.target.value }))} className={inp} />
                      </div>
                      <div>
                        <label className={label}>Phone</label>
                        <input placeholder="+237..." value={sponsorForm.phone} onChange={e => setSponsorForm(f => ({ ...f, phone: e.target.value }))} className={inp} />
                      </div>
                    </div>
                    <div>
                      <label className={label}>Partnership Message</label>
                      <textarea placeholder="Special message or notes..." value={sponsorForm.message} onChange={e => setSponsorForm(f => ({ ...f, message: e.target.value }))} rows={2} className={inp + " resize-none"} />
                    </div>
                  </div>

                  <button type="submit" disabled={saving || uploadingField !== null} className={saveBtn}>
                    <Save size={13} /> {editingSponsor ? (saving ? "Saving..." : "Save Sponsor") : (saving ? "Adding..." : "Add Sponsor")}
                  </button>
                </form>
              </div>
            </div>
          ) : tab === "vendors" ? (
            <div className="grid lg:grid-cols-[1.8fr_1.2fr] gap-8">
              {/* Vendors List */}
              <div className="space-y-3">
                {exhibitors.length === 0 ? (
                  <div className="bg-white border border-[#e5e7eb] rounded-2xl p-10 text-center text-[#555]">No vendor / exhibitor applications.</div>
                ) : exhibitors.map((v) => {
                  const id = v.id;
                  const person = v.person;
                  return (
                    <div key={id} className="bg-white border border-[#e5e7eb] rounded-2xl p-5 flex items-center gap-5">
                      {/* Logo */}
                      <div className="w-14 h-14 rounded-xl bg-[#ffffff] border border-[#e5e7eb] flex items-center justify-center shrink-0 overflow-hidden">
                        {person?.organization?.logo ? (
                          <img src={person.organization.logo} alt={person.organization.name} className="w-full h-full object-contain p-1" />
                        ) : (
                          <Building2 size={22} className="text-[#444]" />
                        )}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[#1a1a1a] truncate">{person?.firstName} {person?.lastName}</p>
                        {person?.organization && <p className="text-xs text-blue-600 font-semibold flex items-center gap-0.5"><Building2 size={11} /> {person.organization.name}</p>}
                        <p className="text-xs text-[#666] mt-0.5">{person?.email || "—"} {person?.phone ? `· ${person.phone}` : ""}</p>
                        {v.notes && <p className="text-xs text-[#888] italic mt-1">&ldquo;{v.notes}&rdquo;</p>}
                      </div>
                      {/* Status */}
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shrink-0 ${STATUS_STYLES[v.status?.toUpperCase()] || STATUS_STYLES.PENDING}`}>
                        {v.status || "PENDING"}
                      </span>
                      {/* Actions */}
                      <div className="flex gap-2 shrink-0">
                        {v.status !== "confirmed" && (
                          <button
                            onClick={() => updateParticipantStatus(v, "confirmed")}
                            disabled={actionLoading === id}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-900/40 hover:bg-green-800/60 text-green-400 text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-40"
                          >
                            <CheckCircle size={13} /> Approve
                          </button>
                        )}
                        {v.status !== "rejected" && (
                          <button
                            onClick={() => updateParticipantStatus(v, "rejected")}
                            disabled={actionLoading === id}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-900/40 hover:bg-red-800/60 text-red-400 text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-40"
                          >
                            <XCircle size={13} /> Reject
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setEditingParticipant(v);
                            setVendorForm({
                              firstName: person?.firstName || "",
                              lastName: person?.lastName || "",
                              email: person?.email || "",
                              phone: person?.phone || "",
                              organizationId: person?.organization?.id || "",
                              newCompanyName: "",
                              newCompanyLogo: "",
                              newCompanyWebsite: "",
                              status: v.status || "pending",
                              notes: v.notes || ""
                            });
                            vendorFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                          }}
                          className="p-1.5 text-[#555] hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => deleteParticipant(id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add Vendor Form */}
              <div className="bg-white border border-[#e5e7eb] rounded-3xl p-7">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-bold text-sm text-[#1a1a1a]">{editingParticipant ? "Edit Vendor Representative" : "Add Vendor Representative"}</h3>
                  {editingParticipant && (
                    <button type="button" onClick={() => { setEditingParticipant(null); setVendorForm({ firstName: "", lastName: "", email: "", phone: "", organizationId: "", newCompanyName: "", newCompanyLogo: "", newCompanyWebsite: "", status: "pending", notes: "" }); }} className="text-xs text-[#888] hover:text-[#1a1a1a] cursor-pointer underline">Cancel edit</button>
                  )}
                </div>
                <form ref={vendorFormRef} onSubmit={saveVendor} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className={label}>First Name *</label><input required placeholder="Acme Rep" value={vendorForm.firstName} onChange={e => setVendorForm(f => ({ ...f, firstName: e.target.value }))} className={inp} /></div>
                    <div><label className={label}>Last Name</label><input placeholder="First" value={vendorForm.lastName} onChange={e => setVendorForm(f => ({ ...f, lastName: e.target.value }))} className={inp} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className={label}>Email *</label><input required type="email" placeholder="vendor@acme.com" value={vendorForm.email} onChange={e => setVendorForm(f => ({ ...f, email: e.target.value }))} className={inp} /></div>
                    <div><label className={label}>Phone</label><input placeholder="+237..." value={vendorForm.phone} onChange={e => setVendorForm(f => ({ ...f, phone: e.target.value }))} className={inp} /></div>
                  </div>

                  <div className="border-t border-[#f0f0f0] pt-4 space-y-4">
                    <div>
                      <label className={label}>Select Represented Organization</label>
                      <select value={vendorForm.organizationId} onChange={e => setVendorForm(f => ({ ...f, organizationId: e.target.value }))} className={inp}>
                        <option value="">— Select Organization —</option>
                        {organizations.map(org => (
                          <option key={org.id} value={org.id}>{org.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className={label}>Or Create New Organization Name</label>
                      <input placeholder="e.g. Acme Booths" value={vendorForm.newCompanyName} onChange={e => setVendorForm(f => ({ ...f, newCompanyName: e.target.value }))} className={inp} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <MediaUploadField
                        fieldLabel="New Org Logo"
                        value={vendorForm.newCompanyLogo}
                        uploading={uploadingField === "vendorLogo"}
                        onUploading={(v) => setUploadingField(v ? "vendorLogo" : null)}
                        onChange={(url) => setVendorForm(f => ({ ...f, newCompanyLogo: url }))}
                        onError={(msg) => showToast("error", msg)}
                      />
                      <div><label className={label}>New Org Website</label><input placeholder="https://..." value={vendorForm.newCompanyWebsite} onChange={e => setVendorForm(f => ({ ...f, newCompanyWebsite: e.target.value }))} className={inp} /></div>
                    </div>
                    <div>
                      <label className={label}>Application Notes</label>
                      <textarea placeholder="Booth assignment, special requirements..." value={vendorForm.notes} onChange={e => setVendorForm(f => ({ ...f, notes: e.target.value }))} rows={2} className={inp + " resize-none"} />
                    </div>
                  </div>

                  <button type="submit" disabled={saving || uploadingField !== null} className={saveBtn}>
                    <Save size={13} /> {editingParticipant ? (saving ? "Saving..." : "Save Vendor") : (saving ? "Adding..." : "Add Vendor")}
                  </button>
                </form>
              </div>
            </div>
          ) : (
            // VOLUNTEERS TAB
            <div className="grid lg:grid-cols-[1.8fr_1.2fr] gap-8">
              {/* Volunteers List */}
              <div className="space-y-3">
                {volunteers.length === 0 ? (
                  <div className="bg-white border border-[#e5e7eb] rounded-2xl p-10 text-center text-[#555]">No volunteer applications.</div>
                ) : volunteers.map((v) => {
                  const id = v.id;
                  const person = v.person;
                  return (
                    <div key={id} className="bg-white border border-[#e5e7eb] rounded-2xl p-5 flex items-center gap-5">
                      {/* Photo */}
                      <div className="w-14 h-14 rounded-full bg-[#ffffff] border border-[#e5e7eb] flex items-center justify-center shrink-0 overflow-hidden">
                        {person?.profilePhoto ? (
                          <img src={person.profilePhoto} alt={person.firstName} className="w-full h-full object-cover" />
                        ) : (
                          <User size={22} className="text-[#444]" />
                        )}
                      </div>
                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="font-semibold text-[#1a1a1a] truncate">{person?.firstName} {person?.lastName}</p>
                        <p className="text-xs text-[#666] mt-0.5">{person?.email || "—"} {person?.phone ? `· ${person.phone}` : ""}</p>
                        {person?.bio && <p className="text-xs text-[#555] mt-1"><strong className="font-medium text-[#1a1a1a]">Biography:</strong> {person.bio}</p>}
                        {v.notes && <p className="text-xs text-[#888] italic">&ldquo;{v.notes}&rdquo;</p>}
                      </div>
                      {/* Status */}
                      <span className={`text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shrink-0 ${STATUS_STYLES[v.status?.toUpperCase()] || STATUS_STYLES.PENDING}`}>
                        {v.status || "PENDING"}
                      </span>
                      {/* Actions */}
                      <div className="flex gap-2 shrink-0">
                        {v.status !== "confirmed" && (
                          <button
                            onClick={() => updateParticipantStatus(v, "confirmed")}
                            disabled={actionLoading === id}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-green-900/40 hover:bg-green-800/60 text-green-400 text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-40"
                          >
                            <CheckCircle size={13} /> Approve
                          </button>
                        )}
                        {v.status !== "rejected" && (
                          <button
                            onClick={() => updateParticipantStatus(v, "rejected")}
                            disabled={actionLoading === id}
                            className="flex items-center gap-1.5 px-3 py-1.5 bg-red-900/40 hover:bg-red-800/60 text-red-400 text-xs font-semibold rounded-lg transition-colors cursor-pointer disabled:opacity-40"
                          >
                            <XCircle size={13} /> Reject
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setEditingParticipant(v);
                            setVolunteerForm({
                              firstName: person?.firstName || "",
                              lastName: person?.lastName || "",
                              email: person?.email || "",
                              phone: person?.phone || "",
                              bio: person?.bio || "",
                              photoUrl: person?.profilePhoto || "",
                              status: v.status || "pending",
                              notes: v.notes || ""
                            });
                            volunteerFormRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                          }}
                          className="p-1.5 text-[#555] hover:bg-stone-200 rounded-lg transition-colors cursor-pointer"
                        >
                          <Pencil size={13} />
                        </button>
                        <button
                          onClick={() => deleteParticipant(id)}
                          className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                        >
                          <Trash2 size={13} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Add Volunteer Form */}
              <div className="bg-white border border-[#e5e7eb] rounded-3xl p-7">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="font-bold text-sm text-[#1a1a1a]">{editingParticipant ? "Edit Volunteer Info" : "Add Volunteer"}</h3>
                  {editingParticipant && (
                    <button type="button" onClick={() => { setEditingParticipant(null); setVolunteerForm({ firstName: "", lastName: "", email: "", phone: "", bio: "", photoUrl: "", status: "pending", notes: "" }); }} className="text-xs text-[#888] hover:text-[#1a1a1a] cursor-pointer underline">Cancel edit</button>
                  )}
                </div>
                <form ref={volunteerFormRef} onSubmit={saveVolunteer} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className={label}>First Name *</label><input required placeholder="Jane" value={volunteerForm.firstName} onChange={e => setVolunteerForm(f => ({ ...f, firstName: e.target.value }))} className={inp} /></div>
                    <div><label className={label}>Last Name</label><input placeholder="Doe" value={volunteerForm.lastName} onChange={e => setVolunteerForm(f => ({ ...f, lastName: e.target.value }))} className={inp} /></div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div><label className={label}>Email *</label><input required type="email" placeholder="jane@example.com" value={volunteerForm.email} onChange={e => setVolunteerForm(f => ({ ...f, email: e.target.value }))} className={inp} /></div>
                    <div><label className={label}>Phone</label><input placeholder="+237..." value={volunteerForm.phone} onChange={e => setVolunteerForm(f => ({ ...f, phone: e.target.value }))} className={inp} /></div>
                  </div>
                  <div>
                    <label className={label}>Biography / Skills</label>
                    <textarea placeholder="Experience with events, first-aid, etc..." value={volunteerForm.bio} onChange={e => setVolunteerForm(f => ({ ...f, bio: e.target.value }))} rows={2} className={inp + " resize-none"} />
                  </div>
                  <div>
                    <label className={label}>Application Notes</label>
                    <textarea placeholder="Shift preferences, notes..." value={volunteerForm.notes} onChange={e => setVolunteerForm(f => ({ ...f, notes: e.target.value }))} rows={2} className={inp + " resize-none"} />
                  </div>
                  <MediaUploadField
                    fieldLabel="Profile Photo"
                    value={volunteerForm.photoUrl}
                    uploading={uploadingField === "volunteerPhoto"}
                    onUploading={(v) => setUploadingField(v ? "volunteerPhoto" : null)}
                    onChange={(url) => setVolunteerForm(f => ({ ...f, photoUrl: url }))}
                    onError={(msg) => showToast("error", msg)}
                    round
                  />

                  <button type="submit" disabled={saving || uploadingField !== null} className={saveBtn}>
                    <Save size={13} /> {editingParticipant ? (saving ? "Saving..." : "Save Volunteer") : (saving ? "Adding..." : "Add Volunteer")}
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
