"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import {
  Package, Home, Plus, Trash2, Pencil, MapPin, Calendar, Check, Save,
  Search, ShieldAlert, AlertCircle, Info, ChevronRight, Layers,
  Compass, Hammer, Armchair
} from "lucide-react";
import { getStoredAuth } from "@/app/utils/api";
import { eventService } from "@/app/utils/services/eventService";

type ResourceType = "EQUIPMENT" | "MATERIAL" | "SERVICE" | "UTILITY";
type ResourceStatus = "AVAILABLE" | "RESERVED" | "MAINTENANCE";
type RoomStatus = "AVAILABLE" | "OCCUPIED" | "MAINTENANCE";

interface ResourceItem {
  resourceId?: string;
  id?: string;
  name: string;
  type: string;
  description: string;
  quantity: number;
  status: string;
  eventId: string;
  locationId?: string;
  event?: { title: string };
  location?: { venueName: string };

  category?: string;
  quantityAvailable?: number;
  quantityReserved?: number;
  quantityRemaining?: number;
  unit?: string;
  condition?: string;
  assignedRoomId?: string;
  assignedToStaffId?: string;
  purchaseDate?: string;
  purchaseCost?: number;
  supplier?: string;
  warrantyExpiry?: string;
  lastMaintenance?: string;
  nextMaintenance?: string;
  barcode?: string;
  image?: string;
  notes?: string;
}

interface RoomItem {
  roomId?: string;
  id?: string;
  name: string;
  capacity: number;
  description: string;
  floor: string;
  amenities: string;
  status: string;
  eventId: string;
  locationId?: string;
  event?: { title: string };
  location?: { venueName: string };

  roomNumber?: string;
  roomType?: string;
  accessibilityFeatures?: string;
  assignedSessionId?: string;
  roomManagerId?: string;
}

const inp = "w-full bg-white border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-xs text-[#1a1a1a] placeholder:text-[#aaa] outline-none focus:border-[#FF4747] transition-colors";
const labelStyle = "block text-[10px] font-semibold text-[#888] uppercase tracking-wider mb-1.5";
const saveBtn = "flex items-center gap-2 px-5 py-2.5 bg-[#FF4747] text-white text-xs font-bold rounded-xl hover:bg-[#e03e3e] transition-colors cursor-pointer disabled:opacity-50";

export default function ResourcesPage() {
  const router = useRouter();
  const auth = getStoredAuth();
  
  // Tabs & Filters
  const [activeTab, setActiveTab] = useState<"assets" | "rooms">("assets");
  const [events, setEvents] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [selectedEventId, setSelectedEventId] = useState<string>("ALL");
  const [selectedLocationId, setSelectedLocationId] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  // Loading & State lists
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  
  const [resources, setResources] = useState<ResourceItem[]>([]);
  const [rooms, setRooms] = useState<RoomItem[]>([]);

  // Event specifics for form dropdowns
  const [eventStaff, setEventStaff] = useState<any[]>([]);
  const [eventSessions, setEventSessions] = useState<any[]>([]);
  const [eventRooms, setEventRooms] = useState<any[]>([]);

  // Forms editing states
  const [editingResource, setEditingResource] = useState<ResourceItem | null>(null);
  const [editingRoom, setEditingRoom] = useState<RoomItem | null>(null);

  // Inline additions state
  const [showInlineAddRoom, setShowInlineAddRoom] = useState(false);
  const [inlineRoomName, setInlineRoomName] = useState("");
  
  const [showInlineAddStaff, setShowInlineAddStaff] = useState(false);
  const [showInlineAddStaffForRoom, setShowInlineAddStaffForRoom] = useState(false);
  const [inlineStaffName, setInlineStaffName] = useState("");
  const [inlineStaffEmail, setInlineStaffEmail] = useState("");

  const [showAddCustomType, setShowAddCustomType] = useState(false);
  const [customRoomTypes, setCustomRoomTypes] = useState<string[]>([]);
  const [newCustomType, setNewCustomType] = useState("");

  const [showInlineAddSession, setShowInlineAddSession] = useState(false);
  const [inlineSessionTitle, setInlineSessionTitle] = useState("");
  const [inlineSessionStart, setInlineSessionStart] = useState("");
  const [inlineSessionEnd, setInlineSessionEnd] = useState("");

  // Forms fields state
  const [resourceForm, setResourceForm] = useState({
    name: "",
    type: "EQUIPMENT" as ResourceType,
    quantity: 1,
    status: "AVAILABLE" as ResourceStatus,
    eventId: "",
    locationId: "",
    description: "",

    category: "Audio",
    quantityAvailable: 1,
    quantityReserved: 0,
    unit: "Piece",
    condition: "Good",
    assignedRoomId: "",
    assignedToStaffId: "",
    purchaseDate: "",
    purchaseCost: 0,
    supplier: "",
    warrantyExpiry: "",
    lastMaintenance: "",
    nextMaintenance: "",
    barcode: "",
    image: "",
    notes: ""
  });

  const [roomForm, setRoomForm] = useState({
    name: "",
    capacity: 20,
    floor: "",
    amenities: "",
    status: "AVAILABLE" as RoomStatus,
    eventId: "",
    locationId: "",
    description: "",

    roomNumber: "",
    roomType: "Hall",
    accessibilityFeatures: "",
    assignedSessionId: "",
    roomManagerId: ""
  });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  const loadEventSpecifics = async (evId: string) => {
    if (!evId) return;
    try {
      const [staffList, sessionList, roomList] = await Promise.all([
        eventService.getStaffByEvent(evId).catch(() => []),
        eventService.getSessions().catch(() => []),
        eventService.getRoomsByEvent(evId).catch(() => [])
      ]);
      const filteredSessions = (sessionList || []).filter((s: any) => s.eventId === evId || s.event?.eventId === evId);
      setEventStaff(staffList || []);
      setEventSessions(filteredSessions);
      setEventRooms(roomList || []);
    } catch (e) {
      console.error("Failed to load event specifics", e);
    }
  };

  // Pre-load data
  const loadData = async () => {
    setLoading(true);
    try {
      const [myEvents, allLocations, allResources, allRooms] = await Promise.all([
        eventService.getMyEvents().catch(() => []),
        eventService.getEventLocations().catch(() => []),
        eventService.getEventResources().catch(() => []),
        eventService.getRooms().catch(() => [])
      ]);

      setEvents(myEvents || []);
      setLocations(allLocations || []);
      setResources(allResources || []);
      setRooms(allRooms || []);

      // If user has events, pre-select the first one for the form defaults
      if (myEvents && myEvents.length > 0) {
        const firstEvId = myEvents[0].eventId || myEvents[0].id;
        setResourceForm(f => ({ ...f, eventId: firstEvId }));
        setRoomForm(f => ({ ...f, eventId: firstEvId }));
        loadEventSpecifics(firstEvId);
        
        // Find matching locations for first event
        const matchingLocs = (allLocations || []).filter(
          (l: any) => l.eventId === firstEvId || l.event?.eventId === firstEvId
        );
        if (matchingLocs.length > 0) {
          const firstLocId = matchingLocs[0].locationId;
          setResourceForm(f => ({ ...f, locationId: firstLocId }));
          setRoomForm(f => ({ ...f, locationId: firstLocId }));
        }
      }
    } catch (e) {
      console.error(e);
      showToast("Failed to load initial workspace data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!auth) {
      router.push("/login");
      return;
    }
    loadData();
  }, []);

  // Update locations list in form when event selection changes
  const handleFormEventChange = (eventId: string) => {
    loadEventSpecifics(eventId);
    if (activeTab === "assets") {
      setResourceForm(f => ({ ...f, eventId, locationId: "" }));
      const matchingLocs = locations.filter(l => l.eventId === eventId || l.event?.eventId === eventId);
      if (matchingLocs.length > 0) {
        setResourceForm(f => ({ ...f, eventId, locationId: matchingLocs[0].locationId }));
      }
    } else {
      setRoomForm(f => ({ ...f, eventId, locationId: "" }));
      const matchingLocs = locations.filter(l => l.eventId === eventId || l.event?.eventId === eventId);
      if (matchingLocs.length > 0) {
        setRoomForm(f => ({ ...f, eventId, locationId: matchingLocs[0].locationId }));
      }
    }
  };

  // CRUD Actions - Assets
  const saveResource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resourceForm.name || !resourceForm.eventId) {
      showToast("Please provide asset name and select an event.");
      return;
    }
    setSaving(true);
    
    // Auto-resolve string location value if locationId matches
    const selectedLocObj = locations.find(l => l.locationId === resourceForm.locationId);
    const locationStr = selectedLocObj ? (selectedLocObj.venueName || selectedLocObj.address) : "";

    const payload = {
      eventId: resourceForm.eventId,
      tenantId: auth?.tenantId,
      name: resourceForm.name,
      type: resourceForm.type,
      quantity: Number(resourceForm.quantityAvailable),
      status: resourceForm.status,
      locationId: resourceForm.locationId || undefined,
      location: locationStr,
      description: resourceForm.description,

      category: resourceForm.category || undefined,
      quantityAvailable: Number(resourceForm.quantityAvailable),
      quantityReserved: Number(resourceForm.quantityReserved),
      unit: resourceForm.unit || undefined,
      condition: resourceForm.condition || undefined,
      assignedRoomId: resourceForm.assignedRoomId || undefined,
      assignedToStaffId: resourceForm.assignedToStaffId || undefined,
      purchaseDate: resourceForm.purchaseDate || undefined,
      purchaseCost: resourceForm.purchaseCost ? Number(resourceForm.purchaseCost) : undefined,
      supplier: resourceForm.supplier || undefined,
      warrantyExpiry: resourceForm.warrantyExpiry || undefined,
      lastMaintenance: resourceForm.lastMaintenance || undefined,
      nextMaintenance: resourceForm.nextMaintenance || undefined,
      barcode: resourceForm.barcode || undefined,
      image: resourceForm.image || undefined,
      notes: resourceForm.notes || undefined
    };

    try {
      if (editingResource) {
        await eventService.updateResource(editingResource.resourceId || editingResource.id || "", payload);
        showToast("Asset updated successfully!");
        setEditingResource(null);
      } else {
        await eventService.createResource(payload);
        showToast("Asset added successfully!");
      }
      setResourceForm(f => ({
        ...f,
        name: "",
        quantityAvailable: 1,
        quantityReserved: 0,
        description: "",
        category: "Audio",
        unit: "Piece",
        condition: "Good",
        assignedRoomId: "",
        assignedToStaffId: "",
        purchaseDate: "",
        purchaseCost: 0,
        supplier: "",
        warrantyExpiry: "",
        lastMaintenance: "",
        nextMaintenance: "",
        barcode: "",
        image: "",
        notes: ""
      }));
      // Reload lists
      const freshResources = await eventService.getEventResources().catch(() => []);
      setResources(freshResources);
    } catch (err: any) {
      showToast(err.message || "Failed to save asset.");
    } finally {
      setSaving(false);
    }
  };

  const deleteResource = async (id: string) => {
    if (!confirm("Are you sure you want to delete this asset?")) return;
    try {
      await eventService.deleteResource(id);
      showToast("Asset deleted.");
      setResources(resources.filter(r => r.resourceId !== id && r.id !== id));
    } catch (err: any) {
      showToast(err.message || "Failed to delete asset.");
    }
  };

  // CRUD Actions - Rooms
  const saveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomForm.name || !roomForm.eventId) {
      showToast("Please provide space name and select an event.");
      return;
    }
    setSaving(true);

    const payload = {
      eventId: roomForm.eventId,
      tenantId: auth?.tenantId,
      locationId: roomForm.locationId || undefined,
      name: roomForm.name,
      capacity: Number(roomForm.capacity),
      description: roomForm.description,
      floor: roomForm.floor || undefined,
      amenities: roomForm.amenities || undefined,
      status: roomForm.status,

      roomNumber: roomForm.roomNumber || undefined,
      roomType: roomForm.roomType || undefined,
      accessibilityFeatures: roomForm.accessibilityFeatures || undefined,
      assignedSessionId: roomForm.assignedSessionId || undefined,
      roomManagerId: roomForm.roomManagerId || undefined
    };

    try {
      if (editingRoom) {
        await eventService.updateRoom(editingRoom.roomId || editingRoom.id || "", payload);
        showToast("Space updated successfully!");
        setEditingRoom(null);
      } else {
        await eventService.createRoom(payload);
        showToast("Space added successfully!");
      }
      setRoomForm(f => ({
        ...f,
        name: "",
        capacity: 20,
        floor: "",
        amenities: "",
        description: "",
        roomNumber: "",
        roomType: "Hall",
        accessibilityFeatures: "",
        assignedSessionId: "",
        roomManagerId: ""
      }));
      // Reload lists
      const freshRooms = await eventService.getRooms().catch(() => []);
      setRooms(freshRooms);
    } catch (err: any) {
      showToast(err.message || "Failed to save space.");
    } finally {
      setSaving(false);
    }
  };

  const deleteRoom = async (id: string) => {
    if (!confirm("Are you sure you want to delete this space?")) return;
    try {
      await eventService.deleteRoom(id);
      showToast("Space deleted.");
      setRooms(rooms.filter(r => r.roomId !== id && r.id !== id));
    } catch (err: any) {
      showToast(err.message || "Failed to delete space.");
    }
  };

  const handleInlineAddRoom = async () => {
    const evId = resourceForm.eventId || selectedEventId;
    if (!inlineRoomName.trim() || evId === "ALL" || !evId) {
      showToast("Please enter a room name and select an event.");
      return;
    }
    try {
      const created = await eventService.createRoom({
        eventId: evId,
        tenantId: auth?.tenantId,
        name: inlineRoomName,
        capacity: 30,
        status: "AVAILABLE",
        roomType: "Conference Room"
      });
      showToast("Room created successfully!");
      const roomList = await eventService.getRoomsByEvent(evId).catch(() => []);
      setEventRooms(roomList || []);
      setResourceForm(f => ({ ...f, assignedRoomId: created.roomId || created.id }));
      setInlineRoomName("");
      setShowInlineAddRoom(false);
    } catch (err: any) {
      showToast(err.message || "Failed to create room.");
    }
  };

  const handleInlineAddStaff = async (isForRoom = false) => {
    const evId = isForRoom ? (roomForm.eventId || selectedEventId) : (resourceForm.eventId || selectedEventId);
    if (!inlineStaffName.trim() || !inlineStaffEmail.trim() || evId === "ALL" || !evId) {
      showToast("Provide name, email, and select an event.");
      return;
    }
    try {
      const fullName = inlineStaffName.trim();
      let firstName = fullName;
      let lastName = "";
      const spaceIdx = fullName.indexOf(' ');
      if (spaceIdx > 0) {
        firstName = fullName.substring(0, spaceIdx);
        lastName = fullName.substring(spaceIdx + 1);
      }
      const person = await eventService.createPerson({
        firstName,
        lastName,
        email: inlineStaffEmail,
        phone: "N/A"
      });

      const participant = await eventService.createParticipant({
        eventId: evId,
        personId: person.id,
        roleId: "a0000000-0000-0000-0000-000000000002",
        status: "confirmed"
      });

      showToast("Staff registered successfully!");
      const staffList = await eventService.getStaffByEvent(evId).catch(() => []);
      setEventStaff(staffList || []);

      if (isForRoom) {
        setRoomForm(f => ({ ...f, roomManagerId: participant.id }));
        setShowInlineAddStaffForRoom(false);
      } else {
        setResourceForm(f => ({ ...f, assignedToStaffId: participant.id }));
        setShowInlineAddStaff(false);
      }
      setInlineStaffName("");
      setInlineStaffEmail("");
    } catch (err: any) {
      showToast(err.message || "Failed to add staff.");
    }
  };

  const handleAddCustomRoomType = () => {
    if (!newCustomType.trim()) return;
    setCustomRoomTypes(prev => [...prev, newCustomType.trim()]);
    setRoomForm(f => ({ ...f, roomType: newCustomType.trim() }));
    setNewCustomType("");
    setShowAddCustomType(false);
  };

  const handleInlineAddSession = async () => {
    const evId = roomForm.eventId || selectedEventId;
    if (!inlineSessionTitle.trim() || !inlineSessionStart || !inlineSessionEnd || evId === "ALL" || !evId) {
      showToast("Please provide session title, start time, end time and select an event.");
      return;
    }
    try {
      const created = await eventService.createSession({
        eventId: evId,
        title: inlineSessionTitle,
        description: "Inline created session",
        type: "TALK",
        startTime: new Date(inlineSessionStart).toISOString(),
        endTime: new Date(inlineSessionEnd).toISOString(),
        maxCapacity: 100
      });
      showToast("Session created successfully!");
      const list = await eventService.getSessions().catch(() => []);
      const filtered = (list || []).filter((s: any) => (s.eventId || s.event?.eventId) === evId);
      setEventSessions(filtered);
      setRoomForm(f => ({ ...f, assignedSessionId: created.sessionId || created.id }));
      setInlineSessionTitle("");
      setInlineSessionStart("");
      setInlineSessionEnd("");
      setShowInlineAddSession(false);
    } catch (err: any) {
      showToast(err.message || "Failed to create session.");
    }
  };

  // Filtering calculations
  const filteredResources = resources.filter(res => {
    const evMatch = selectedEventId === "ALL" || res.eventId === selectedEventId;
    const locMatch = selectedLocationId === "ALL" || res.locationId === selectedLocationId;
    const queryMatch = !searchQuery || res.name.toLowerCase().includes(searchQuery.toLowerCase()) || (res.description && res.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return evMatch && locMatch && queryMatch;
  });

  const filteredRooms = rooms.filter(rm => {
    const evMatch = selectedEventId === "ALL" || rm.eventId === selectedEventId;
    const locMatch = selectedLocationId === "ALL" || rm.locationId === selectedLocationId;
    const queryMatch = !searchQuery || rm.name.toLowerCase().includes(searchQuery.toLowerCase()) || (rm.description && rm.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return evMatch && locMatch && queryMatch;
  });

  // Locations currently selected for event filter
  const filterLocations = selectedEventId === "ALL"
    ? locations
    : locations.filter(l => l.eventId === selectedEventId || l.event?.eventId === selectedEventId);

  return (
    <div className="flex bg-[#f9fafb] min-h-screen text-[#1a1a1a]">
      <Sidebar />
      
      {/* Toast Alert */}
      {toast && (
        <div className="fixed top-5 right-5 z-[200] bg-[#1a1a1a] text-white text-xs font-semibold px-5 py-3 rounded-2xl shadow-xl flex items-center gap-2">
          <Check size={14} className="text-green-400" /> {toast}
        </div>
      )}

      <div className="ml-[220px] flex-1 flex flex-col h-screen overflow-hidden">
        {/* HEADER */}
        <header className="h-[60px] bg-white border-b border-[#e5e7eb] flex items-center justify-between px-8 shrink-0">
          <div className="flex items-center gap-3">
            <h1 className="font-display text-lg font-bold text-[#FF4747] flex items-center gap-2">
              <Package size={18} /> Resources & Spaces
            </h1>
            <span className="text-[10px] bg-[#f5f5f5] text-[#888] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
              Asset Allocation
            </span>
          </div>
          <div className="flex items-center gap-4">
            {/* Tab switchers */}
            <div className="bg-[#f5f5f5] p-1 rounded-xl flex gap-1 border border-[#e5e7eb]">
              <button
                onClick={() => { setActiveTab("assets"); setSearchQuery(""); }}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${activeTab === "assets" ? "bg-white text-[#FF4747] shadow-sm" : "text-[#666] hover:text-[#1a1a1a]"}`}
              >
                Assets & Equipment
              </button>
              <button
                onClick={() => { setActiveTab("rooms"); setSearchQuery(""); }}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${activeTab === "rooms" ? "bg-white text-[#FF4747] shadow-sm" : "text-[#666] hover:text-[#1a1a1a]"}`}
              >
                Rooms & Venues
              </button>
            </div>
          </div>
        </header>

        {/* CONTROLS BAR (FILTERS & SEARCH) */}
        <div className="bg-white border-b border-[#e5e7eb] px-8 py-3.5 flex flex-wrap items-center justify-between gap-4 shrink-0">
          <div className="flex items-center gap-3 flex-1 min-w-[280px]">
            {/* Event Filter */}
            <div className="flex items-center gap-1.5 bg-[#f9fafb] border border-[#e5e7eb] rounded-xl px-3 py-1.5 shrink-0">
              <Calendar size={13} className="text-[#888]" />
              <select
                value={selectedEventId}
                onChange={e => { setSelectedEventId(e.target.value); setSelectedLocationId("ALL"); }}
                className="bg-transparent text-[11px] text-[#1a1a1a] font-semibold outline-none cursor-pointer"
              >
                <option value="ALL">All Events</option>
                {events.map(ev => <option key={ev.eventId || ev.id} value={ev.eventId || ev.id}>{ev.title}</option>)}
              </select>
            </div>

            {/* Location Filter */}
            <div className="flex items-center gap-1.5 bg-[#f9fafb] border border-[#e5e7eb] rounded-xl px-3 py-1.5 shrink-0">
              <MapPin size={13} className="text-[#888]" />
              <select
                value={selectedLocationId}
                onChange={e => setSelectedLocationId(e.target.value)}
                className="bg-transparent text-[11px] text-[#1a1a1a] font-semibold outline-none cursor-pointer"
              >
                <option value="ALL">All Locations</option>
                {filterLocations.map(loc => <option key={loc.locationId} value={loc.locationId}>{loc.venueName}</option>)}
              </select>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#aaa]" size={13} />
            <input
              type="text"
              placeholder={activeTab === "assets" ? "Search assets..." : "Search spaces..."}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-[#f9fafb] border border-[#e5e7eb] rounded-xl pl-9 pr-4 py-2 text-xs text-[#1a1a1a] outline-none focus:border-[#FF4747] transition-colors"
            />
          </div>
        </div>

        {/* MAIN BODY AREA */}
        <div className="flex-1 flex overflow-hidden">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-[#888]">
              <div className="w-8 h-8 border-2 border-t-transparent border-[#FF4747] rounded-full animate-spin mb-3"></div>
              <span className="text-xs">Fetching resources from database...</span>
            </div>
          ) : (
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1.2fr_1.8fr] h-full overflow-hidden p-8 gap-8">
              
              {/* LEFT COLUMN: CREATE / EDIT FORM */}
              <div className="bg-white border border-[#e5e7eb] rounded-3xl p-6 shadow-sm overflow-y-auto flex flex-col h-full space-y-5">
                <div className="flex items-center justify-between border-b border-[#f3f4f6] pb-3 shrink-0">
                  <div className="flex items-center gap-2">
                    {activeTab === "assets" ? <Armchair size={16} className="text-[#FF4747]" /> : <Home size={16} className="text-[#FF4747]" />}
                    <h2 className="font-display font-bold text-xs text-[#1a1a1a]">
                      {activeTab === "assets"
                        ? (editingResource ? "Edit Asset / Equipment" : "Add Asset / Equipment")
                        : (editingRoom ? "Edit Space / Room" : "Add Space / Room")
                      }
                    </h2>
                  </div>
                  {(editingResource || editingRoom) && (
                    <button
                      onClick={() => {
                        setEditingResource(null);
                        setEditingRoom(null);
                        setResourceForm(f => ({ ...f, name: "", quantity: 1, description: "" }));
                        setRoomForm(f => ({ ...f, name: "", capacity: 20, floor: "", amenities: "", description: "" }));
                      }}
                      className="text-[10px] text-[#aaa] hover:text-[#1a1a1a] cursor-pointer underline font-bold uppercase"
                    >
                      Cancel Edit
                    </button>
                  )}
                </div>

                {activeTab === "assets" ? (
                  /* ASSETS FORM */
                  <form onSubmit={saveResource} className="space-y-4 flex-1">
                    <div>
                      <label className={labelStyle}>Target Event *</label>
                      <select
                        value={resourceForm.eventId}
                        onChange={e => handleFormEventChange(e.target.value)}
                        className="w-full bg-white border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-xs text-[#1a1a1a] outline-none focus:border-[#FF4747] transition-colors"
                        required
                      >
                        {events.map(ev => <option key={ev.eventId || ev.id} value={ev.eventId || ev.id}>{ev.title}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className={labelStyle}>Allocated Location</label>
                      <select
                        value={resourceForm.locationId}
                        onChange={e => setResourceForm({ ...resourceForm, locationId: e.target.value })}
                        className="w-full bg-white border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-xs text-[#1a1a1a] outline-none focus:border-[#FF4747] transition-colors"
                      >
                        <option value="">- No specific location -</option>
                        {locations
                          .filter(l => l.eventId === resourceForm.eventId || l.event?.eventId === resourceForm.eventId)
                          .map(loc => <option key={loc.locationId} value={loc.locationId}>{loc.venueName}</option>)
                        }
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelStyle}>Asset Name *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Chairs, JBL Speaker"
                          value={resourceForm.name}
                          onChange={e => setResourceForm({ ...resourceForm, name: e.target.value })}
                          className={inp}
                        />
                      </div>
                      <div>
                        <label className={labelStyle}>Category Type</label>
                        <select
                          value={resourceForm.type}
                          onChange={e => setResourceForm({ ...resourceForm, type: e.target.value as ResourceType })}
                          className="w-full bg-white border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-xs text-[#1a1a1a] outline-none focus:border-[#FF4747] transition-colors"
                        >
                          <option value="EQUIPMENT">Equipment</option>
                          <option value="MATERIAL">Material</option>
                          <option value="SERVICE">Service</option>
                          <option value="UTILITY">Utility</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelStyle}>Category Detail</label>
                        <select
                          value={resourceForm.category}
                          onChange={e => setResourceForm({ ...resourceForm, category: e.target.value })}
                          className="w-full bg-white border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-xs text-[#1a1a1a] outline-none focus:border-[#FF4747] transition-colors"
                        >
                          <option value="Audio">Audio</option>
                          <option value="Video">Video</option>
                          <option value="Furniture">Furniture</option>
                          <option value="IT Equipment">IT Equipment</option>
                          <option value="Decoration">Decoration</option>
                          <option value="Catering">Catering</option>
                          <option value="Security">Security</option>
                          <option value="Other">Other</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelStyle}>Condition</label>
                        <select
                          value={resourceForm.condition}
                          onChange={e => setResourceForm({ ...resourceForm, condition: e.target.value })}
                          className="w-full bg-white border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-xs text-[#1a1a1a] outline-none focus:border-[#FF4747] transition-colors"
                        >
                          <option value="New">New</option>
                          <option value="Good">Good</option>
                          <option value="Fair">Fair</option>
                          <option value="Needs Repair">Needs Repair</option>
                          <option value="Damaged">Damaged</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className={labelStyle}>Qty Available *</label>
                        <input
                          type="number"
                          min={1}
                          required
                          value={resourceForm.quantityAvailable}
                          onChange={e => setResourceForm({ ...resourceForm, quantityAvailable: parseInt(e.target.value) || 1 })}
                          className={inp}
                        />
                      </div>
                      <div>
                        <label className={labelStyle}>Qty Reserved</label>
                        <input
                          type="number"
                          min={0}
                          value={resourceForm.quantityReserved}
                          onChange={e => setResourceForm({ ...resourceForm, quantityReserved: parseInt(e.target.value) || 0 })}
                          className={inp}
                        />
                      </div>
                      <div>
                        <label className={labelStyle}>Unit</label>
                        <select
                          value={resourceForm.unit}
                          onChange={e => setResourceForm({ ...resourceForm, unit: e.target.value })}
                          className="w-full bg-white border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-xs text-[#1a1a1a] outline-none focus:border-[#FF4747] transition-colors"
                        >
                          <option value="Piece">Piece</option>
                          <option value="Set">Set</option>
                          <option value="Box">Box</option>
                          <option value="Meter">Meter</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelStyle}>Assigned Room</label>
                        <div className="flex gap-1">
                          <select
                            value={resourceForm.assignedRoomId}
                            onChange={e => setResourceForm({ ...resourceForm, assignedRoomId: e.target.value })}
                            className="flex-1 bg-white border border-[#e5e7eb] rounded-xl px-3 py-2 text-xs text-[#1a1a1a] outline-none focus:border-[#FF4747] transition-colors"
                          >
                            <option value="">- Unassigned -</option>
                            {eventRooms.map(rm => (
                              <option key={rm.roomId || rm.id} value={rm.roomId || rm.id}>{rm.name}</option>
                            ))}
                          </select>
                          <button type="button" onClick={() => setShowInlineAddRoom(!showInlineAddRoom)} className="px-3 py-2 bg-stone-100 hover:bg-stone-200 border border-[#e5e7eb] rounded-xl text-xs font-bold shrink-0 cursor-pointer">+</button>
                        </div>
                        {showInlineAddRoom && (
                          <div className="mt-2 p-3 bg-stone-50 border border-[#e5e7eb] rounded-xl space-y-2">
                            <input placeholder="Room Name" value={inlineRoomName} onChange={e => setInlineRoomName(e.target.value)} className="w-full bg-white border rounded-lg px-2 py-1 text-xs outline-none" />
                            <button type="button" onClick={handleInlineAddRoom} className="w-full py-1 bg-black text-white text-xs font-bold rounded-lg hover:bg-stone-800">Add Room</button>
                          </div>
                        )}
                      </div>
                      <div>
                        <label className={labelStyle}>Assigned To Staff</label>
                        <div className="flex gap-1">
                          <select
                            value={resourceForm.assignedToStaffId}
                            onChange={e => setResourceForm({ ...resourceForm, assignedToStaffId: e.target.value })}
                            className="flex-1 bg-white border border-[#e5e7eb] rounded-xl px-3 py-2 text-xs text-[#1a1a1a] outline-none focus:border-[#FF4747] transition-colors"
                          >
                            <option value="">- Unassigned -</option>
                            {eventStaff.map(st => (
                              <option key={st.staffId} value={st.staffId}>{st.name}</option>
                            ))}
                          </select>
                          <button type="button" onClick={() => setShowInlineAddStaff(!showInlineAddStaff)} className="px-3 py-2 bg-stone-100 hover:bg-stone-200 border border-[#e5e7eb] rounded-xl text-xs font-bold shrink-0 cursor-pointer">+</button>
                        </div>
                        {showInlineAddStaff && (
                          <div className="mt-2 p-3 bg-stone-50 border border-[#e5e7eb] rounded-xl space-y-2">
                            <input placeholder="Staff Name" value={inlineStaffName} onChange={e => setInlineStaffName(e.target.value)} className="w-full bg-white border rounded-lg px-2 py-1 text-xs outline-none" />
                            <input placeholder="Staff Email" value={inlineStaffEmail} onChange={e => setInlineStaffEmail(e.target.value)} className="w-full bg-white border rounded-lg px-2 py-1 text-xs outline-none" />
                            <button type="button" onClick={() => handleInlineAddStaff(false)} className="w-full py-1 bg-black text-white text-xs font-bold rounded-lg hover:bg-stone-800">Add Staff</button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelStyle}>Purchase Date</label>
                        <input
                          type="date"
                          value={resourceForm.purchaseDate}
                          onChange={e => setResourceForm({ ...resourceForm, purchaseDate: e.target.value })}
                          className={inp}
                        />
                      </div>
                      <div>
                        <label className={labelStyle}>Purchase Cost</label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder="e.g. 150.00"
                          value={resourceForm.purchaseCost || ""}
                          onChange={e => setResourceForm({ ...resourceForm, purchaseCost: parseFloat(e.target.value) || 0 })}
                          className={inp}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelStyle}>Supplier</label>
                        <input
                          type="text"
                          placeholder="Vendor name"
                          value={resourceForm.supplier}
                          onChange={e => setResourceForm({ ...resourceForm, supplier: e.target.value })}
                          className={inp}
                        />
                      </div>
                      <div>
                        <label className={labelStyle}>Warranty Expiry</label>
                        <input
                          type="date"
                          value={resourceForm.warrantyExpiry}
                          onChange={e => setResourceForm({ ...resourceForm, warrantyExpiry: e.target.value })}
                          className={inp}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelStyle}>Last Maintenance</label>
                        <input
                          type="date"
                          value={resourceForm.lastMaintenance}
                          onChange={e => setResourceForm({ ...resourceForm, lastMaintenance: e.target.value })}
                          className={inp}
                        />
                      </div>
                      <div>
                        <label className={labelStyle}>Next Maintenance</label>
                        <input
                          type="date"
                          value={resourceForm.nextMaintenance}
                          onChange={e => setResourceForm({ ...resourceForm, nextMaintenance: e.target.value })}
                          className={inp}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelStyle}>Barcode / QR Code</label>
                        <input
                          type="text"
                          placeholder="Asset tag / barcode"
                          value={resourceForm.barcode}
                          onChange={e => setResourceForm({ ...resourceForm, barcode: e.target.value })}
                          className={inp}
                        />
                      </div>
                      <div>
                        <label className={labelStyle}>Image URL</label>
                        <input
                          type="text"
                          placeholder="Photo link"
                          value={resourceForm.image}
                          onChange={e => setResourceForm({ ...resourceForm, image: e.target.value })}
                          className={inp}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelStyle}>Allocation Status</label>
                        <select
                          value={resourceForm.status}
                          onChange={e => setResourceForm({ ...resourceForm, status: e.target.value as ResourceStatus })}
                          className="w-full bg-white border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-xs text-[#1a1a1a] outline-none focus:border-[#FF4747] transition-colors"
                        >
                          <option value="AVAILABLE">Available</option>
                          <option value="RESERVED">Reserved</option>
                          <option value="MAINTENANCE">Maintenance</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelStyle}>Description / Notes</label>
                        <input
                          type="text"
                          placeholder="Condition / details"
                          value={resourceForm.description}
                          onChange={e => setResourceForm({ ...resourceForm, description: e.target.value })}
                          className={inp}
                        />
                      </div>
                    </div>

                    <div>
                      <label className={labelStyle}>Additional Notes</label>
                      <textarea
                        rows={2}
                        placeholder="Any additional remarks..."
                        value={resourceForm.notes}
                        onChange={e => setResourceForm({ ...resourceForm, notes: e.target.value })}
                        className={inp + " resize-none"}
                      />
                    </div>

                    <button type="submit" disabled={saving} className={saveBtn + " w-full justify-center mt-2"}>
                      <Save size={13} />
                      {saving ? "Saving..." : (editingResource ? "Save Asset" : "Allocate Asset")}
                    </button>
                  </form>
                ) : (
                  /* ROOMS FORM */
                  <form onSubmit={saveRoom} className="space-y-4 flex-1">
                    <div>
                      <label className={labelStyle}>Target Event *</label>
                      <select
                        value={roomForm.eventId}
                        onChange={e => handleFormEventChange(e.target.value)}
                        className="w-full bg-white border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-xs text-[#1a1a1a] outline-none focus:border-[#FF4747] transition-colors"
                        required
                      >
                        {events.map(ev => <option key={ev.eventId || ev.id} value={ev.eventId || ev.id}>{ev.title}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className={labelStyle}>Venue Location</label>
                      <select
                        value={roomForm.locationId}
                        onChange={e => setRoomForm({ ...roomForm, locationId: e.target.value })}
                        className="w-full bg-white border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-xs text-[#1a1a1a] outline-none focus:border-[#FF4747] transition-colors"
                      >
                        <option value="">- No specific location -</option>
                        {locations
                          .filter(l => l.eventId === roomForm.eventId || l.event?.eventId === roomForm.eventId)
                          .map(loc => <option key={loc.locationId} value={loc.locationId}>{loc.venueName}</option>)
                        }
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelStyle}>Space / Room Name *</label>
                        <input
                          type="text"
                          required
                          placeholder="e.g. Main Hall, Room 404"
                          value={roomForm.name}
                          onChange={e => setRoomForm({ ...roomForm, name: e.target.value })}
                          className={inp}
                        />
                      </div>
                      <div>
                        <label className={labelStyle}>Capacity (People)</label>
                        <input
                          type="number"
                          min={1}
                          value={roomForm.capacity}
                          onChange={e => setRoomForm({ ...roomForm, capacity: parseInt(e.target.value) || 20 })}
                          className={inp}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelStyle}>Floor / Level</label>
                        <input
                          type="text"
                          placeholder="e.g. Ground Floor, 2nd Floor"
                          value={roomForm.floor}
                          onChange={e => setRoomForm({ ...roomForm, floor: e.target.value })}
                          className={inp}
                        />
                      </div>
                      <div>
                        <label className={labelStyle}>Room Status</label>
                        <select
                          value={roomForm.status}
                          onChange={e => setRoomForm({ ...roomForm, status: e.target.value as RoomStatus })}
                          className="w-full bg-white border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-xs text-[#1a1a1a] outline-none focus:border-[#FF4747] transition-colors"
                        >
                          <option value="AVAILABLE">Available</option>
                          <option value="OCCUPIED">Occupied</option>
                          <option value="MAINTENANCE">Maintenance</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelStyle}>Room Number</label>
                        <input
                          type="text"
                          placeholder="e.g. 101, A-4"
                          value={roomForm.roomNumber}
                          onChange={e => setRoomForm({ ...roomForm, roomNumber: e.target.value })}
                          className={inp}
                        />
                      </div>
                      <div>
                        <label className={labelStyle}>Room Type *</label>
                        <div className="flex gap-1">
                          <select
                            value={roomForm.roomType}
                            onChange={e => setRoomForm({ ...roomForm, roomType: e.target.value })}
                            className="flex-1 bg-white border border-[#e5e7eb] rounded-xl px-3 py-2 text-xs text-[#1a1a1a] outline-none focus:border-[#FF4747] transition-colors"
                          >
                            <option value="Hall">Hall</option>
                            <option value="Conference Room">Conference Room</option>
                            <option value="Classroom">Classroom</option>
                            <option value="Lab">Lab</option>
                            <option value="Outdoor">Outdoor</option>
                            <option value="Booth">Booth</option>
                            <option value="VIP Lounge">VIP Lounge</option>
                            <option value="Exhibition Space">Exhibition Space</option>
                            {customRoomTypes.map((type, idx) => (
                              <option key={idx} value={type}>{type}</option>
                            ))}
                          </select>
                          <button type="button" onClick={() => setShowAddCustomType(!showAddCustomType)} className="px-3 py-2 bg-stone-100 hover:bg-stone-200 border border-[#e5e7eb] rounded-xl text-xs font-bold shrink-0 cursor-pointer">+</button>
                        </div>
                        {showAddCustomType && (
                          <div className="mt-2 p-3 bg-stone-50 border border-[#e5e7eb] rounded-xl space-y-2">
                            <input placeholder="Custom Room Type" value={newCustomType} onChange={e => setNewCustomType(e.target.value)} className="w-full bg-white border rounded-lg px-2 py-1 text-xs outline-none" />
                            <button type="button" onClick={handleAddCustomRoomType} className="w-full py-1 bg-black text-white text-xs font-bold rounded-lg hover:bg-stone-800">Add Type</button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className={labelStyle}>Accessibility Features</label>
                      <input
                        type="text"
                        placeholder="e.g. Wheelchair ramp, Braille signage"
                        value={roomForm.accessibilityFeatures}
                        onChange={e => setRoomForm({ ...roomForm, accessibilityFeatures: e.target.value })}
                        className={inp}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelStyle}>Assigned Session</label>
                        <div className="flex gap-1">
                          <select
                            value={roomForm.assignedSessionId}
                            onChange={e => setRoomForm({ ...roomForm, assignedSessionId: e.target.value })}
                            className="flex-1 bg-white border border-[#e5e7eb] rounded-xl px-3 py-2 text-xs text-[#1a1a1a] outline-none focus:border-[#FF4747] transition-colors"
                          >
                            <option value="">- None -</option>
                            {eventSessions.map(sess => (
                              <option key={sess.sessionId || sess.id} value={sess.sessionId || sess.id}>{sess.title}</option>
                            ))}
                          </select>
                          <button type="button" onClick={() => setShowInlineAddSession(!showInlineAddSession)} className="px-3 py-2 bg-stone-100 hover:bg-stone-200 border border-[#e5e7eb] rounded-xl text-xs font-bold shrink-0 cursor-pointer">+</button>
                        </div>
                        {showInlineAddSession && (
                          <div className="mt-2 p-3 bg-stone-50 border border-[#e5e7eb] rounded-xl space-y-2">
                            <input placeholder="Session Title" value={inlineSessionTitle} onChange={e => setInlineSessionTitle(e.target.value)} className="w-full bg-white border rounded-lg px-2 py-1 text-xs outline-none" />
                            <div className="grid grid-cols-2 gap-2">
                              <div>
                                <label className="text-[8px] text-gray-500 font-bold block uppercase mb-1">Start</label>
                                <input type="datetime-local" value={inlineSessionStart} onChange={e => setInlineSessionStart(e.target.value)} className="w-full bg-white border rounded-lg px-2 py-1 text-xs outline-none" />
                              </div>
                              <div>
                                <label className="text-[8px] text-gray-500 font-bold block uppercase mb-1">End</label>
                                <input type="datetime-local" value={inlineSessionEnd} onChange={e => setInlineSessionEnd(e.target.value)} className="w-full bg-white border rounded-lg px-2 py-1 text-xs outline-none" />
                              </div>
                            </div>
                            <button type="button" onClick={handleInlineAddSession} className="w-full py-1 bg-black text-white text-xs font-bold rounded-lg hover:bg-stone-800">Add Session</button>
                          </div>
                        )}
                      </div>
                      <div>
                        <label className={labelStyle}>Room Manager</label>
                        <div className="flex gap-1">
                          <select
                            value={roomForm.roomManagerId}
                            onChange={e => setRoomForm({ ...roomForm, roomManagerId: e.target.value })}
                            className="flex-1 bg-white border border-[#e5e7eb] rounded-xl px-3 py-2 text-xs text-[#1a1a1a] outline-none focus:border-[#FF4747] transition-colors"
                          >
                            <option value="">- None -</option>
                            {eventStaff.map(st => (
                              <option key={st.staffId} value={st.staffId}>{st.name}</option>
                            ))}
                          </select>
                          <button type="button" onClick={() => setShowInlineAddStaffForRoom(!showInlineAddStaffForRoom)} className="px-3 py-2 bg-stone-100 hover:bg-stone-200 border border-[#e5e7eb] rounded-xl text-xs font-bold shrink-0 cursor-pointer">+</button>
                        </div>
                        {showInlineAddStaffForRoom && (
                          <div className="mt-2 p-3 bg-stone-50 border border-[#e5e7eb] rounded-xl space-y-2">
                            <input placeholder="Manager Name" value={inlineStaffName} onChange={e => setInlineStaffName(e.target.value)} className="w-full bg-white border rounded-lg px-2 py-1 text-xs outline-none" />
                            <input placeholder="Manager Email" value={inlineStaffEmail} onChange={e => setInlineStaffEmail(e.target.value)} className="w-full bg-white border rounded-lg px-2 py-1 text-xs outline-none" />
                            <button type="button" onClick={() => handleInlineAddStaff(true)} className="w-full py-1 bg-black text-white text-xs font-bold rounded-lg hover:bg-stone-800">Add Manager</button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className={labelStyle}>Amenities (comma separated)</label>
                      <input
                        type="text"
                        placeholder="e.g. Projector, AC, Whiteboard, Wifi"
                        value={roomForm.amenities}
                        onChange={e => setRoomForm({ ...roomForm, amenities: e.target.value })}
                        className={inp}
                      />
                    </div>

                    <div>
                      <label className={labelStyle}>Description / Access Instructions</label>
                      <textarea
                        rows={3}
                        placeholder="Write down guidelines, access restrictions, or notes..."
                        value={roomForm.description}
                        onChange={e => setRoomForm({ ...roomForm, description: e.target.value })}
                        className={inp + " resize-none"}
                      />
                    </div>

                    <button type="submit" disabled={saving} className={saveBtn + " w-full justify-center mt-2"}>
                      <Save size={13} />
                      {saving ? "Saving..." : (editingRoom ? "Save Space" : "Create Space")}
                    </button>
                  </form>
                )}
              </div>

              {/* RIGHT COLUMN: CARDS LIST */}
              <div className="overflow-y-auto h-full space-y-4 pr-2">
                <div className="flex items-center justify-between shrink-0 mb-1">
                  <h3 className="font-bold text-xs text-[#1a1a1a] uppercase tracking-wider">
                    {activeTab === "assets" ? `Allocated Assets (${filteredResources.length})` : `Active Spaces (${filteredRooms.length})`}
                  </h3>
                  <span className="text-[10px] text-[#aaa]">Filtered views</span>
                </div>

                {activeTab === "assets" ? (
                  /* ASSETS LIST */
                  filteredResources.length === 0 ? (
                    <div className="bg-white border border-dashed border-[#e5e7eb] rounded-3xl p-16 text-center">
                      <Package size={36} className="mx-auto text-[#ccc] mb-3" />
                      <p className="font-bold text-xs text-[#1a1a1a]">No assets allocated</p>
                      <p className="text-[10px] text-[#aaa] mt-1">Select an event or fill out the form on the left to allocate equipment.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredResources.map(res => {
                        const statusColors =
                          res.status === "AVAILABLE" ? "bg-green-50 text-green-700 border-green-200" :
                          res.status === "RESERVED" ? "bg-blue-50 text-blue-700 border-blue-200" :
                          "bg-red-50 text-red-600 border-red-200";

                        const evName = events.find(e => e.eventId === res.eventId)?.title || "General Event";
                        const locName = locations.find(l => l.locationId === res.locationId)?.venueName || "No specific venue";

                        return (
                          <div
                            key={res.resourceId || res.id}
                            className={`bg-white border rounded-2xl p-5 space-y-3 flex flex-col justify-between hover:border-[#FF4747]/40 hover:shadow-sm transition-all`}
                          >
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-bold text-sm text-[#1a1a1a] truncate" title={res.name}>{res.name}</span>
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${statusColors}`}>
                                  {res.status}
                                </span>
                              </div>
                              
                              <div className="flex flex-wrap gap-2 text-[10px]">
                                <span className="px-1.5 py-0.5 bg-stone-100 text-stone-600 font-semibold rounded uppercase tracking-wider">
                                  {res.type}
                                </span>
                                {res.category && (
                                  <span className="px-1.5 py-0.5 bg-[#FF4747]/10 text-[#FF4747] font-semibold rounded">
                                    {res.category}
                                  </span>
                                )}
                                <span className="px-1.5 py-0.5 bg-stone-100 text-stone-600 font-bold rounded">
                                  Total: {res.quantityAvailable || res.quantity} {res.unit || 'pcs'}
                                </span>
                                {res.quantityReserved !== undefined && (
                                  <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 font-bold rounded">
                                    Reserved: {res.quantityReserved}
                                  </span>
                                )}
                                {res.quantityRemaining !== undefined && (
                                  <span className="px-1.5 py-0.5 bg-green-50 text-green-700 font-bold rounded">
                                    Remaining: {res.quantityRemaining}
                                  </span>
                                )}
                                {res.condition && (
                                  <span className="px-1.5 py-0.5 bg-stone-100 text-stone-600 rounded">
                                    Cond: {res.condition}
                                  </span>
                                )}
                                {res.barcode && (
                                  <span className="px-1.5 py-0.5 bg-stone-100 text-stone-400 font-mono rounded">
                                    Barcode: {res.barcode}
                                  </span>
                                )}
                              </div>

                              <p className="text-[11px] text-[#666] line-clamp-2 leading-relaxed">
                                {res.description || <span className="text-[#ccc] italic">No description provided</span>}
                              </p>
                            </div>

                            <div className="border-t border-[#f3f4f6] pt-3 mt-1 flex flex-col gap-1.5 text-[10px] text-[#888]">
                              <div className="flex items-center gap-1.5 truncate">
                                <Calendar size={11} className="text-[#aaa]" />
                                <span className="font-medium text-[#555] truncate">{evName}</span>
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-1.5 truncate min-w-0">
                                  <MapPin size={11} className="text-[#aaa]" />
                                  <span className="font-medium text-[#555] truncate">{locName}</span>
                                </div>
                                
                                <div className="flex gap-1 shrink-0">
                                  <button
                                    onClick={() => {
                                      setEditingResource(res);
                                      loadEventSpecifics(res.eventId || "");
                                      setResourceForm({
                                        name: res.name || "",
                                        type: (res.type || "EQUIPMENT") as ResourceType,
                                        quantity: res.quantity || 1,
                                        status: (res.status || "AVAILABLE") as ResourceStatus,
                                        eventId: res.eventId || "",
                                        locationId: res.locationId || "",
                                        description: res.description || "",
                                        category: res.category || "Audio",
                                        quantityAvailable: res.quantityAvailable || res.quantity || 1,
                                        quantityReserved: res.quantityReserved || 0,
                                        unit: res.unit || "Piece",
                                        condition: res.condition || "Good",
                                        assignedRoomId: res.assignedRoomId || "",
                                        assignedToStaffId: res.assignedToStaffId || "",
                                        purchaseDate: res.purchaseDate || "",
                                        purchaseCost: res.purchaseCost || 0,
                                        supplier: res.supplier || "",
                                        warrantyExpiry: res.warrantyExpiry || "",
                                        lastMaintenance: res.lastMaintenance || "",
                                        nextMaintenance: res.nextMaintenance || "",
                                        barcode: res.barcode || "",
                                        image: res.image || "",
                                        notes: res.notes || ""
                                      });
                                    }}
                                    className="p-1 border border-[#e5e7eb] text-[#555] rounded-lg hover:border-[#FF4747] hover:text-[#FF4747] transition-colors cursor-pointer"
                                    title="Edit Asset"
                                  >
                                    <Pencil size={11} />
                                  </button>
                                  <button
                                    onClick={() => deleteResource(res.resourceId || res.id || "")}
                                    className="p-1 border border-red-100 text-red-500 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                                    title="Delete Asset"
                                  >
                                    <Trash2 size={11} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
                ) : (
                  /* ROOMS LIST */
                  filteredRooms.length === 0 ? (
                    <div className="bg-white border border-dashed border-[#e5e7eb] rounded-3xl p-16 text-center">
                      <Home size={36} className="mx-auto text-[#ccc] mb-3" />
                      <p className="font-bold text-xs text-[#1a1a1a]">No spaces or rooms set up</p>
                      <p className="text-[10px] text-[#aaa] mt-1">Select an event or fill out the form on the left to set up venue halls/rooms.</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredRooms.map(rm => {
                        const statusColors =
                          rm.status === "AVAILABLE" ? "bg-green-50 text-green-700 border-green-200" :
                          rm.status === "OCCUPIED" ? "bg-amber-50 text-amber-700 border-amber-200" :
                          "bg-red-50 text-red-600 border-red-200";

                        const evName = events.find(e => e.eventId === rm.eventId)?.title || "General Event";
                        const locName = locations.find(l => l.locationId === rm.locationId)?.venueName || "No specific venue";

                        return (
                          <div
                            key={rm.roomId || rm.id}
                            className="bg-white border border-[#e5e7eb] rounded-2xl p-5 space-y-3 flex flex-col justify-between hover:border-[#FF4747]/40 hover:shadow-sm transition-all"
                          >
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <span className="font-bold text-sm text-[#1a1a1a] truncate" title={rm.name}>{rm.name}</span>
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border ${statusColors}`}>
                                  {rm.status}
                                </span>
                              </div>

                              <div className="flex flex-wrap gap-2 text-[10px]">
                                {rm.roomNumber && (
                                  <span className="px-1.5 py-0.5 bg-[#FF4747]/10 text-[#FF4747] font-bold rounded">
                                    No. {rm.roomNumber}
                                  </span>
                                )}
                                {rm.roomType && (
                                  <span className="px-1.5 py-0.5 bg-stone-100 text-stone-600 font-semibold rounded uppercase">
                                    {rm.roomType}
                                  </span>
                                )}
                                {rm.capacity && (
                                  <span className="px-1.5 py-0.5 bg-stone-100 text-stone-600 font-bold rounded">
                                    Capacity: {rm.capacity} pax
                                  </span>
                                )}
                                {rm.floor && (
                                  <span className="px-1.5 py-0.5 bg-stone-100 text-stone-600 font-semibold rounded">
                                    {rm.floor}
                                  </span>
                                )}
                                {rm.accessibilityFeatures && (
                                  <span className="px-1.5 py-0.5 bg-sky-50 text-sky-700 rounded border border-sky-100" title={rm.accessibilityFeatures}>
                                    Accessibility
                                  </span>
                                )}
                              </div>

                              {rm.amenities && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {rm.amenities.split(",").map((item, idx) => (
                                    <span key={idx} className="text-[9px] px-1 bg-sky-50 text-sky-700 rounded border border-sky-100">
                                      {item.trim()}
                                    </span>
                                  ))}
                                </div>
                              )}

                              <p className="text-[11px] text-[#666] line-clamp-2 leading-relaxed mt-1">
                                {rm.description || <span className="text-[#ccc] italic">No description provided</span>}
                              </p>
                            </div>

                            <div className="border-t border-[#f3f4f6] pt-3 mt-1 flex flex-col gap-1.5 text-[10px] text-[#888]">
                              <div className="flex items-center gap-1.5 truncate">
                                <Calendar size={11} className="text-[#aaa]" />
                                <span className="font-medium text-[#555] truncate">{evName}</span>
                              </div>
                              <div className="flex items-center justify-between gap-4">
                                <div className="flex items-center gap-1.5 truncate min-w-0">
                                  <MapPin size={11} className="text-[#aaa]" />
                                  <span className="font-medium text-[#555] truncate">{locName}</span>
                                </div>

                                <div className="flex gap-1 shrink-0">
                                  <button
                                    onClick={() => {
                                      setEditingRoom(rm);
                                      loadEventSpecifics(rm.eventId || "");
                                      setRoomForm({
                                        name: rm.name || "",
                                        capacity: rm.capacity || 20,
                                        floor: rm.floor || "",
                                        amenities: rm.amenities || "",
                                        status: (rm.status || "AVAILABLE") as RoomStatus,
                                        eventId: rm.eventId || "",
                                        locationId: rm.locationId || "",
                                        description: rm.description || "",
                                        roomNumber: rm.roomNumber || "",
                                        roomType: rm.roomType || "Hall",
                                        accessibilityFeatures: rm.accessibilityFeatures || "",
                                        assignedSessionId: rm.assignedSessionId || "",
                                        roomManagerId: rm.roomManagerId || ""
                                      });
                                    }}
                                    className="p-1 border border-[#e5e7eb] text-[#555] rounded-lg hover:border-[#FF4747] hover:text-[#FF4747] transition-colors cursor-pointer"
                                    title="Edit Space"
                                  >
                                    <Pencil size={11} />
                                  </button>
                                  <button
                                    onClick={() => deleteRoom(rm.roomId || rm.id || "")}
                                    className="p-1 border border-red-100 text-red-500 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                                    title="Delete Space"
                                  >
                                    <Trash2 size={11} />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
                )}
              </div>

            </div>
          )}
        </div>
      </div>
    </div>
  );
}
