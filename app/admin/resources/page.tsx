"use client";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import Sidebar from "@/components/Sidebar";
import {
  Package, Home, Plus, Trash2, Pencil, MapPin, Calendar, Check, Save,
  Search, ShieldAlert, AlertCircle, Info, ChevronRight, Layers,
  Compass, Hammer, Armchair, Volume2, Video, Laptop, Coffee, Shield, Award, Sparkles, HelpCircle, Link2
} from "lucide-react";
import { getStoredAuth } from "@/app/utils/api";
 
const getAssetIcon = (category?: string) => {
  const cat = (category || "").toLowerCase();
  if (cat.includes("audio")) return <Volume2 size={15} className="text-blue-500" />;
  if (cat.includes("video")) return <Video size={15} className="text-purple-500" />;
  if (cat.includes("furniture")) return <Armchair size={15} className="text-amber-500" />;
  if (cat.includes("it") || cat.includes("computer") || cat.includes("tech")) return <Laptop size={15} className="text-indigo-500" />;
  if (cat.includes("catering") || cat.includes("food") || cat.includes("drink")) return <Coffee size={15} className="text-orange-500" />;
  if (cat.includes("security")) return <Shield size={15} className="text-emerald-500" />;
  if (cat.includes("decoration")) return <Sparkles size={15} className="text-rose-500" />;
  return <Package size={15} className="text-zinc-400" />;
};
 
const getRoomIcon = (roomType?: string) => {
  const type = (roomType || "").toLowerCase();
  if (type.includes("vip") || type.includes("lounge")) return <Award size={15} className="text-amber-500 animate-pulse" />;
  if (type.includes("outdoor") || type.includes("garden")) return <Compass size={15} className="text-emerald-500" />;
  if (type.includes("conference") || type.includes("hall") || type.includes("meeting")) return <Layers size={15} className="text-blue-500" />;
  if (type.includes("classroom") || type.includes("lab")) return <Laptop size={15} className="text-indigo-500" />;
  return <Home size={15} className="text-zinc-400" />;
};
import { eventService } from "@/app/utils/services/eventService";
import { useLanguage } from "@/app/context/LanguageContext";

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
  status: string;
  eventId: string;
  locationId?: string;
  event?: { title: string };
  location?: { venueName: string };

  roomNumber?: string;
  roomType?: string;
  accessibilityFeatures?: string;
}

interface AllocationItem {
  id?: string;
  resourceId: string;
  resourceName?: string;
  roomId: string;
  roomName?: string;
  quantity?: number;
  startTime?: string;
  endTime?: string;
  status?: string;
  notes?: string;
}

const inp = "w-full bg-white border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-xs text-[#1a1a1a] placeholder:text-[#aaa] outline-none focus:border-[#FF4747] transition-colors";
const labelStyle = "block text-[10px] font-semibold text-[#888] uppercase tracking-wider mb-1.5";
const saveBtn = "flex items-center gap-2 px-5 py-2.5 bg-[#FF4747] text-white text-xs font-bold rounded-xl hover:bg-[#e03e3e] transition-colors cursor-pointer disabled:opacity-50";

export default function ResourcesPage() {
  const { t } = useLanguage();
  const router = useRouter();
  const auth = getStoredAuth();
  
  // Tabs & Filters
  const [activeTab, setActiveTab] = useState<"assets" | "rooms" | "allocations">("assets");
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
  const [allocations, setAllocations] = useState<AllocationItem[]>([]);

  // Forms editing states
  const [editingResource, setEditingResource] = useState<ResourceItem | null>(null);
  const [editingRoom, setEditingRoom] = useState<RoomItem | null>(null);
  const [editingAllocation, setEditingAllocation] = useState<AllocationItem | null>(null);

  const [showAddCustomType, setShowAddCustomType] = useState(false);
  const [customRoomTypes, setCustomRoomTypes] = useState<string[]>([]);
  const [newCustomType, setNewCustomType] = useState("");

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
    status: "AVAILABLE" as RoomStatus,
    eventId: "",
    locationId: "",
    description: "",

    roomNumber: "",
    roomType: "Hall",
    accessibilityFeatures: ""
  });

  const [allocationForm, setAllocationForm] = useState({
    resourceId: "",
    roomId: "",
    quantity: 1,
    startTime: "",
    endTime: "",
    status: "ACTIVE",
    notes: ""
  });

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  };

  // Pre-load data
  const loadData = async () => {
    setLoading(true);
    try {
      const [myEvents, allLocations, allResources, allRooms, allAllocations] = await Promise.all([
        eventService.getMyEvents().catch(() => []),
        eventService.getEventLocations().catch(() => []),
        eventService.getEventResources().catch(() => []),
        eventService.getRooms().catch(() => []),
        eventService.getRoomAssetAllocations().catch(() => [])
      ]);

      setEvents(myEvents || []);
      setLocations(allLocations || []);
      setResources(allResources || []);
      setRooms(allRooms || []);
      setAllocations(allAllocations || []);

      // If user has events, pre-select the first one for the form defaults
      if (myEvents && myEvents.length > 0) {
        const firstEvId = myEvents[0].eventId || myEvents[0].id;
        setResourceForm(f => ({ ...f, eventId: firstEvId }));
        setRoomForm(f => ({ ...f, eventId: firstEvId }));

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
      showToast(t("adminResources.toast.loadFailed"));
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
      showToast(t("adminResources.toast.assetNameRequired"));
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
        showToast(t("adminResources.toast.assetUpdated"));
        setEditingResource(null);
      } else {
        await eventService.createResource(payload);
        showToast(t("adminResources.toast.assetAdded"));
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
      showToast(err.message || t("adminResources.toast.assetSaveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const deleteResource = async (id: string) => {
    if (!confirm(t("adminResources.toast.confirmDeleteAsset"))) return;
    try {
      await eventService.deleteResource(id);
      showToast(t("adminResources.toast.assetDeleted"));
      setResources(resources.filter(r => r.resourceId !== id && r.id !== id));
    } catch (err: any) {
      showToast(err.message || t("adminResources.toast.assetDeleteFailed"));
    }
  };

  // CRUD Actions - Rooms
  const saveRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomForm.name || !roomForm.eventId) {
      showToast(t("adminResources.toast.spaceNameRequired"));
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
      status: roomForm.status,

      roomNumber: roomForm.roomNumber || undefined,
      roomType: roomForm.roomType || undefined,
      accessibilityFeatures: roomForm.accessibilityFeatures || undefined
    };

    try {
      if (editingRoom) {
        await eventService.updateRoom(editingRoom.roomId || editingRoom.id || "", payload);
        showToast(t("adminResources.toast.spaceUpdated"));
        setEditingRoom(null);
      } else {
        await eventService.createRoom(payload);
        showToast(t("adminResources.toast.spaceAdded"));
      }
      setRoomForm(f => ({
        ...f,
        name: "",
        capacity: 20,
        floor: "",
        description: "",
        roomNumber: "",
        roomType: "Hall",
        accessibilityFeatures: ""
      }));
      // Reload lists
      const freshRooms = await eventService.getRooms().catch(() => []);
      setRooms(freshRooms);
    } catch (err: any) {
      showToast(err.message || t("adminResources.toast.spaceSaveFailed"));
    } finally {
      setSaving(false);
    }
  };

  const deleteRoom = async (id: string) => {
    if (!confirm(t("adminResources.toast.confirmDeleteSpace"))) return;
    try {
      await eventService.deleteRoom(id);
      showToast(t("adminResources.toast.spaceDeleted"));
      setRooms(rooms.filter(r => r.roomId !== id && r.id !== id));
    } catch (err: any) {
      showToast(err.message || t("adminResources.toast.spaceDeleteFailed"));
    }
  };

  const handleAddCustomRoomType = () => {
    if (!newCustomType.trim()) return;
    setCustomRoomTypes(prev => [...prev, newCustomType.trim()]);
    setRoomForm(f => ({ ...f, roomType: newCustomType.trim() }));
    setNewCustomType("");
    setShowAddCustomType(false);
  };

  // CRUD Actions - Allocations
  const saveAllocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!allocationForm.resourceId || !allocationForm.roomId) {
      showToast(t("adminResources.toast.allocationFieldsRequired") || "Select an asset and a room");
      return;
    }
    const remaining = getRemainingQuantity(allocationForm.resourceId, editingAllocation?.id);
    if (allocationForm.quantity > remaining) {
      showToast(t("adminResources.toast.allocationQuantityExceeded", { count: remaining }) || `Only ${remaining} unit(s) available to allocate`);
      return;
    }
    setSaving(true);

    const payload = {
      tenantId: auth?.tenantId,
      resourceId: allocationForm.resourceId,
      roomId: allocationForm.roomId,
      quantity: Number(allocationForm.quantity) || 1,
      startTime: allocationForm.startTime ? new Date(allocationForm.startTime).toISOString() : undefined,
      endTime: allocationForm.endTime ? new Date(allocationForm.endTime).toISOString() : undefined,
      status: allocationForm.status,
      notes: allocationForm.notes || undefined
    };

    try {
      if (editingAllocation) {
        await eventService.updateRoomAssetAllocation(editingAllocation.id || "", payload);
        showToast(t("adminResources.toast.allocationUpdated") || "Allocation updated");
        setEditingAllocation(null);
      } else {
        await eventService.createRoomAssetAllocation(payload);
        showToast(t("adminResources.toast.allocationCreated") || "Allocation created");
      }
      setAllocationForm({ resourceId: "", roomId: "", quantity: 1, startTime: "", endTime: "", status: "ACTIVE", notes: "" });
      const freshAllocations = await eventService.getRoomAssetAllocations().catch(() => []);
      setAllocations(freshAllocations || []);
    } catch (err: any) {
      showToast(err.message || t("adminResources.toast.allocationSaveFailed") || "Failed to save allocation");
    } finally {
      setSaving(false);
    }
  };

  const deleteAllocation = async (id: string) => {
    if (!confirm(t("adminResources.toast.confirmDeleteAllocation") || "Delete this allocation?")) return;
    try {
      await eventService.deleteRoomAssetAllocation(id);
      showToast(t("adminResources.toast.allocationDeleted") || "Allocation deleted");
      setAllocations(allocations.filter(a => a.id !== id));
    } catch (err: any) {
      showToast(err.message || t("adminResources.toast.allocationDeleteFailed") || "Failed to delete allocation");
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

  const filteredAllocations = allocations.filter(al => {
    if (!searchQuery) return true;
    const q = searchQuery.toLowerCase();
    return (al.resourceName || "").toLowerCase().includes(q) || (al.roomName || "").toLowerCase().includes(q) || (al.notes || "").toLowerCase().includes(q);
  });

  // How many units of an asset are still free to allocate (total stock minus active allocations, excluding the one being edited)
  const getRemainingQuantity = (resourceId: string, excludeAllocationId?: string) => {
    const resource = resources.find(r => (r.resourceId || r.id) === resourceId);
    if (!resource) return 0;
    const total = resource.quantityAvailable ?? resource.quantity ?? 0;
    const allocated = allocations
      .filter(a => a.resourceId === resourceId && a.status !== "ENDED" && a.id !== excludeAllocationId)
      .reduce((sum, a) => sum + (a.quantity || 1), 0);
    return total - allocated;
  };

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
              <Package size={18} /> {t("adminResources.header.title")}
            </h1>
            <span className="text-[10px] bg-[#f5f5f5] text-[#888] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">
              {t("adminResources.header.badge")}
            </span>
          </div>
          <div className="flex items-center gap-4">
            {/* Tab switchers */}
            <div className="bg-[#f5f5f5] p-1 rounded-xl flex gap-1 border border-[#e5e7eb]">
              <button
                onClick={() => { setActiveTab("assets"); setSearchQuery(""); }}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${activeTab === "assets" ? "bg-white text-[#FF4747] shadow-sm" : "text-[#666] hover:text-[#1a1a1a]"}`}
              >
                {t("adminResources.header.tabAssets")}
              </button>
              <button
                onClick={() => { setActiveTab("rooms"); setSearchQuery(""); }}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${activeTab === "rooms" ? "bg-white text-[#FF4747] shadow-sm" : "text-[#666] hover:text-[#1a1a1a]"}`}
              >
                {t("adminResources.header.tabRooms")}
              </button>
              <button
                onClick={() => { setActiveTab("allocations"); setSearchQuery(""); }}
                className={`px-4 py-1.5 rounded-lg text-[10px] font-bold uppercase transition-all cursor-pointer ${activeTab === "allocations" ? "bg-white text-[#FF4747] shadow-sm" : "text-[#666] hover:text-[#1a1a1a]"}`}
              >
                {t("adminResources.header.tabAllocations") || "Allocations"}
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
                <option value="ALL">{t("adminResources.filters.allEvents")}</option>
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
                <option value="ALL">{t("adminResources.filters.allLocations")}</option>
                {filterLocations.map(loc => <option key={loc.locationId} value={loc.locationId}>{loc.venueName}</option>)}
              </select>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative w-72">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#aaa]" size={13} />
            <input
              type="text"
              placeholder={activeTab === "assets" ? t("adminResources.filters.searchAssetsPlaceholder") : activeTab === "rooms" ? t("adminResources.filters.searchSpacesPlaceholder") : (t("adminResources.filters.searchAllocationsPlaceholder") || "Search allocations...")}
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="w-full bg-[#f9fafb] border border-[#e5e7eb] rounded-xl pl-9 pr-4 py-2 text-xs text-[#1a1a1a] outline-none focus:border-[#FF4747] transition-colors"
            />
          </div>
        </div>

        {/* STATS OVERVIEW PANEL */}
        {!loading && (
          <div className="bg-[#f9fafb] px-8 pt-6 pb-2 shrink-0">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[
                {
                  label: t("adminResources.stats.totalAssets") || "Total Equipment",
                  value: resources.reduce((acc, r) => acc + (r.quantityAvailable || r.quantity || 0), 0),
                  desc: t("adminResources.stats.availableDesc", { count: resources.filter(r => r.status === "AVAILABLE").length }) || `${resources.filter(r => r.status === "AVAILABLE").length} available`,
                  bg: "from-blue-50 to-indigo-50/30",
                  text: "text-blue-600"
                },
                {
                  label: t("adminResources.stats.reserved") || "Reserved Assets",
                  value: resources.reduce((acc, r) => acc + (r.quantityReserved || 0), 0),
                  desc: t("adminResources.stats.reservedDesc") || "Assigned to active sessions",
                  bg: "from-amber-50 to-orange-50/30",
                  text: "text-amber-600"
                },
                {
                  label: t("adminResources.stats.spaces") || "Active Rooms & Spaces",
                  value: rooms.length,
                  desc: t("adminResources.stats.spacesDesc", { count: rooms.filter(r => r.status === "AVAILABLE").length }) || `${rooms.filter(r => r.status === "AVAILABLE").length} free of occupancy`,
                  bg: "from-emerald-50 to-teal-50/30",
                  text: "text-emerald-600"
                },
                {
                  label: t("adminResources.stats.maintenance") || "Under Maintenance",
                  value: rooms.filter(r => r.status === "MAINTENANCE").length + resources.filter(r => r.status === "MAINTENANCE").length,
                  desc: t("adminResources.stats.maintenanceDesc") || "Unavailable equipment/rooms",
                  bg: "from-rose-50 to-red-50/30",
                  text: "text-rose-600"
                }
              ].map((st, i) => (
                <div key={i} className="bg-white border border-[#e5e7eb] rounded-2xl p-4 shadow-sm flex items-center justify-between hover:-translate-y-0.5 transition-transform">
                  <div>
                    <span className="text-[9px] font-bold text-zinc-500 uppercase tracking-wider block">{st.label}</span>
                    <span className="text-lg font-black text-zinc-900 mt-1 block">{st.value}</span>
                    <span className="text-[9px] text-zinc-400 mt-0.5 block">{st.desc}</span>
                  </div>
                  <div className={`w-8 h-8 rounded-xl bg-gradient-to-br ${st.bg} flex items-center justify-center ${st.text}`}>
                    {i === 0 && <Package size={15} />}
                    {i === 1 && <Layers size={15} />}
                    {i === 2 && <Home size={15} />}
                    {i === 3 && <ShieldAlert size={15} />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* MAIN BODY AREA */}
        <div className="flex-1 flex overflow-hidden">
          {loading ? (
            <div className="flex-1 flex flex-col items-center justify-center text-[#888]">
              <div className="w-8 h-8 border-2 border-t-transparent border-[#FF4747] rounded-full animate-spin mb-3"></div>
              <span className="text-xs">{t("adminResources.loading.fetching")}</span>
            </div>
          ) : (
            <div className="flex-1 grid grid-cols-1 lg:grid-cols-[1.2fr_1.8fr] h-full overflow-hidden p-8 gap-8">
              
              {/* LEFT COLUMN: CREATE / EDIT FORM */}
              <div className="bg-white border border-[#e5e7eb] rounded-3xl p-6 shadow-sm overflow-y-auto flex flex-col h-full space-y-5">
                <div className="flex items-center justify-between border-b border-[#f3f4f6] pb-3 shrink-0">
                  <div className="flex items-center gap-2">
                    {activeTab === "assets" ? <Armchair size={16} className="text-[#FF4747]" /> : activeTab === "rooms" ? <Home size={16} className="text-[#FF4747]" /> : <Link2 size={16} className="text-[#FF4747]" />}
                    <h2 className="font-display font-bold text-xs text-[#1a1a1a]">
                      {activeTab === "assets"
                        ? (editingResource ? t("adminResources.form.editAsset") : t("adminResources.form.addAsset"))
                        : activeTab === "rooms"
                        ? (editingRoom ? t("adminResources.form.editSpace") : t("adminResources.form.addSpace"))
                        : (editingAllocation ? (t("adminResources.form.editAllocation") || "Edit Allocation") : (t("adminResources.form.addAllocation") || "New Allocation"))
                      }
                    </h2>
                  </div>
                  {(editingResource || editingRoom || editingAllocation) && (
                    <button
                      onClick={() => {
                        setEditingResource(null);
                        setEditingRoom(null);
                        setEditingAllocation(null);
                        setResourceForm(f => ({ ...f, name: "", quantity: 1, description: "" }));
                        setRoomForm(f => ({ ...f, name: "", capacity: 20, floor: "", description: "" }));
                        setAllocationForm({ resourceId: "", roomId: "", quantity: 1, startTime: "", endTime: "", status: "ACTIVE", notes: "" });
                      }}
                      className="text-[10px] text-[#aaa] hover:text-[#1a1a1a] cursor-pointer underline font-bold uppercase"
                    >
                      {t("adminResources.form.cancelEdit")}
                    </button>
                  )}
                </div>

                {activeTab === "assets" ? (
                  /* ASSETS FORM */
                  <form onSubmit={saveResource} className="space-y-4 flex-1" key="assets-form">
                    <div>
                      <label className={labelStyle}>{t("adminResources.form.targetEvent")}</label>
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
                      <label className={labelStyle}>{t("adminResources.form.allocatedLocation")}</label>
                      <select
                        value={resourceForm.locationId}
                        onChange={e => setResourceForm({ ...resourceForm, locationId: e.target.value })}
                        className="w-full bg-white border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-xs text-[#1a1a1a] outline-none focus:border-[#FF4747] transition-colors"
                      >
                        <option value="">{t("adminResources.form.noSpecificLocation")}</option>
                        {locations
                          .filter(l => l.eventId === resourceForm.eventId || l.event?.eventId === resourceForm.eventId)
                          .map(loc => <option key={loc.locationId} value={loc.locationId}>{loc.venueName}</option>)
                        }
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelStyle}>{t("adminResources.form.assetName")}</label>
                        <input
                          type="text"
                          required
                          placeholder={t("adminResources.form.assetNamePlaceholder")}
                          value={resourceForm.name}
                          onChange={e => setResourceForm({ ...resourceForm, name: e.target.value })}
                          className={inp}
                        />
                      </div>
                      <div>
                        <label className={labelStyle}>{t("adminResources.form.categoryType")}</label>
                        <select
                          value={resourceForm.type}
                          onChange={e => setResourceForm({ ...resourceForm, type: e.target.value as ResourceType })}
                          className="w-full bg-white border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-xs text-[#1a1a1a] outline-none focus:border-[#FF4747] transition-colors"
                        >
                          <option value="EQUIPMENT">{t("adminResources.options.resourceType.equipment")}</option>
                          <option value="MATERIAL">{t("adminResources.options.resourceType.material")}</option>
                          <option value="SERVICE">{t("adminResources.options.resourceType.service")}</option>
                          <option value="UTILITY">{t("adminResources.options.resourceType.utility")}</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelStyle}>{t("adminResources.form.categoryDetail")}</label>
                        <select
                          value={resourceForm.category}
                          onChange={e => setResourceForm({ ...resourceForm, category: e.target.value })}
                          className="w-full bg-white border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-xs text-[#1a1a1a] outline-none focus:border-[#FF4747] transition-colors"
                        >
                          <option value="Audio">{t("adminResources.options.category.audio")}</option>
                          <option value="Video">{t("adminResources.options.category.video")}</option>
                          <option value="Furniture">{t("adminResources.options.category.furniture")}</option>
                          <option value="IT Equipment">{t("adminResources.options.category.itEquipment")}</option>
                          <option value="Decoration">{t("adminResources.options.category.decoration")}</option>
                          <option value="Catering">{t("adminResources.options.category.catering")}</option>
                          <option value="Security">{t("adminResources.options.category.security")}</option>
                          <option value="Other">{t("adminResources.options.category.other")}</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelStyle}>{t("adminResources.form.condition")}</label>
                        <select
                          value={resourceForm.condition}
                          onChange={e => setResourceForm({ ...resourceForm, condition: e.target.value })}
                          className="w-full bg-white border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-xs text-[#1a1a1a] outline-none focus:border-[#FF4747] transition-colors"
                        >
                          <option value="New">{t("adminResources.options.condition.new")}</option>
                          <option value="Good">{t("adminResources.options.condition.good")}</option>
                          <option value="Fair">{t("adminResources.options.condition.fair")}</option>
                          <option value="Needs Repair">{t("adminResources.options.condition.needsRepair")}</option>
                          <option value="Damaged">{t("adminResources.options.condition.damaged")}</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-3">
                      <div>
                        <label className={labelStyle}>{t("adminResources.form.qtyAvailable")}</label>
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
                        <label className={labelStyle}>{t("adminResources.form.qtyReserved")}</label>
                        <input
                          type="number"
                          min={0}
                          value={resourceForm.quantityReserved}
                          onChange={e => setResourceForm({ ...resourceForm, quantityReserved: parseInt(e.target.value) || 0 })}
                          className={inp}
                        />
                      </div>
                      <div>
                        <label className={labelStyle}>{t("adminResources.form.unit")}</label>
                        <select
                          value={resourceForm.unit}
                          onChange={e => setResourceForm({ ...resourceForm, unit: e.target.value })}
                          className="w-full bg-white border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-xs text-[#1a1a1a] outline-none focus:border-[#FF4747] transition-colors"
                        >
                          <option value="Piece">{t("adminResources.options.unit.piece")}</option>
                          <option value="Set">{t("adminResources.options.unit.set")}</option>
                          <option value="Box">{t("adminResources.options.unit.box")}</option>
                          <option value="Meter">{t("adminResources.options.unit.meter")}</option>
                        </select>
                      </div>
                    </div>


                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelStyle}>{t("adminResources.form.purchaseDate")}</label>
                        <input
                          type="date"
                          value={resourceForm.purchaseDate}
                          onChange={e => setResourceForm({ ...resourceForm, purchaseDate: e.target.value })}
                          className={inp}
                        />
                      </div>
                      <div>
                        <label className={labelStyle}>{t("adminResources.form.purchaseCost")}</label>
                        <input
                          type="number"
                          step="0.01"
                          placeholder={t("adminResources.form.purchaseCostPlaceholder")}
                          value={resourceForm.purchaseCost || ""}
                          onChange={e => setResourceForm({ ...resourceForm, purchaseCost: parseFloat(e.target.value) || 0 })}
                          className={inp}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelStyle}>{t("adminResources.form.supplier")}</label>
                        <input
                          type="text"
                          placeholder={t("adminResources.form.supplierPlaceholder")}
                          value={resourceForm.supplier}
                          onChange={e => setResourceForm({ ...resourceForm, supplier: e.target.value })}
                          className={inp}
                        />
                      </div>
                      <div>
                        <label className={labelStyle}>{t("adminResources.form.warrantyExpiry")}</label>
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
                        <label className={labelStyle}>{t("adminResources.form.lastMaintenance")}</label>
                        <input
                          type="date"
                          value={resourceForm.lastMaintenance}
                          onChange={e => setResourceForm({ ...resourceForm, lastMaintenance: e.target.value })}
                          className={inp}
                        />
                      </div>
                      <div>
                        <label className={labelStyle}>{t("adminResources.form.nextMaintenance")}</label>
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
                        <label className={labelStyle}>{t("adminResources.form.barcode")}</label>
                        <input
                          type="text"
                          placeholder={t("adminResources.form.barcodePlaceholder")}
                          value={resourceForm.barcode}
                          onChange={e => setResourceForm({ ...resourceForm, barcode: e.target.value })}
                          className={inp}
                        />
                      </div>
                      <div>
                        <label className={labelStyle}>{t("adminResources.form.imageUrl")}</label>
                        <label className="flex items-center gap-3 border-2 border-dashed border-[#e5e7eb] rounded-xl px-3 py-2 cursor-pointer hover:border-[#FF4747] transition-colors group">
                          {resourceForm.image ? (
                            <img src={resourceForm.image} alt="Preview" className="w-9 h-9 rounded-lg object-cover shrink-0" />
                          ) : (
                            <div className="w-9 h-9 rounded-lg bg-[#fafafa] border border-[#e5e7eb] flex items-center justify-center shrink-0">
                              <Package size={14} className="text-[#ccc] group-hover:text-[#FF4747] transition-colors" />
                            </div>
                          )}
                          <span className="text-xs text-[#888] group-hover:text-[#FF4747] transition-colors truncate">
                            {resourceForm.image ? (t("adminResources.form.clickToChange") || "Click to change") : (t("adminResources.form.uploadPhoto") || "Upload photo")}
                          </span>
                          <input type="file" accept="image/*" className="hidden" onChange={async e => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            try {
                              setSaving(true);
                              const res = await eventService.uploadImage(file);
                              setResourceForm(f => ({ ...f, image: res.url }));
                            } catch (err: any) {
                              showToast(err.message || (t("adminResources.toast.imageUploadFailed") || "Failed to upload image"));
                            } finally {
                              setSaving(false);
                            }
                          }} />
                        </label>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelStyle}>{t("adminResources.form.allocationStatus")}</label>
                        <select
                          value={resourceForm.status}
                          onChange={e => setResourceForm({ ...resourceForm, status: e.target.value as ResourceStatus })}
                          className="w-full bg-white border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-xs text-[#1a1a1a] outline-none focus:border-[#FF4747] transition-colors"
                        >
                          <option value="AVAILABLE">{t("adminResources.options.resourceStatus.available")}</option>
                          <option value="RESERVED">{t("adminResources.options.resourceStatus.reserved")}</option>
                          <option value="MAINTENANCE">{t("adminResources.options.resourceStatus.maintenance")}</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelStyle}>{t("adminResources.form.descriptionNotes")}</label>
                        <input
                          type="text"
                          placeholder={t("adminResources.form.descriptionPlaceholder")}
                          value={resourceForm.description}
                          onChange={e => setResourceForm({ ...resourceForm, description: e.target.value })}
                          className={inp}
                        />
                      </div>
                    </div>

                    <div>
                      <label className={labelStyle}>{t("adminResources.form.additionalNotes")}</label>
                      <textarea
                        rows={2}
                        placeholder={t("adminResources.form.additionalNotesPlaceholder")}
                        value={resourceForm.notes}
                        onChange={e => setResourceForm({ ...resourceForm, notes: e.target.value })}
                        className={inp + " resize-none"}
                      />
                    </div>

                    <button type="submit" disabled={saving} className={saveBtn + " w-full justify-center mt-2"}>
                      <Save size={13} />
                      {saving ? t("adminResources.form.saving") : (editingResource ? t("adminResources.form.saveAsset") : t("adminResources.form.allocateAsset"))}
                    </button>
                  </form>
                ) : activeTab === "rooms" ? (
                  /* ROOMS FORM */
                  <form onSubmit={saveRoom} className="space-y-4 flex-1">
                    <div>
                      <label className={labelStyle}>{t("adminResources.form.targetEvent")}</label>
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
                      <label className={labelStyle}>{t("adminResources.form.venueLocation")}</label>
                      <select
                        value={roomForm.locationId}
                        onChange={e => setRoomForm({ ...roomForm, locationId: e.target.value })}
                        className="w-full bg-white border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-xs text-[#1a1a1a] outline-none focus:border-[#FF4747] transition-colors"
                      >
                        <option value="">{t("adminResources.form.noSpecificLocation")}</option>
                        {locations
                          .filter(l => l.eventId === roomForm.eventId || l.event?.eventId === roomForm.eventId)
                          .map(loc => <option key={loc.locationId} value={loc.locationId}>{loc.venueName}</option>)
                        }
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelStyle}>{t("adminResources.form.spaceName")}</label>
                        <input
                          type="text"
                          required
                          placeholder={t("adminResources.form.spaceNamePlaceholder")}
                          value={roomForm.name}
                          onChange={e => setRoomForm({ ...roomForm, name: e.target.value })}
                          className={inp}
                        />
                      </div>
                      <div>
                        <label className={labelStyle}>{t("adminResources.form.capacity")}</label>
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
                        <label className={labelStyle}>{t("adminResources.form.floorLevel")}</label>
                        <input
                          type="text"
                          placeholder={t("adminResources.form.floorPlaceholder")}
                          value={roomForm.floor}
                          onChange={e => setRoomForm({ ...roomForm, floor: e.target.value })}
                          className={inp}
                        />
                      </div>
                      <div>
                        <label className={labelStyle}>{t("adminResources.form.roomStatus")}</label>
                        <select
                          value={roomForm.status}
                          onChange={e => setRoomForm({ ...roomForm, status: e.target.value as RoomStatus })}
                          className="w-full bg-white border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-xs text-[#1a1a1a] outline-none focus:border-[#FF4747] transition-colors"
                        >
                          <option value="AVAILABLE">{t("adminResources.options.roomStatus.available")}</option>
                          <option value="OCCUPIED">{t("adminResources.options.roomStatus.occupied")}</option>
                          <option value="MAINTENANCE">{t("adminResources.options.roomStatus.maintenance")}</option>
                        </select>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelStyle}>{t("adminResources.form.roomNumber")}</label>
                        <input
                          type="text"
                          placeholder={t("adminResources.form.roomNumberPlaceholder")}
                          value={roomForm.roomNumber}
                          onChange={e => setRoomForm({ ...roomForm, roomNumber: e.target.value })}
                          className={inp}
                        />
                      </div>
                      <div>
                        <label className={labelStyle}>{t("adminResources.form.roomType")}</label>
                        <div className="flex gap-1">
                          <select
                            value={roomForm.roomType}
                            onChange={e => setRoomForm({ ...roomForm, roomType: e.target.value })}
                            className="flex-1 bg-white border border-[#e5e7eb] rounded-xl px-3 py-2 text-xs text-[#1a1a1a] outline-none focus:border-[#FF4747] transition-colors"
                          >
                            <option value="Hall">{t("adminResources.options.roomType.hall")}</option>
                            <option value="Conference Room">{t("adminResources.options.roomType.conferenceRoom")}</option>
                            <option value="Classroom">{t("adminResources.options.roomType.classroom")}</option>
                            <option value="Lab">{t("adminResources.options.roomType.lab")}</option>
                            <option value="Outdoor">{t("adminResources.options.roomType.outdoor")}</option>
                            <option value="Booth">{t("adminResources.options.roomType.booth")}</option>
                            <option value="VIP Lounge">{t("adminResources.options.roomType.vipLounge")}</option>
                            <option value="Exhibition Space">{t("adminResources.options.roomType.exhibitionSpace")}</option>
                            {customRoomTypes.map((type, idx) => (
                              <option key={idx} value={type}>{type}</option>
                            ))}
                          </select>
                          <button type="button" onClick={() => setShowAddCustomType(!showAddCustomType)} className="px-3 py-2 bg-stone-100 hover:bg-stone-200 border border-[#e5e7eb] rounded-xl text-xs font-bold shrink-0 cursor-pointer">+</button>
                        </div>
                        {showAddCustomType && (
                          <div className="mt-2 p-3 bg-stone-50 border border-[#e5e7eb] rounded-xl space-y-2">
                            <input placeholder={t("adminResources.form.customRoomTypePlaceholder")} value={newCustomType} onChange={e => setNewCustomType(e.target.value)} className="w-full bg-white border rounded-lg px-2 py-1 text-xs outline-none" />
                            <button type="button" onClick={handleAddCustomRoomType} className="w-full py-1 bg-black text-white text-xs font-bold rounded-lg hover:bg-stone-800">{t("adminResources.form.addType")}</button>
                          </div>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className={labelStyle}>{t("adminResources.form.accessibilityFeatures")}</label>
                      <input
                        type="text"
                        placeholder={t("adminResources.form.accessibilityPlaceholder")}
                        value={roomForm.accessibilityFeatures}
                        onChange={e => setRoomForm({ ...roomForm, accessibilityFeatures: e.target.value })}
                        className={inp}
                      />
                    </div>

                    <div>
                      <label className={labelStyle}>{t("adminResources.form.descriptionAccess")}</label>
                      <textarea
                        rows={3}
                        placeholder={t("adminResources.form.descriptionAccessPlaceholder")}
                        value={roomForm.description}
                        onChange={e => setRoomForm({ ...roomForm, description: e.target.value })}
                        className={inp + " resize-none"}
                      />
                    </div>

                    <button type="submit" disabled={saving} className={saveBtn + " w-full justify-center mt-2"}>
                      <Save size={13} />
                      {saving ? t("adminResources.form.saving") : (editingRoom ? t("adminResources.form.saveSpace") : t("adminResources.form.createSpace"))}
                    </button>
                  </form>
                ) : (
                  /* ALLOCATIONS FORM */
                  <form onSubmit={saveAllocation} className="space-y-4 flex-1">
                    <div>
                      <label className={labelStyle}>{t("adminResources.form.asset") || "Asset"}</label>
                      <select
                        value={allocationForm.resourceId}
                        onChange={e => setAllocationForm({ ...allocationForm, resourceId: e.target.value })}
                        className="w-full bg-white border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-xs text-[#1a1a1a] outline-none focus:border-[#FF4747] transition-colors"
                        required
                      >
                        <option value="">{t("adminResources.form.selectAsset") || "Select an asset"}</option>
                        {resources.map(res => (
                          <option key={res.resourceId || res.id} value={res.resourceId || res.id}>{res.name}</option>
                        ))}
                      </select>
                    </div>

                    {allocationForm.resourceId && (
                      <div>
                        <label className={labelStyle}>{t("adminResources.form.quantity") || "Quantity to Allocate"}</label>
                        <input
                          type="number"
                          min={1}
                          max={Math.max(1, getRemainingQuantity(allocationForm.resourceId, editingAllocation?.id))}
                          value={allocationForm.quantity}
                          onChange={e => setAllocationForm({ ...allocationForm, quantity: parseInt(e.target.value) || 1 })}
                          className={inp}
                        />
                        <p className={`text-[10px] mt-1 font-semibold ${allocationForm.quantity > getRemainingQuantity(allocationForm.resourceId, editingAllocation?.id) ? "text-red-500" : "text-[#888]"}`}>
                          {t("adminResources.form.remainingStock", { count: getRemainingQuantity(allocationForm.resourceId, editingAllocation?.id) }) || `${getRemainingQuantity(allocationForm.resourceId, editingAllocation?.id)} unit(s) remaining`}
                        </p>
                      </div>
                    )}

                    <div>
                      <label className={labelStyle}>{t("adminResources.form.room") || "Room"}</label>
                      <select
                        value={allocationForm.roomId}
                        onChange={e => setAllocationForm({ ...allocationForm, roomId: e.target.value })}
                        className="w-full bg-white border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-xs text-[#1a1a1a] outline-none focus:border-[#FF4747] transition-colors"
                        required
                      >
                        <option value="">{t("adminResources.form.selectRoom") || "Select a room"}</option>
                        {rooms.map(rm => (
                          <option key={rm.roomId || rm.id} value={rm.roomId || rm.id}>{rm.name}</option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelStyle}>{t("adminResources.form.start") || "Start"}</label>
                        <input
                          type="datetime-local"
                          value={allocationForm.startTime}
                          onChange={e => setAllocationForm({ ...allocationForm, startTime: e.target.value })}
                          className={inp}
                        />
                      </div>
                      <div>
                        <label className={labelStyle}>{t("adminResources.form.end") || "End"}</label>
                        <input
                          type="datetime-local"
                          value={allocationForm.endTime}
                          onChange={e => setAllocationForm({ ...allocationForm, endTime: e.target.value })}
                          className={inp}
                        />
                      </div>
                    </div>

                    <div>
                      <label className={labelStyle}>{t("adminResources.form.allocationStatus") || "Status"}</label>
                      <select
                        value={allocationForm.status}
                        onChange={e => setAllocationForm({ ...allocationForm, status: e.target.value })}
                        className="w-full bg-white border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-xs text-[#1a1a1a] outline-none focus:border-[#FF4747] transition-colors"
                      >
                        <option value="ACTIVE">{t("adminResources.options.allocationStatus.active") || "Active"}</option>
                        <option value="ENDED">{t("adminResources.options.allocationStatus.ended") || "Ended"}</option>
                      </select>
                    </div>

                    <div>
                      <label className={labelStyle}>{t("adminResources.form.additionalNotes")}</label>
                      <textarea
                        rows={3}
                        placeholder={t("adminResources.form.additionalNotesPlaceholder")}
                        value={allocationForm.notes}
                        onChange={e => setAllocationForm({ ...allocationForm, notes: e.target.value })}
                        className={inp + " resize-none"}
                      />
                    </div>

                    <button type="submit" disabled={saving} className={saveBtn + " w-full justify-center mt-2"}>
                      <Save size={13} />
                      {saving ? t("adminResources.form.saving") : (editingAllocation ? (t("adminResources.form.saveAllocation") || "Save Allocation") : (t("adminResources.form.createAllocation") || "Create Allocation"))}
                    </button>
                  </form>
                )}
              </div>

              {/* RIGHT COLUMN: CARDS LIST */}
              <div className="overflow-y-auto h-full space-y-4 pr-2">
                <div className="flex items-center justify-between shrink-0 mb-1">
                  <h3 className="font-bold text-xs text-[#1a1a1a] uppercase tracking-wider">
                    {activeTab === "assets"
                      ? t("adminResources.list.allocatedAssets", { count: filteredResources.length })
                      : activeTab === "rooms"
                      ? t("adminResources.list.activeSpaces", { count: filteredRooms.length })
                      : (t("adminResources.list.allocationsCount", { count: filteredAllocations.length }) || `${filteredAllocations.length} Allocations`)}
                  </h3>
                  <span className="text-[10px] text-[#aaa]">{t("adminResources.list.filteredViews")}</span>
                </div>

                {activeTab === "assets" ? (
                  /* ASSETS LIST */
                  filteredResources.length === 0 ? (
                    <div className="bg-white border border-dashed border-[#e5e7eb] rounded-3xl p-16 text-center">
                      <Package size={36} className="mx-auto text-[#ccc] mb-3" />
                      <p className="font-bold text-xs text-[#1a1a1a]">{t("adminResources.list.noAssets")}</p>
                      <p className="text-[10px] text-[#aaa] mt-1">{t("adminResources.list.noAssetsDesc")}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredResources.map(res => {
                        const statusColors =
                          res.status === "AVAILABLE" ? "bg-green-50 text-green-700 border-green-200" :
                          res.status === "RESERVED" ? "bg-blue-50 text-blue-700 border-blue-200" :
                          "bg-red-50 text-red-600 border-red-200";

                        const evName = events.find(e => e.eventId === res.eventId)?.title || t("adminResources.list.generalEvent");
                        const locName = locations.find(l => l.locationId === res.locationId)?.venueName || t("adminResources.list.noSpecificVenue");

                        return (
                          <div
                            key={res.resourceId || res.id}
                            className={`bg-white border border-[#e5e7eb] rounded-2xl p-5 space-y-3 flex flex-col justify-between hover:border-[#FF4747]/40 hover:shadow-[0_4px_20px_rgba(0,0,0,0.03)] transition-all`}
                          >
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="w-8 h-8 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center shrink-0">
                                    {getAssetIcon(res.category)}
                                  </div>
                                  <span className="font-bold text-xs text-[#1a1a1a] truncate" title={res.name}>{res.name}</span>
                                </div>
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${statusColors}`}>
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
                                  {t("adminResources.list.totalLabel", { qty: res.quantityAvailable || res.quantity, unit: res.unit || t("adminResources.list.pcsFallback") })}
                                </span>
                                {res.quantityReserved !== undefined && (
                                  <span className="px-1.5 py-0.5 bg-amber-50 text-amber-700 font-bold rounded">
                                    {t("adminResources.list.reservedLabel", { qty: res.quantityReserved })}
                                  </span>
                                )}
                                {res.quantityRemaining !== undefined && (
                                  <span className="px-1.5 py-0.5 bg-green-50 text-green-700 font-bold rounded">
                                    {t("adminResources.list.remainingLabel", { qty: res.quantityRemaining })}
                                  </span>
                                )}
                                {res.condition && (
                                  <span className="px-1.5 py-0.5 bg-stone-100 text-stone-600 rounded">
                                    {t("adminResources.list.condLabel", { condition: res.condition })}
                                  </span>
                                )}
                                {res.barcode && (
                                  <span className="px-1.5 py-0.5 bg-stone-100 text-stone-400 font-mono rounded">
                                    {t("adminResources.list.barcodeLabel", { barcode: res.barcode })}
                                  </span>
                                )}
                              </div>

                              <p className="text-[11px] text-[#666] line-clamp-2 leading-relaxed">
                                {res.description || <span className="text-[#ccc] italic">{t("adminResources.list.noDescription")}</span>}
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
                                    title={t("adminResources.list.editAssetTitle")}
                                  >
                                    <Pencil size={11} />
                                  </button>
                                  <button
                                    onClick={() => deleteResource(res.resourceId || res.id || "")}
                                    className="p-1 border border-red-100 text-red-500 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                                    title={t("adminResources.list.deleteAssetTitle")}
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
                ) : activeTab === "rooms" ? (
                  /* ROOMS LIST */
                  filteredRooms.length === 0 ? (
                    <div className="bg-white border border-dashed border-[#e5e7eb] rounded-3xl p-16 text-center">
                      <Home size={36} className="mx-auto text-[#ccc] mb-3" />
                      <p className="font-bold text-xs text-[#1a1a1a]">{t("adminResources.list.noSpaces")}</p>
                      <p className="text-[10px] text-[#aaa] mt-1">{t("adminResources.list.noSpacesDesc")}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredRooms.map(rm => {
                        const statusColors =
                          rm.status === "AVAILABLE" ? "bg-green-50 text-green-700 border-green-200" :
                          rm.status === "OCCUPIED" ? "bg-amber-50 text-amber-700 border-amber-200" :
                          "bg-red-50 text-red-600 border-red-200";

                        const evName = events.find(e => e.eventId === rm.eventId)?.title || t("adminResources.list.generalEvent");
                        const locName = locations.find(l => l.locationId === rm.locationId)?.venueName || t("adminResources.list.noSpecificVenue");

                        return (
                          <div
                            key={rm.roomId || rm.id}
                            className="bg-white border border-[#e5e7eb] rounded-2xl p-5 space-y-3 flex flex-col justify-between hover:border-[#FF4747]/40 hover:shadow-[0_4px_20px_rgba(0,0,0,0.03)] transition-all"
                          >
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="w-8 h-8 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center shrink-0">
                                    {getRoomIcon(rm.roomType)}
                                  </div>
                                  <span className="font-bold text-xs text-[#1a1a1a] truncate" title={rm.name}>{rm.name}</span>
                                </div>
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${statusColors}`}>
                                  {rm.status}
                                </span>
                              </div>

                              <div className="flex flex-wrap gap-2 text-[10px]">
                                {rm.roomNumber && (
                                  <span className="px-1.5 py-0.5 bg-[#FF4747]/10 text-[#FF4747] font-bold rounded">
                                    {t("adminResources.list.numberLabel", { number: rm.roomNumber })}
                                  </span>
                                )}
                                {rm.roomType && (
                                  <span className="px-1.5 py-0.5 bg-stone-100 text-stone-600 font-semibold rounded uppercase">
                                    {rm.roomType}
                                  </span>
                                )}
                                {rm.capacity && (
                                  <span className="px-1.5 py-0.5 bg-stone-100 text-stone-600 font-bold rounded">
                                    {t("adminResources.list.capacityLabel", { capacity: rm.capacity })}
                                  </span>
                                )}
                                {rm.floor && (
                                  <span className="px-1.5 py-0.5 bg-stone-100 text-stone-600 font-semibold rounded">
                                    {rm.floor}
                                  </span>
                                )}
                                {rm.accessibilityFeatures && (
                                  <span className="px-1.5 py-0.5 bg-sky-50 text-sky-700 rounded border border-sky-100" title={rm.accessibilityFeatures}>
                                    {t("adminResources.list.accessibilityBadge")}
                                  </span>
                                )}
                              </div>

                              <p className="text-[11px] text-[#666] line-clamp-2 leading-relaxed mt-1">
                                {rm.description || <span className="text-[#ccc] italic">{t("adminResources.list.noDescription")}</span>}
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
                                      setRoomForm({
                                        name: rm.name || "",
                                        capacity: rm.capacity || 20,
                                        floor: rm.floor || "",
                                        status: (rm.status || "AVAILABLE") as RoomStatus,
                                        eventId: rm.eventId || "",
                                        locationId: rm.locationId || "",
                                        description: rm.description || "",
                                        roomNumber: rm.roomNumber || "",
                                        roomType: rm.roomType || "Hall",
                                        accessibilityFeatures: rm.accessibilityFeatures || ""
                                      });
                                    }}
                                    className="p-1 border border-[#e5e7eb] text-[#555] rounded-lg hover:border-[#FF4747] hover:text-[#FF4747] transition-colors cursor-pointer"
                                    title={t("adminResources.list.editSpaceTitle")}
                                  >
                                    <Pencil size={11} />
                                  </button>
                                  <button
                                    onClick={() => deleteRoom(rm.roomId || rm.id || "")}
                                    className="p-1 border border-red-100 text-red-500 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                                    title={t("adminResources.list.deleteSpaceTitle")}
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
                  /* ALLOCATIONS LIST */
                  filteredAllocations.length === 0 ? (
                    <div className="bg-white border border-dashed border-[#e5e7eb] rounded-3xl p-16 text-center">
                      <Link2 size={36} className="mx-auto text-[#ccc] mb-3" />
                      <p className="font-bold text-xs text-[#1a1a1a]">{t("adminResources.list.noAllocations") || "No allocations yet"}</p>
                      <p className="text-[10px] text-[#aaa] mt-1">{t("adminResources.list.noAllocationsDesc") || "Allocate an asset to a room to see it here"}</p>
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {filteredAllocations.map(al => {
                        const statusColors = al.status === "ENDED" ? "bg-stone-100 text-stone-500 border-stone-200" : "bg-green-50 text-green-700 border-green-200";
                        return (
                          <div
                            key={al.id}
                            className="bg-white border border-[#e5e7eb] rounded-2xl p-5 space-y-3 flex flex-col justify-between hover:border-[#FF4747]/40 hover:shadow-[0_4px_20px_rgba(0,0,0,0.03)] transition-all"
                          >
                            <div className="space-y-1.5">
                              <div className="flex items-center justify-between gap-2">
                                <div className="flex items-center gap-2.5 min-w-0">
                                  <div className="w-8 h-8 rounded-xl bg-zinc-50 border border-zinc-100 flex items-center justify-center shrink-0">
                                    <Package size={15} className="text-zinc-400" />
                                  </div>
                                  <span className="font-bold text-xs text-[#1a1a1a] truncate" title={al.resourceName}>
                                    {al.resourceName || t("adminResources.list.unknownAsset") || "Unknown asset"}
                                  </span>
                                </div>
                                <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full border shrink-0 ${statusColors}`}>
                                  {al.status || "ACTIVE"}
                                </span>
                              </div>

                              <div className="flex items-center gap-1.5 text-[10px] text-[#666]">
                                <Home size={11} className="text-[#aaa]" />
                                <span className="font-medium truncate">{al.roomName || t("adminResources.list.unknownRoom") || "Unknown room"}</span>
                                <span className="px-1.5 py-0.5 bg-stone-100 text-stone-600 font-bold rounded shrink-0">
                                  {t("adminResources.list.quantityLabel", { qty: al.quantity || 1 }) || `Qty: ${al.quantity || 1}`}
                                </span>
                              </div>

                              {(al.startTime || al.endTime) && (
                                <div className="flex items-center gap-1.5 text-[10px] text-[#888]">
                                  <Calendar size={11} className="text-[#aaa]" />
                                  <span>
                                    {al.startTime ? new Date(al.startTime).toLocaleString() : (t("adminResources.list.openStart") || "Open start")}
                                    {" → "}
                                    {al.endTime ? new Date(al.endTime).toLocaleString() : (t("adminResources.list.openEnd") || "Open end")}
                                  </span>
                                </div>
                              )}

                              {al.notes && (
                                <p className="text-[11px] text-[#666] line-clamp-2 leading-relaxed">{al.notes}</p>
                              )}
                            </div>

                            <div className="border-t border-[#f3f4f6] pt-3 mt-1 flex justify-end gap-1">
                              <button
                                onClick={() => {
                                  setEditingAllocation(al);
                                  setAllocationForm({
                                    resourceId: al.resourceId || "",
                                    roomId: al.roomId || "",
                                    quantity: al.quantity || 1,
                                    startTime: al.startTime ? al.startTime.slice(0, 16) : "",
                                    endTime: al.endTime ? al.endTime.slice(0, 16) : "",
                                    status: al.status || "ACTIVE",
                                    notes: al.notes || ""
                                  });
                                }}
                                className="p-1 border border-[#e5e7eb] text-[#555] rounded-lg hover:border-[#FF4747] hover:text-[#FF4747] transition-colors cursor-pointer"
                                title={t("adminResources.list.editAllocationTitle") || "Edit allocation"}
                              >
                                <Pencil size={11} />
                              </button>
                              <button
                                onClick={() => deleteAllocation(al.id || "")}
                                className="p-1 border border-red-100 text-red-500 rounded-lg hover:bg-red-50 transition-colors cursor-pointer"
                                title={t("adminResources.list.deleteAllocationTitle") || "Delete allocation"}
                              >
                                <Trash2 size={11} />
                              </button>
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
