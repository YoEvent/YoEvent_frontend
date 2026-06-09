"use client";
import { useState, useEffect } from "react";
import Sidebar from "@/components/Sidebar";
import { Plus, Calendar, MapPin, Grid, Layers } from "lucide-react";
import { getStoredAuth } from "@/app/utils/api";
import { eventService } from "@/app/utils/services/eventService";

export default function EventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("");
  const [categories, setCategories] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);

  // Forms
  const [eventForm, setEventForm] = useState({
    title: "",
    description: "",
    status: "DRAFT",
    currency: "XAF",
    coverImage: "",
    startDate: new Date().toISOString().slice(0, 16),
    endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
  });

  const [categoryForm, setCategoryForm] = useState({
    name: "",
    description: "",
  });

  const [locationForm, setLocationForm] = useState({
    venueName: "",
    address: "",
    city: "",
    country: "",
    isVirtual: false,
    virtualPlatform: "",
    virtualLink: "",
    latitude: 0,
    longitude: 0,
  });

  const fetchData = async () => {
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

  const fetchEventConfig = async (eventId: string) => {
    if (!eventId) return;
    try {
      const [cats, locs] = await Promise.all([
        eventService.getEventCategories(),
        eventService.getEventLocations(),
      ]);

      setCategories(cats || []);
      setLocations((locs || []).filter((l: any) => l.eventId === eventId));
    } catch (err) {
      console.error("Failed to load event config:", err);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      fetchEventConfig(selectedEventId);
    }
  }, [selectedEventId]);

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    const auth = getStoredAuth();
    if (!auth) {
      alert("You must be logged in.");
      return;
    }
    if (!eventForm.title) {
      alert("Event title is required.");
      return;
    }
    try {
      // Step 1: Create the base Event
      const eventResponse = await eventService.createEvent({
        tenantId: auth.tenantId,
        creatorId: auth.userId,
        title: eventForm.title,
        description: eventForm.description,
        status: eventForm.status,
        currency: eventForm.currency,
        coverImage: eventForm.coverImage || undefined,
      });

      const newEventId = (eventResponse as any).eventId || (eventResponse as any).id;

      if (!newEventId) {
        throw new Error("Failed to retrieve event ID from response");
      }

      // Step 2: Create the Event Schedule
      try {
        await eventService.createEventSchedule({
          eventId: newEventId,
          startDatetime: new Date(eventForm.startDate).toISOString(),
          endDatetime: new Date(eventForm.endDate).toISOString(),
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        });
      } catch (scheduleErr: any) {
        // Rollback: delete the event if schedule fails
        await eventService.deleteEvent(newEventId).catch((e) => console.error("Rollback failed:", e));
        throw new Error("Failed to create event schedule. Event creation rolled back. " + (scheduleErr.message || scheduleErr));
      }

      setEventForm({
        title: "",
        description: "",
        status: "DRAFT",
        currency: "XAF",
        coverImage: "",
        startDate: new Date().toISOString().slice(0, 16),
        endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 16),
      });
      await fetchData();
      setSelectedEventId(newEventId);
      alert("Event created successfully!");
    } catch (err: any) {
      console.error("Failed to create event:", err);
      alert("Failed to create event: " + (err.message || err));
    }
  };

  const handleAddCategory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId) {
      alert("Please select an event first.");
      return;
    }
    if (!categoryForm.name) {
      alert("Category name is required.");
      return;
    }
    try {
      const auth = getStoredAuth();
      await eventService.createEventCategory({
        tenantId: auth?.tenantId,
        name: categoryForm.name,
        description: categoryForm.description,
      });
      setCategoryForm({ name: "", description: "" });
      fetchEventConfig(selectedEventId);
      alert("Category added successfully!");
    } catch (err: any) {
      console.error("Failed to add category:", err);
      alert("Failed to add category: " + (err.message || err));
    }
  };

  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEventId) {
      alert("Please select an event first.");
      return;
    }
    if (!locationForm.venueName && !locationForm.isVirtual) {
      alert("Venue name is required for physical locations.");
      return;
    }
    try {
      await eventService.createEventLocation({
        eventId: selectedEventId,
        type: locationForm.isVirtual ? "VIRTUAL" : "VENUE",
        venueName: locationForm.venueName,
        address: locationForm.address,
        city: locationForm.city,
        country: locationForm.country,
        latitude: locationForm.latitude || 0,
        longitude: locationForm.longitude || 0,
        virtualPlatform: locationForm.virtualPlatform,
        virtualLink: locationForm.virtualLink,
      });
      setLocationForm({ 
        venueName: "", address: "", city: "", country: "", 
        isVirtual: false, virtualPlatform: "", virtualLink: "", latitude: 0, longitude: 0 
      });
      fetchEventConfig(selectedEventId);
      alert("Location added successfully!");
    } catch (err: any) {
      console.error("Failed to add location:", err);
      alert("Failed to add location: " + (err.message || err));
    }
  };

  const activeEvent = events.find((e) => e.eventId === selectedEventId || e.id === selectedEventId);

  return (
    <div className="flex bg-[#111] min-h-screen text-[#e0e0e0]">
      <Sidebar />
      <div className="ml-[220px] flex-1 flex flex-col">
        <header className="h-[60px] bg-[#161616] border-b border-[#222] flex items-center justify-between px-8 sticky top-0 z-40">
          <h1 className="font-display text-xl font-bold text-white">Event Hub</h1>
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
          {/* CREATE EVENT */}
          <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl p-6">
            <h2 className="font-display font-bold text-white mb-5 flex items-center gap-2">
              <Calendar size={18} className="text-[#d4c9a8]" /> Create New Event
            </h2>
            <form onSubmit={handleCreateEvent} className="grid grid-cols-4 gap-4 items-end">
              <div className="col-span-2">
                <label className="block text-[10px] font-medium text-[#555] uppercase tracking-wider mb-1.5">Event Title</label>
                <input
                  placeholder="Event Title"
                  value={eventForm.title}
                  onChange={(e) => setEventForm({ ...eventForm, title: e.target.value })}
                  className="w-full bg-[#252525] border border-[#333] rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-[#555] outline-none focus:border-[#d4c9a8]"
                  required
                />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] font-medium text-[#555] uppercase tracking-wider mb-1.5">Description</label>
                <input
                  placeholder="Event Description (optional)"
                  value={eventForm.description}
                  onChange={(e) => setEventForm({ ...eventForm, description: e.target.value })}
                  className="w-full bg-[#252525] border border-[#333] rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-[#555] outline-none focus:border-[#d4c9a8]"
                />
              </div>
              <div className="col-span-1">
                <label className="block text-[10px] font-medium text-[#555] uppercase tracking-wider mb-1.5">Start Date & Time</label>
                <input
                  type="datetime-local"
                  value={eventForm.startDate}
                  onChange={(e) => setEventForm({ ...eventForm, startDate: e.target.value })}
                  className="w-full bg-[#252525] border border-[#333] rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-[#d4c9a8]"
                  required
                />
              </div>
              <div className="col-span-1">
                <label className="block text-[10px] font-medium text-[#555] uppercase tracking-wider mb-1.5">End Date & Time</label>
                <input
                  type="datetime-local"
                  value={eventForm.endDate}
                  onChange={(e) => setEventForm({ ...eventForm, endDate: e.target.value })}
                  className="w-full bg-[#252525] border border-[#333] rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-[#d4c9a8]"
                  required
                />
              </div>
              <div className="col-span-2">
                <label className="block text-[10px] font-medium text-[#555] uppercase tracking-wider mb-1.5">Cover Image URL</label>
                <input
                  type="url"
                  placeholder="https://example.com/image.jpg"
                  value={eventForm.coverImage}
                  onChange={(e) => setEventForm({ ...eventForm, coverImage: e.target.value })}
                  className="w-full bg-[#252525] border border-[#333] rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-[#555] outline-none focus:border-[#d4c9a8]"
                />
              </div>
              <div className="col-span-1">
                <label className="block text-[10px] font-medium text-[#555] uppercase tracking-wider mb-1.5">Status</label>
                <select
                  value={eventForm.status}
                  onChange={(e) => setEventForm({ ...eventForm, status: e.target.value })}
                  className="w-full bg-[#252525] border border-[#333] rounded-xl px-4 py-2.5 text-xs text-white outline-none focus:border-[#d4c9a8]"
                >
                  <option value="DRAFT">Draft</option>
                  <option value="PUBLISHED">Published</option>
                </select>
              </div>
              <div className="col-span-1">
                <label className="block text-[10px] font-medium text-[#555] uppercase tracking-wider mb-1.5">&nbsp;</label>
                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#d4c9a8] hover:bg-[#c8bb96] text-[#1a1a1a] text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus size={14} /> Create Event
                </button>
              </div>
            </form>
          </div>

          <div className="grid grid-cols-2 gap-8">
            {/* CATEGORIES */}
            <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl p-6">
              <h2 className="font-display font-bold text-white mb-5 flex items-center gap-2">
                <Layers size={18} className="text-[#d4c9a8]" /> Global Event Categories <span className="text-xs font-normal text-[#666] ml-2 mt-1">(applies to all events)</span>
              </h2>
              <form onSubmit={handleAddCategory} className="space-y-4 mb-6">
                <input
                  placeholder="Category Name"
                  value={categoryForm.name}
                  onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })}
                  className="w-full bg-[#252525] border border-[#333] rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-[#555] outline-none"
                  required
                />
                <input
                  placeholder="Description"
                  value={categoryForm.description}
                  onChange={(e) => setCategoryForm({ ...categoryForm, description: e.target.value })}
                  className="w-full bg-[#252525] border border-[#333] rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-[#555] outline-none"
                />
                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#d4c9a8] hover:bg-[#c8bb96] text-[#1a1a1a] text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus size={14} /> Add Category
                </button>
              </form>

              <div className="space-y-3">
                {categories.map((c) => (
                  <div key={c.categoryId} className="p-3.5 bg-[#161616] border border-[#2a2a2a] rounded-xl">
                    <div className="text-xs font-bold text-white">{c.name}</div>
                    <div className="text-[10px] text-[#555] mt-0.5">{c.description || "No description"}</div>
                  </div>
                ))}
                {categories.length === 0 && (
                  <div className="text-center text-xs text-[#555] py-4">No categories added yet.</div>
                )}
              </div>
            </div>

            {/* LOCATIONS */}
            <div className="bg-[#1e1e1e] border border-[#2a2a2a] rounded-2xl p-6">
              <h2 className="font-display font-bold text-white mb-5 flex items-center gap-2">
                <MapPin size={18} className="text-[#d4c9a8]" /> Event Locations <span className="text-xs font-normal text-[#666] ml-2 mt-1">(for {activeEvent?.title || "selected event"})</span>
              </h2>
              <form onSubmit={handleAddLocation} className="space-y-4 mb-6">
                <div className="flex items-center gap-2 mb-2">
                  <label className="text-xs text-white flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={locationForm.isVirtual}
                      onChange={(e) => setLocationForm({ ...locationForm, isVirtual: e.target.checked })}
                      className="rounded border-[#333] bg-[#252525]"
                    />
                    Is Virtual Event?
                  </label>
                </div>

                {!locationForm.isVirtual ? (
                  <>
                    <div className="grid grid-cols-2 gap-4">
                      <input
                        placeholder="Venue Name"
                        value={locationForm.venueName}
                        onChange={(e) => setLocationForm({ ...locationForm, venueName: e.target.value })}
                        className="bg-[#252525] border border-[#333] rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-[#555] outline-none focus:border-[#d4c9a8]"
                        required={!locationForm.isVirtual}
                      />
                      <input
                        placeholder="Address"
                        value={locationForm.address}
                        onChange={(e) => setLocationForm({ ...locationForm, address: e.target.value })}
                        className="bg-[#252525] border border-[#333] rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-[#555] outline-none focus:border-[#d4c9a8]"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <input
                        placeholder="City"
                        value={locationForm.city}
                        onChange={(e) => setLocationForm({ ...locationForm, city: e.target.value })}
                        className="bg-[#252525] border border-[#333] rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-[#555] outline-none focus:border-[#d4c9a8]"
                      />
                      <input
                        placeholder="Country"
                        value={locationForm.country}
                        onChange={(e) => setLocationForm({ ...locationForm, country: e.target.value })}
                        className="bg-[#252525] border border-[#333] rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-[#555] outline-none focus:border-[#d4c9a8]"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <input
                        type="number"
                        placeholder="Latitude"
                        value={locationForm.latitude || ""}
                        onChange={(e) => setLocationForm({ ...locationForm, latitude: Number(e.target.value) })}
                        className="bg-[#252525] border border-[#333] rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-[#555] outline-none focus:border-[#d4c9a8]"
                      />
                      <input
                        type="number"
                        placeholder="Longitude"
                        value={locationForm.longitude || ""}
                        onChange={(e) => setLocationForm({ ...locationForm, longitude: Number(e.target.value) })}
                        className="bg-[#252525] border border-[#333] rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-[#555] outline-none focus:border-[#d4c9a8]"
                      />
                    </div>
                  </>
                ) : (
                  <div className="grid grid-cols-2 gap-4">
                    <input
                      placeholder="Virtual Platform (e.g. Zoom)"
                      value={locationForm.virtualPlatform}
                      onChange={(e) => setLocationForm({ ...locationForm, virtualPlatform: e.target.value })}
                      className="bg-[#252525] border border-[#333] rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-[#555] outline-none focus:border-[#d4c9a8]"
                      required={locationForm.isVirtual}
                    />
                    <input
                      type="url"
                      placeholder="Meeting Link"
                      value={locationForm.virtualLink}
                      onChange={(e) => setLocationForm({ ...locationForm, virtualLink: e.target.value })}
                      className="bg-[#252525] border border-[#333] rounded-xl px-4 py-2.5 text-xs text-white placeholder:text-[#555] outline-none focus:border-[#d4c9a8]"
                      required={locationForm.isVirtual}
                    />
                  </div>
                )}
                <button
                  type="submit"
                  className="w-full py-2.5 bg-[#d4c9a8] hover:bg-[#c8bb96] text-[#1a1a1a] text-xs font-semibold rounded-xl flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Plus size={14} /> Add Location
                </button>
              </form>

              <div className="space-y-3">
                {locations.map((l) => (
                  <div key={l.locationId} className="flex justify-between items-center p-3.5 bg-[#161616] border border-[#2a2a2a] rounded-xl">
                    <div>
                      <div className="flex items-center gap-2">
                        <div className="text-xs font-bold text-white">
                          {l.type === "VIRTUAL" ? `${l.virtualPlatform} (Virtual)` : l.venueName}
                        </div>
                        <span className="text-[9px] px-2 py-0.5 rounded bg-white/5 text-[#888] uppercase">{l.type}</span>
                      </div>
                      <div className="text-[10px] text-[#555] mt-1">
                        {l.type === "VIRTUAL" ? l.virtualLink : `${l.address || ""}, ${l.city || ""} ${l.country || ""}`}
                      </div>
                    </div>
                  </div>
                ))}
                {locations.length === 0 && (
                  <div className="text-center text-xs text-[#555] py-4">No locations added yet.</div>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
