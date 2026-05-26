"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { getStoredAuth } from "@/app/utils/api";
import { eventService } from "@/app/utils/services/eventService";
import { authService } from "@/app/utils/services/authService";
import { LogOut, Ticket, Calendar, Settings } from "lucide-react";
import { useRouter } from "next/navigation";

export default function AttendeeDashboard() {
  const router = useRouter();
  const [userName, setUserName] = useState("Attendee");
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);
  const [upgradeForm, setUpgradeForm] = useState({ workspaceName: "", type: "INDIVIDUAL" });
  const [upgradeLoading, setUpgradeLoading] = useState(false);
  const [upgradeError, setUpgradeError] = useState("");
  
  const [activeTab, setActiveTab] = useState("overview"); // overview, tickets, saved, settings
  const [profileForm, setProfileForm] = useState({ firstName: "", lastName: "", phone: "", email: "", avatar: "" });
  const [profileLoading, setProfileLoading] = useState(false);
  const [profileMsg, setProfileMsg] = useState({ type: "", text: "" });

  const [myTickets, setMyTickets] = useState<any[]>([]);
  const [ticketsLoading, setTicketsLoading] = useState(true);

  const [savedEvents, setSavedEvents] = useState<any[]>([]);
  const [savedEventsLoading, setSavedEventsLoading] = useState(true);

  useEffect(() => {
    const auth = getStoredAuth();
    if (!auth) {
      router.push("/login");
    } else {
      setUserName(auth.email?.split("@")[0] || "Attendee");
      fetchProfile(auth.userId);
      fetchTickets(auth.userId);
      fetchSavedEvents(auth.userId);
    }
  }, [router]);

  const fetchTickets = async (userId: string) => {
    setTicketsLoading(true);
    try {
      const orders = await eventService.getOrdersByUser(userId);
      // Fetch details for each event and tenant
      const enrichedOrders = await Promise.all((orders || []).map(async (order) => {
        let eventData = { title: "Unknown Event", date: "Unknown Date" };
        let tenantData = { name: "Unknown Organizer" };
        
        try { if (order.eventId) { const ev: any = await eventService.getEventById(order.eventId); eventData = { title: ev.title, date: new Date(ev.startDate).toLocaleDateString() }; } } catch(e) {}
        try { if (order.tenantId) { const tn: any = await authService.getTenantById(order.tenantId); tenantData = { name: tn.name }; } } catch(e) {}
        
        return { ...order, eventTitle: eventData.title, eventDate: eventData.date, organizerName: tenantData.name };
      }));
      setMyTickets(enrichedOrders);
    } catch (e) {
      console.error("Failed to fetch tickets", e);
    } finally {
      setTicketsLoading(false);
    }
  };

  const fetchSavedEvents = async (userId: string) => {
    setSavedEventsLoading(true);
    try {
      const saved = await eventService.getSavedEventsByUser(userId);
      const enrichedSaved = await Promise.all((saved || []).map(async (item) => {
        let eventData = { date: "Unknown Date", imageUrl: "" };
        let tenantData = { name: "Unknown Organizer" };
        try { if (item.eventId) { const ev: any = await eventService.getEventById(item.eventId); eventData = { date: new Date(ev.startDate).toLocaleDateString(), imageUrl: ev.imageUrl }; } } catch(e) {}
        try { if (item.tenantId) { const tn: any = await authService.getTenantById(item.tenantId); tenantData = { name: tn.name }; } } catch(e) {}
        return { ...item, eventDate: eventData.date, imageUrl: eventData.imageUrl, organizerName: tenantData.name };
      }));
      setSavedEvents(enrichedSaved);
    } catch (e) {
      console.error("Failed to fetch saved events", e);
    } finally {
      setSavedEventsLoading(false);
    }
  };

  const handleUnsave = async (savedEventId: string) => {
    try {
      await eventService.unsaveEvent(savedEventId);
      setSavedEvents(prev => prev.filter(e => e.id !== savedEventId));
    } catch(e) {
      console.error("Failed to unsave event", e);
    }
  };

  const fetchProfile = async (userId: string) => {
    try {
      const res: any = await authService.getUserById(userId);
      setProfileForm({ 
        firstName: res.firstName || "", 
        lastName: res.lastName || "", 
        phone: res.phone || "", 
        email: res.email || "",
        avatar: res.avatar || ""
      });
      if (res.firstName) setUserName(res.firstName);
    } catch (e) {
      console.error("Failed to fetch profile", e);
    }
  };

  const handleProfileUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setProfileLoading(true);
    setProfileMsg({ type: "", text: "" });
    try {
      const auth = getStoredAuth();
      if (!auth) throw new Error("Not logged in");
      
      const payload: any = { ...profileForm };
      // Delete email from payload so it doesn't get overwritten or throw error
      delete payload.email;

      await authService.updateUser(auth.userId, payload);
      setProfileMsg({ type: "success", text: "Profile updated successfully!" });
      setUserName(profileForm.firstName);
    } catch (err: any) {
      setProfileMsg({ type: "error", text: err.message });
    } finally {
      setProfileLoading(false);
    }
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      setProfileMsg({ type: "", text: "" });
      const auth = getStoredAuth();
      if (!auth) return;
      
      // We assume authService.uploadUserAvatar returns { url: "..." } or similar
      const res: any = await authService.uploadUserAvatar(auth.userId, file);
      // Backend might return { avatarUrl: string } or { url: string } or just the string
      const newAvatar = res.avatarUrl || res.url || res.avatar || (typeof res === 'string' ? res : "");
      
      setProfileForm(prev => ({ ...prev, avatar: newAvatar }));
      setProfileMsg({ type: "success", text: "Avatar uploaded successfully!" });
    } catch (err: any) {
      setProfileMsg({ type: "error", text: err.message || "Failed to upload avatar" });
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("yoevent_auth");
    router.push("/login");
  };

  const handleUpgrade = async (e: React.FormEvent) => {
    e.preventDefault();
    setUpgradeError("");
    if (!upgradeForm.workspaceName.trim()) {
      setUpgradeError("Workspace name is required");
      return;
    }
    setUpgradeLoading(true);
    try {
      const auth = getStoredAuth();
      if (!auth) throw new Error("Not authenticated");
      
      const data = await authService.upgradeToOrganizer({
        userId: auth.userId,
        workspaceName: upgradeForm.workspaceName,
        type: upgradeForm.type
      });
      
      localStorage.setItem("ye_token", data.token || "");
      localStorage.setItem("ye_userId", data.userId || "");
      localStorage.setItem("ye_tenantId", data.tenantId || "");
      localStorage.setItem("ye_email", data.email || "");
      router.push("/admin");
    } catch (err: any) {
      setUpgradeError(err.message || "An error occurred");
    } finally {
      setUpgradeLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f0e8] flex flex-col">
      <nav className="flex items-center justify-between px-10 py-5 bg-white border-b border-[#e0d8c8]">
        <Link href="/" className="font-display text-2xl font-black tracking-tight text-[#1a1a1a]">
          Yo<span className="text-[#8a7d5a]">Event</span>
        </Link>
        <button
          onClick={handleLogout}
          className="text-sm font-semibold text-[#555] hover:text-[#1a1a1a] flex items-center gap-2 transition-colors cursor-pointer"
        >
          <LogOut size={16} /> Logout
        </button>
      </nav>

      <main className="flex-1 max-w-5xl w-full mx-auto p-10">
        <header className="mb-10 flex items-center justify-between">
          <div>
            <h1 className="font-display text-3xl font-bold tracking-tight text-[#1a1a1a] mb-2">
              Welcome back, {userName}!
            </h1>
            <p className="text-[#666] text-sm">Manage your tickets, saved events, and profile preferences.</p>
          </div>
          {activeTab !== "overview" && (
            <button 
              onClick={() => setActiveTab("overview")}
              className="px-4 py-2 bg-white border border-[#e0d8c8] rounded-xl text-sm font-semibold hover:bg-stone-50 transition-colors"
            >
              ← Back to Overview
            </button>
          )}
        </header>

        {activeTab === "overview" && (
          <>
            <div className="grid md:grid-cols-3 gap-6">
              <div onClick={() => setActiveTab("tickets")} className="bg-white rounded-2xl border border-[#e0d8c8] p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
                <div className="w-12 h-12 bg-stone-100 rounded-xl flex items-center justify-center text-[#1a1a1a] mb-4 group-hover:scale-110 transition-transform">
                  <Ticket size={24} />
                </div>
                <h3 className="font-bold text-[#1a1a1a] mb-1">My Tickets</h3>
                <p className="text-sm text-[#888]">View and download your purchased tickets.</p>
              </div>

              <div onClick={() => setActiveTab("saved")} className="bg-white rounded-2xl border border-[#e0d8c8] p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
                <div className="w-12 h-12 bg-stone-100 rounded-xl flex items-center justify-center text-[#1a1a1a] mb-4 group-hover:scale-110 transition-transform">
                  <Calendar size={24} />
                </div>
                <h3 className="font-bold text-[#1a1a1a] mb-1">Saved Events</h3>
                <p className="text-sm text-[#888]">Events you have bookmarked for later.</p>
              </div>

              <div onClick={() => setActiveTab("settings")} className="bg-white rounded-2xl border border-[#e0d8c8] p-6 shadow-sm hover:shadow-md transition-shadow cursor-pointer group">
                <div className="w-12 h-12 bg-stone-100 rounded-xl flex items-center justify-center text-[#1a1a1a] mb-4 group-hover:scale-110 transition-transform">
                  <Settings size={24} />
                </div>
                <h3 className="font-bold text-[#1a1a1a] mb-1">Profile Settings</h3>
                <p className="text-sm text-[#888]">Manage your account details and preferences.</p>
              </div>
            </div>

            <div className="mt-12 bg-[#1a1a1a] rounded-2xl p-8 text-white flex flex-col md:flex-row items-center justify-between">
              <div>
                <h3 className="font-display font-bold text-xl mb-2 text-[#d4c9a8]">Ready to host your own events?</h3>
                <p className="text-sm text-[#aaa] max-w-lg">
                  Upgrade to an Organizer account to start creating and managing your own events, selling tickets, and accessing analytics.
                </p>
              </div>
              <button 
                onClick={() => setShowUpgradeModal(true)}
                className="mt-6 md:mt-0 px-6 py-3 bg-[#d4c9a8] hover:bg-[#c8bb96] text-[#1a1a1a] font-bold rounded-xl transition-colors cursor-pointer whitespace-nowrap"
              >
                Upgrade to Organizer
              </button>
            </div>
          </>
        )}

        {activeTab === "settings" && (
          <div className="bg-white rounded-2xl border border-[#e0d8c8] p-8 max-w-2xl">
            <h2 className="font-display text-2xl font-bold mb-6 text-[#1a1a1a]">Profile Settings</h2>
            
            {profileMsg.text && (
              <div className={`p-4 rounded-xl mb-6 text-sm ${profileMsg.type === 'success' ? 'bg-green-50 text-green-700 border border-green-200' : 'bg-red-50 text-red-700 border border-red-200'}`}>
                {profileMsg.text}
              </div>
            )}

            <div className="mb-8 flex items-center gap-6">
              {profileForm.avatar ? (
                <img src={profileForm.avatar} alt="Avatar" className="w-20 h-20 rounded-full object-cover border-2 border-[#e0d8c8]" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-[#f5f0e8] flex items-center justify-center text-[#888] font-bold text-2xl border-2 border-[#e0d8c8]">
                  {profileForm.firstName?.charAt(0) || "U"}
                </div>
              )}
              <div>
                <label className="block text-sm font-semibold text-[#1a1a1a] mb-2 cursor-pointer bg-stone-100 hover:bg-stone-200 px-4 py-2 rounded-lg transition-colors border border-stone-200 text-center">
                  Upload New Avatar
                  <input type="file" className="hidden" accept="image/*" onChange={handleAvatarChange} />
                </label>
                <p className="text-xs text-[#888]">Recommended: Square image, max 2MB.</p>
              </div>
            </div>

            <form onSubmit={handleProfileUpdate} className="space-y-5">
              <div className="grid md:grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-[#555] uppercase tracking-wider mb-2">First Name</label>
                  <input 
                    value={profileForm.firstName}
                    onChange={e => setProfileForm({...profileForm, firstName: e.target.value})}
                    className="w-full px-4 py-3 border-[1.5px] rounded-xl text-sm bg-[#f5f0e8] outline-none border-[#e0d8c8] focus:bg-white focus:border-[#8a7d5a]" 
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#555] uppercase tracking-wider mb-2">Last Name</label>
                  <input 
                    value={profileForm.lastName}
                    onChange={e => setProfileForm({...profileForm, lastName: e.target.value})}
                    className="w-full px-4 py-3 border-[1.5px] rounded-xl text-sm bg-[#f5f0e8] outline-none border-[#e0d8c8] focus:bg-white focus:border-[#8a7d5a]" 
                    required
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-[#555] uppercase tracking-wider mb-2">Email Address</label>
                <input 
                  value={profileForm.email}
                  disabled
                  className="w-full px-4 py-3 border-[1.5px] rounded-xl text-sm bg-stone-100 outline-none border-stone-200 text-stone-500 cursor-not-allowed" 
                />
                <p className="text-xs text-[#888] mt-1.5">Email address cannot be changed.</p>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#555] uppercase tracking-wider mb-2">Phone Number</label>
                <input 
                  value={profileForm.phone}
                  onChange={e => setProfileForm({...profileForm, phone: e.target.value})}
                  className="w-full px-4 py-3 border-[1.5px] rounded-xl text-sm bg-[#f5f0e8] outline-none border-[#e0d8c8] focus:bg-white focus:border-[#8a7d5a]" 
                />
              </div>

              <button 
                type="submit" 
                disabled={profileLoading}
                className="px-6 py-3 mt-4 bg-[#1a1a1a] text-white rounded-xl text-sm font-medium hover:bg-[#333] transition-all disabled:opacity-60"
              >
                {profileLoading ? "Saving Changes..." : "Save Changes"}
              </button>
            </form>
          </div>
        )}

        {activeTab === "tickets" && (
          <div className="bg-white rounded-2xl border border-[#e0d8c8] p-8 min-h-[400px]">
            <h2 className="font-display text-2xl font-bold mb-6 text-[#1a1a1a]">My Tickets</h2>
            {ticketsLoading ? (
              <div className="flex flex-col items-center justify-center h-48 text-[#888]">
                <div className="w-8 h-8 border-4 border-stone-200 border-t-[#d4c9a8] rounded-full animate-spin mb-4" />
                Loading your tickets...
              </div>
            ) : myTickets.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-[#888] text-center">
                <Ticket size={48} className="text-[#d4c9a8] mb-4" />
                <p className="max-w-sm">You haven't purchased any tickets yet. Explore events and book your spot!</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {myTickets.map((ticket, i) => (
                  <div key={i} className="flex flex-col md:flex-row md:items-center justify-between p-5 border border-[#e0d8c8] rounded-xl hover:border-[#8a7d5a] transition-colors bg-[#f5f0e8]/30">
                    <div className="flex items-start gap-4 mb-4 md:mb-0">
                      <div className="w-12 h-12 rounded-lg bg-[#d4c9a8]/20 flex items-center justify-center text-[#8a7d5a] flex-shrink-0">
                        <Calendar size={20} />
                      </div>
                      <div>
                        <h3 className="font-bold text-[#1a1a1a] text-lg">{ticket.eventTitle}</h3>
                        <p className="text-sm text-[#666] flex items-center gap-2 mt-1">
                          <span className="font-medium text-[#8a7d5a] bg-[#8a7d5a]/10 px-2 py-0.5 rounded">By: {ticket.organizerName}</span>
                          <span>•</span>
                          {ticket.eventDate}
                        </p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end md:items-end gap-2">
                      <span className={`px-3 py-1 text-xs font-bold rounded-md ${ticket.status === 'COMPLETED' || ticket.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-stone-200 text-stone-600'}`}>
                        {ticket.status || 'ACTIVE'}
                      </span>
                      <p className="text-sm font-semibold text-[#1a1a1a]">Order #{ticket.orderId?.substring(0, 8)}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === "saved" && (
          <div className="bg-white rounded-2xl border border-[#e0d8c8] p-8 min-h-[400px]">
            <h2 className="font-display text-2xl font-bold mb-6 text-[#1a1a1a]">Saved Events</h2>
            {savedEventsLoading ? (
              <div className="flex flex-col items-center justify-center h-48 text-[#888]">
                <div className="w-8 h-8 border-4 border-stone-200 border-t-[#d4c9a8] rounded-full animate-spin mb-4" />
                Loading your saved events...
              </div>
            ) : savedEvents.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-[#888] text-center">
                <Calendar size={48} className="text-[#d4c9a8] mb-4" />
                <p className="max-w-sm">You haven't bookmarked any events. Save events you are interested in to find them easily later.</p>
              </div>
            ) : (
              <div className="grid gap-4">
                {savedEvents.map((ev, i) => (
                  <div key={i} className="flex flex-col md:flex-row md:items-center justify-between p-5 border border-[#e0d8c8] rounded-xl hover:border-[#8a7d5a] transition-colors bg-white">
                    <div className="flex items-start gap-4 mb-4 md:mb-0">
                      {ev.imageUrl ? (
                        <img src={ev.imageUrl} alt={ev.eventTitle} className="w-16 h-16 rounded-xl object-cover" />
                      ) : (
                        <div className="w-16 h-16 rounded-xl bg-stone-100 flex items-center justify-center text-stone-400">
                          <Calendar size={24} />
                        </div>
                      )}
                      <div>
                        <h3 className="font-bold text-[#1a1a1a] text-lg hover:text-[#8a7d5a] transition-colors cursor-pointer">
                          <Link href={`/events/${ev.eventId}`}>{ev.eventTitle}</Link>
                        </h3>
                        <p className="text-sm text-[#666] flex items-center gap-2 mt-1">
                          <span className="font-medium text-[#8a7d5a]">{ev.organizerName}</span>
                          <span>•</span>
                          {ev.eventDate}
                        </p>
                      </div>
                    </div>
                    <button 
                      onClick={() => handleUnsave(ev.id)}
                      className="px-4 py-2 text-sm font-semibold text-red-600 bg-red-50 hover:bg-red-100 rounded-lg transition-colors whitespace-nowrap"
                    >
                      Unsave Event
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>

      {showUpgradeModal && (
        <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl w-full max-w-md p-8 shadow-2xl relative">
            <button 
              onClick={() => setShowUpgradeModal(false)}
              className="absolute top-6 right-6 text-[#888] hover:text-[#1a1a1a]"
            >
              ✕
            </button>
            <h2 className="font-display text-2xl font-bold tracking-tight mb-2">Upgrade Account</h2>
            <p className="text-sm text-[#666] mb-6">Create your workspace to start hosting events.</p>
            
            {upgradeError && (
              <div className="bg-red-50 text-red-600 text-sm p-3 rounded-lg border border-red-200 mb-4">
                ⚠️ {upgradeError}
              </div>
            )}

            <form onSubmit={handleUpgrade} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-[#555] uppercase tracking-wider mb-1.5">Account Type</label>
                <div className="flex bg-[#f5f0e8] rounded-xl p-1 border border-[#e0d8c8]">
                  <button
                    type="button"
                    onClick={() => setUpgradeForm(f => ({...f, type: "INDIVIDUAL"}))}
                    className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${upgradeForm.type === "INDIVIDUAL" ? "bg-[#1a1a1a] text-white" : "text-[#555]"}`}
                  >
                    Individual
                  </button>
                  <button
                    type="button"
                    onClick={() => setUpgradeForm(f => ({...f, type: "ORGANIZATION"}))}
                    className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-all ${upgradeForm.type === "ORGANIZATION" ? "bg-[#1a1a1a] text-white" : "text-[#555]"}`}
                  >
                    Organization
                  </button>
                </div>
              </div>
              
              <div>
                <label className="block text-xs font-semibold text-[#555] uppercase tracking-wider mb-1.5">
                  {upgradeForm.type === "INDIVIDUAL" ? "Display Name" : "Organization Name"}
                </label>
                <input 
                  value={upgradeForm.workspaceName}
                  onChange={(e) => setUpgradeForm(f => ({...f, workspaceName: e.target.value}))}
                  placeholder={upgradeForm.type === "INDIVIDUAL" ? "e.g. Jane Doe" : "e.g. Acme Events"}
                  className="w-full px-4 py-2.5 border-[1.5px] rounded-xl text-sm bg-[#f5f0e8] outline-none border-[#e0d8c8] focus:bg-white focus:border-[#8a7d5a]" 
                  required
                />
              </div>

              <button 
                type="submit" 
                disabled={upgradeLoading}
                className="w-full py-3.5 mt-2 bg-[#1a1a1a] text-white rounded-full text-sm font-medium hover:bg-[#333] transition-all disabled:opacity-60"
              >
                {upgradeLoading ? "Upgrading..." : "Confirm & Upgrade"}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
