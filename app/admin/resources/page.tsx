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
  uniqueIdentifier?: string;
  itemsPerUnit?: number;
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
    uniqueIdentifier: "",
    itemsPerUnit: 1,
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

  const [showEventFilterDropdown, setShowEventFilterDropdown] = useState(false);
  const [showLocationFilterDropdown, setShowLocationFilterDropdown] = useState(false);
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  
  const [showResEventDropdown, setShowResEventDropdown] = useState(false);
  const [showResLocDropdown, setShowResLocDropdown] = useState(false);
  const [showResRoomDropdown, setShowResRoomDropdown] = useState(false);
  const [showResCategoryDropdown, setShowResCategoryDropdown] = useState(false);
  const [showResUnitDropdown, setShowResUnitDropdown] = useState(false);
  const [showResStatusDropdown, setShowResStatusDropdown] = useState(false);
  
  const [showRoomEventDropdown, setShowRoomEventDropdown] = useState(false);
  const [showRoomLocDropdown, setShowRoomLocDropdown] = useState(false);
  const [showRoomStatusDropdown, setShowRoomStatusDropdown] = useState(false);
  const [showRoomTypeDropdown, setShowRoomTypeDropdown] = useState(false);
  
  const [showAllocResDropdown, setShowAllocResDropdown] = useState(false);
  const [showAllocRoomDropdown, setShowAllocRoomDropdown] = useState(false);
  const [showAllocStatusDropdown, setShowAllocStatusDropdown] = useState(false);

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
      uniqueIdentifier: resourceForm.uniqueIdentifier || undefined,
      itemsPerUnit: resourceForm.itemsPerUnit ? Number(resourceForm.itemsPerUnit) : 1,
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
        uniqueIdentifier: "",
        itemsPerUnit: 1,
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
      const resource = resources.find(r => (r.resourceId || r.id) === al.resourceId);
      const room = rooms.find(r => (r.roomId || r.id) === al.roomId);
      const alEventId = resource?.eventId || room?.eventId;
      const alLocationId = resource?.locationId || room?.locationId;
      
      const evMatch = selectedEventId === "ALL" || alEventId === selectedEventId;
      const locMatch = selectedLocationId === "ALL" || alLocationId === selectedLocationId;
      
      const queryMatch = !searchQuery || (al.resourceName || "").toLowerCase().includes(searchQuery.toLowerCase()) || 
        (al.roomName || "").toLowerCase().includes(searchQuery.toLowerCase()) || 
        (al.notes || "").toLowerCase().includes(searchQuery.toLowerCase());
        
      return evMatch && locMatch && queryMatch;
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
            <button
              onClick={() => {
                setEditingResource(null);
                setEditingRoom(null);
                setEditingAllocation(null);
                setResourceForm(f => ({ ...f, name: "", quantity: 1, description: "" }));
                setRoomForm(f => ({ ...f, name: "", capacity: 20, floor: "", description: "" }));
                setAllocationForm({ resourceId: "", roomId: "", quantity: 1, startTime: "", endTime: "", status: "ACTIVE", notes: "" });
                setIsDrawerOpen(true);
              }}
              className="bg-[#FF4747] text-white px-4 py-2 rounded-xl text-xs font-bold hover:bg-[#e03e3e] transition-colors flex items-center gap-2 cursor-pointer shadow-sm shadow-[#FF4747]/20"
            >
              <Plus size={14} />
              {activeTab === "assets" ? t("adminResources.form.addAsset") : activeTab === "rooms" ? t("adminResources.form.addSpace") : (t("adminResources.form.addAllocation") || "New Allocation")}
            </button>
          </div>
        </header>



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
            <div className="flex-1 flex flex-col h-full overflow-hidden p-8 gap-6">
              
              {/* SLIDE-OUT DRAWER FOR CREATE/EDIT FORM */}
              <>
                {isDrawerOpen && (
                  <div className="fixed inset-0 bg-black/20 z-[60] backdrop-blur-sm transition-opacity" onClick={() => setIsDrawerOpen(false)} />
                )}
                <div className={`fixed inset-y-0 right-0 w-full sm:w-[480px] bg-white shadow-2xl z-[70] transform transition-transform duration-300 ease-in-out ${isDrawerOpen ? "translate-x-0" : "translate-x-full"} flex flex-col h-screen`}>
                  <div className="flex items-center justify-between border-b border-[#f3f4f6] p-6 shrink-0 bg-white">
                    <div className="flex items-center gap-2">
                      {activeTab === "assets" ? <Armchair size={16} className="text-[#FF4747]" /> : activeTab === "rooms" ? <Home size={16} className="text-[#FF4747]" /> : <Link2 size={16} className="text-[#FF4747]" />}
                      <h2 className="font-display font-bold text-sm text-[#1a1a1a]">
                        {activeTab === "assets"
                          ? (editingResource ? t("adminResources.form.editAsset") : t("adminResources.form.addAsset"))
                          : activeTab === "rooms"
                          ? (editingRoom ? t("adminResources.form.editSpace") : t("adminResources.form.addSpace"))
                          : (editingAllocation ? (t("adminResources.form.editAllocation") || "Edit Allocation") : (t("adminResources.form.addAllocation") || "New Allocation"))
                        }
                      </h2>
                    </div>
                    <div className="flex items-center gap-3">
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
                      <button onClick={() => setIsDrawerOpen(false)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-[#f9fafb] text-[#888] hover:text-[#1a1a1a] cursor-pointer transition-colors hover:bg-red-50 hover:text-red-500">
                        <Plus size={16} className="rotate-45" />
                      </button>
                    </div>
                  </div>

                  <div className="flex-1 overflow-y-auto p-6 flex flex-col space-y-5 pb-20">

                {activeTab === "assets" ? (
                  /* ASSETS FORM */
                  <form onSubmit={saveResource} className="space-y-4 flex-1" key="assets-form">
                    <div className="relative">
                      <label className={labelStyle}>{t("adminResources.form.targetEvent")}</label>
                      <button type="button" onClick={() => setShowResEventDropdown(v => !v)} className="w-full bg-white border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-xs text-left flex items-center justify-between cursor-pointer focus:border-[#FF4747] transition-colors">
                        <span className={resourceForm.eventId ? "text-[#1a1a1a]" : "text-[#aaa]"}>
                          {resourceForm.eventId ? events.find(ev => (ev.eventId || ev.id) === resourceForm.eventId)?.title || "Select event" : "Select event"}
                        </span>
                        <ChevronRight size={14} className={`text-[#aaa] transition-transform ${showResEventDropdown ? "rotate-90" : ""}`} />
                      </button>
                      {showResEventDropdown && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setShowResEventDropdown(false)} />
                          <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-[#e5e7eb] rounded-xl shadow-xl overflow-hidden py-1 max-h-60 overflow-y-auto">
                            {events.map(ev => {
                              const id = ev.eventId || ev.id;
                              const isSelected = id === resourceForm.eventId;
                              return (
                                <button key={id} type="button" onClick={() => { handleFormEventChange(id); setShowResEventDropdown(false); }} className={`w-full text-left px-4 py-2.5 text-xs hover:bg-[#fafafa] transition-colors cursor-pointer ${isSelected ? "text-[#FF4747] font-semibold bg-[#fff5f5]" : "text-[#1a1a1a]"}`}>
                                  {ev.title}
                                </button>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>

                    <div className="relative">
                      <label className={labelStyle}>{t("adminResources.form.allocatedLocation")}</label>
                      <button type="button" onClick={() => setShowResLocDropdown(v => !v)} className="w-full bg-white border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-xs text-left flex items-center justify-between cursor-pointer focus:border-[#FF4747] transition-colors">
                        <span className={resourceForm.locationId ? "text-[#1a1a1a]" : "text-[#aaa]"}>
                          {resourceForm.locationId ? locations.find(loc => loc.locationId === resourceForm.locationId)?.venueName || t("adminResources.form.noSpecificLocation") : t("adminResources.form.noSpecificLocation")}
                        </span>
                        <ChevronRight size={14} className={`text-[#aaa] transition-transform ${showResLocDropdown ? "rotate-90" : ""}`} />
                      </button>
                      {showResLocDropdown && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setShowResLocDropdown(false)} />
                          <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-[#e5e7eb] rounded-xl shadow-xl overflow-hidden py-1 max-h-60 overflow-y-auto">
                            <button type="button" onClick={() => { setResourceForm(f => ({ ...f, locationId: "" })); setShowResLocDropdown(false); }} className={`w-full text-left px-4 py-2.5 text-xs hover:bg-[#fafafa] transition-colors cursor-pointer ${!resourceForm.locationId ? "text-[#FF4747] font-semibold bg-[#fff5f5]" : "text-[#1a1a1a]"}`}>
                              {t("adminResources.form.noSpecificLocation")}
                            </button>
                            {locations.filter(l => l.eventId === resourceForm.eventId || l.event?.eventId === resourceForm.eventId).map(loc => {
                              const isSelected = loc.locationId === resourceForm.locationId;
                              return (
                                <button key={loc.locationId} type="button" onClick={() => { setResourceForm(f => ({ ...f, locationId: loc.locationId })); setShowResLocDropdown(false); }} className={`w-full text-left px-4 py-2.5 text-xs hover:bg-[#fafafa] transition-colors cursor-pointer ${isSelected ? "text-[#FF4747] font-semibold bg-[#fff5f5]" : "text-[#1a1a1a]"}`}>
                                  {loc.venueName}
                                </button>
                              );
                            })}
                          </div>
                        </>
                      )}
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
                      <div className="relative">
                        <label className={labelStyle}>{t("adminResources.form.categoryType")}</label>
                        <button type="button" onClick={() => setShowResRoomDropdown(v => !v)} className="w-full bg-white border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-xs text-left flex items-center justify-between cursor-pointer focus:border-[#FF4747] transition-colors">
                          <span className="text-[#1a1a1a]">
                            {resourceForm.type === "EQUIPMENT" ? t("adminResources.options.resourceType.equipment") : resourceForm.type === "MATERIAL" ? t("adminResources.options.resourceType.material") : resourceForm.type === "SERVICE" ? t("adminResources.options.resourceType.service") : t("adminResources.options.resourceType.utility")}
                          </span>
                          <ChevronRight size={14} className={`text-[#aaa] transition-transform ${showResRoomDropdown ? "rotate-90" : ""}`} />
                        </button>
                        {showResRoomDropdown && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowResRoomDropdown(false)} />
                            <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-[#e5e7eb] rounded-xl shadow-xl overflow-hidden py-1 max-h-60 overflow-y-auto">
                              {[
                                { value: "EQUIPMENT", label: t("adminResources.options.resourceType.equipment") },
                                { value: "MATERIAL", label: t("adminResources.options.resourceType.material") },
                                { value: "SERVICE", label: t("adminResources.options.resourceType.service") },
                                { value: "UTILITY", label: t("adminResources.options.resourceType.utility") }
                              ].map(opt => (
                                <button key={opt.value} type="button" onClick={() => { setResourceForm(f => ({ ...f, type: opt.value as ResourceType })); setShowResRoomDropdown(false); }} className={`w-full text-left px-4 py-2.5 text-xs hover:bg-[#fafafa] transition-colors cursor-pointer ${resourceForm.type === opt.value ? "text-[#FF4747] font-semibold bg-[#fff5f5]" : "text-[#1a1a1a]"}`}>
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="relative">
                        <label className={labelStyle}>{t("adminResources.form.categoryDetail")}</label>
                        <button type="button" onClick={() => setShowResCategoryDropdown(v => !v)} className="w-full bg-white border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-xs text-left flex items-center justify-between cursor-pointer focus:border-[#FF4747] transition-colors">
                          <span className="text-[#1a1a1a]">
                            {resourceForm.category === "Audio" ? t("adminResources.options.category.audio") : resourceForm.category === "Video" ? t("adminResources.options.category.video") : resourceForm.category === "Furniture" ? t("adminResources.options.category.furniture") : resourceForm.category === "IT Equipment" ? t("adminResources.options.category.itEquipment") : resourceForm.category === "Decoration" ? t("adminResources.options.category.decoration") : resourceForm.category === "Catering" ? t("adminResources.options.category.catering") : resourceForm.category === "Security" ? t("adminResources.options.category.security") : t("adminResources.options.category.other")}
                          </span>
                          <ChevronRight size={14} className={`text-[#aaa] transition-transform ${showResCategoryDropdown ? "rotate-90" : ""}`} />
                        </button>
                        {showResCategoryDropdown && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowResCategoryDropdown(false)} />
                            <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-[#e5e7eb] rounded-xl shadow-xl overflow-hidden py-1 max-h-60 overflow-y-auto">
                              {[
                                { value: "Audio", label: t("adminResources.options.category.audio") },
                                { value: "Video", label: t("adminResources.options.category.video") },
                                { value: "Furniture", label: t("adminResources.options.category.furniture") },
                                { value: "IT Equipment", label: t("adminResources.options.category.itEquipment") },
                                { value: "Decoration", label: t("adminResources.options.category.decoration") },
                                { value: "Catering", label: t("adminResources.options.category.catering") },
                                { value: "Security", label: t("adminResources.options.category.security") },
                                { value: "Other", label: t("adminResources.options.category.other") }
                              ].map(opt => (
                                <button key={opt.value} type="button" onClick={() => { setResourceForm(f => ({ ...f, category: opt.value })); setShowResCategoryDropdown(false); }} className={`w-full text-left px-4 py-2.5 text-xs hover:bg-[#fafafa] transition-colors cursor-pointer ${resourceForm.category === opt.value ? "text-[#FF4747] font-semibold bg-[#fff5f5]" : "text-[#1a1a1a]"}`}>
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                      <div className="relative">
                        <label className={labelStyle}>{t("adminResources.form.uniqueIdentifier") || "Unique Identifier"}</label>
                        <input
                          type="text"
                          placeholder="e.g. pt-001"
                          value={resourceForm.uniqueIdentifier}
                          onChange={e => setResourceForm({ ...resourceForm, uniqueIdentifier: e.target.value })}
                          className={inp}
                        />
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
                        <div>
                          <label className={labelStyle}>{t("adminResources.form.itemsPerUnit") || "Items per Unit"}</label>
                          <input
                            type="number"
                            min={1}
                            value={resourceForm.itemsPerUnit}
                            onChange={e => setResourceForm({ ...resourceForm, itemsPerUnit: parseInt(e.target.value) || 1 })}
                            className={inp}
                          />
                        </div>
                      </div>
                      <div className="relative">
                        <label className={labelStyle}>{t("adminResources.form.unit")}</label>
                        <button type="button" onClick={() => setShowResUnitDropdown(v => !v)} className="w-full bg-white border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-xs text-left flex items-center justify-between cursor-pointer focus:border-[#FF4747] transition-colors">
                          <span className="text-[#1a1a1a]">
                            {resourceForm.unit === "Piece" ? t("adminResources.options.unit.piece") : resourceForm.unit === "Set" ? t("adminResources.options.unit.set") : resourceForm.unit === "Box" ? t("adminResources.options.unit.box") : t("adminResources.options.unit.meter")}
                          </span>
                          <ChevronRight size={14} className={`text-[#aaa] transition-transform ${showResUnitDropdown ? "rotate-90" : ""}`} />
                        </button>
                        {showResUnitDropdown && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowResUnitDropdown(false)} />
                            <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-[#e5e7eb] rounded-xl shadow-xl overflow-hidden py-1 max-h-60 overflow-y-auto">
                              {[
                                { value: "Piece", label: t("adminResources.options.unit.piece") },
                                { value: "Set", label: t("adminResources.options.unit.set") },
                                { value: "Box", label: t("adminResources.options.unit.box") },
                                { value: "Meter", label: t("adminResources.options.unit.meter") }
                              ].map(opt => (
                                <button key={opt.value} type="button" onClick={() => { setResourceForm(f => ({ ...f, unit: opt.value })); setShowResUnitDropdown(false); }} className={`w-full text-left px-4 py-2.5 text-xs hover:bg-[#fafafa] transition-colors cursor-pointer ${resourceForm.unit === opt.value ? "text-[#FF4747] font-semibold bg-[#fff5f5]" : "text-[#1a1a1a]"}`}>
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    </div>


                    <div className="grid grid-cols-1 gap-4">
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
                      <div className="relative">
                        <label className={labelStyle}>{t("adminResources.form.allocationStatus")}</label>
                        <button type="button" onClick={() => setShowResStatusDropdown(v => !v)} className="w-full bg-white border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-xs text-left flex items-center justify-between cursor-pointer focus:border-[#FF4747] transition-colors">
                          <span className="text-[#1a1a1a]">
                            {resourceForm.status === "AVAILABLE" ? t("adminResources.options.resourceStatus.available") : resourceForm.status === "RESERVED" ? t("adminResources.options.resourceStatus.reserved") : t("adminResources.options.resourceStatus.maintenance")}
                          </span>
                          <ChevronRight size={14} className={`text-[#aaa] transition-transform ${showResStatusDropdown ? "rotate-90" : ""}`} />
                        </button>
                        {showResStatusDropdown && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowResStatusDropdown(false)} />
                            <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-[#e5e7eb] rounded-xl shadow-xl overflow-hidden py-1 max-h-60 overflow-y-auto">
                              {[
                                { value: "AVAILABLE", label: t("adminResources.options.resourceStatus.available") },
                                { value: "RESERVED", label: t("adminResources.options.resourceStatus.reserved") },
                                { value: "MAINTENANCE", label: t("adminResources.options.resourceStatus.maintenance") }
                              ].map(opt => (
                                <button key={opt.value} type="button" onClick={() => { setResourceForm(f => ({ ...f, status: opt.value as ResourceStatus })); setShowResStatusDropdown(false); }} className={`w-full text-left px-4 py-2.5 text-xs hover:bg-[#fafafa] transition-colors cursor-pointer ${resourceForm.status === opt.value ? "text-[#FF4747] font-semibold bg-[#fff5f5]" : "text-[#1a1a1a]"}`}>
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
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
                    <div className="relative">
                      <label className={labelStyle}>{t("adminResources.form.targetEvent")}</label>
                      <button type="button" onClick={() => setShowRoomEventDropdown(v => !v)} className="w-full bg-white border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-xs text-left flex items-center justify-between cursor-pointer focus:border-[#FF4747] transition-colors">
                        <span className={roomForm.eventId ? "text-[#1a1a1a]" : "text-[#aaa]"}>
                          {roomForm.eventId ? events.find(ev => (ev.eventId || ev.id) === roomForm.eventId)?.title || "Select event" : "Select event"}
                        </span>
                        <ChevronRight size={14} className={`text-[#aaa] transition-transform ${showRoomEventDropdown ? "rotate-90" : ""}`} />
                      </button>
                      {showRoomEventDropdown && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setShowRoomEventDropdown(false)} />
                          <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-[#e5e7eb] rounded-xl shadow-xl overflow-hidden py-1 max-h-60 overflow-y-auto">
                            {events.map(ev => {
                              const id = ev.eventId || ev.id;
                              const isSelected = id === roomForm.eventId;
                              return (
                                <button key={id} type="button" onClick={() => { handleFormEventChange(id); setShowRoomEventDropdown(false); }} className={`w-full text-left px-4 py-2.5 text-xs hover:bg-[#fafafa] transition-colors cursor-pointer ${isSelected ? "text-[#FF4747] font-semibold bg-[#fff5f5]" : "text-[#1a1a1a]"}`}>
                                  {ev.title}
                                </button>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>

                    <div className="relative">
                      <label className={labelStyle}>{t("adminResources.form.venueLocation")}</label>
                      <button type="button" onClick={() => setShowRoomLocDropdown(v => !v)} className="w-full bg-white border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-xs text-left flex items-center justify-between cursor-pointer focus:border-[#FF4747] transition-colors">
                        <span className={roomForm.locationId ? "text-[#1a1a1a]" : "text-[#aaa]"}>
                          {roomForm.locationId ? locations.find(loc => loc.locationId === roomForm.locationId)?.venueName || t("adminResources.form.noSpecificLocation") : t("adminResources.form.noSpecificLocation")}
                        </span>
                        <ChevronRight size={14} className={`text-[#aaa] transition-transform ${showRoomLocDropdown ? "rotate-90" : ""}`} />
                      </button>
                      {showRoomLocDropdown && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setShowRoomLocDropdown(false)} />
                          <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-[#e5e7eb] rounded-xl shadow-xl overflow-hidden py-1 max-h-60 overflow-y-auto">
                            <button type="button" onClick={() => { setRoomForm(f => ({ ...f, locationId: "" })); setShowRoomLocDropdown(false); }} className={`w-full text-left px-4 py-2.5 text-xs hover:bg-[#fafafa] transition-colors cursor-pointer ${!roomForm.locationId ? "text-[#FF4747] font-semibold bg-[#fff5f5]" : "text-[#1a1a1a]"}`}>
                              {t("adminResources.form.noSpecificLocation")}
                            </button>
                            {locations.filter(l => l.eventId === roomForm.eventId || l.event?.eventId === roomForm.eventId).map(loc => {
                              const isSelected = loc.locationId === roomForm.locationId;
                              return (
                                <button key={loc.locationId} type="button" onClick={() => { setRoomForm(f => ({ ...f, locationId: loc.locationId })); setShowRoomLocDropdown(false); }} className={`w-full text-left px-4 py-2.5 text-xs hover:bg-[#fafafa] transition-colors cursor-pointer ${isSelected ? "text-[#FF4747] font-semibold bg-[#fff5f5]" : "text-[#1a1a1a]"}`}>
                                  {loc.venueName}
                                </button>
                              );
                            })}
                          </div>
                        </>
                      )}
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
                      <div className="relative">
                        <label className={labelStyle}>{t("adminResources.form.roomStatus")}</label>
                        <button type="button" onClick={() => setShowRoomStatusDropdown(v => !v)} className="w-full bg-white border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-xs text-left flex items-center justify-between cursor-pointer focus:border-[#FF4747] transition-colors">
                          <span className="text-[#1a1a1a]">
                            {roomForm.status === "AVAILABLE" ? t("adminResources.options.roomStatus.available") : roomForm.status === "OCCUPIED" ? t("adminResources.options.roomStatus.occupied") : t("adminResources.options.roomStatus.maintenance")}
                          </span>
                          <ChevronRight size={14} className={`text-[#aaa] transition-transform ${showRoomStatusDropdown ? "rotate-90" : ""}`} />
                        </button>
                        {showRoomStatusDropdown && (
                          <>
                            <div className="fixed inset-0 z-40" onClick={() => setShowRoomStatusDropdown(false)} />
                            <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-[#e5e7eb] rounded-xl shadow-xl overflow-hidden py-1 max-h-60 overflow-y-auto">
                              {[
                                { value: "AVAILABLE", label: t("adminResources.options.roomStatus.available") },
                                { value: "OCCUPIED", label: t("adminResources.options.roomStatus.occupied") },
                                { value: "MAINTENANCE", label: t("adminResources.options.roomStatus.maintenance") }
                              ].map(opt => (
                                <button key={opt.value} type="button" onClick={() => { setRoomForm(f => ({ ...f, status: opt.value as RoomStatus })); setShowRoomStatusDropdown(false); }} className={`w-full text-left px-4 py-2.5 text-xs hover:bg-[#fafafa] transition-colors cursor-pointer ${roomForm.status === opt.value ? "text-[#FF4747] font-semibold bg-[#fff5f5]" : "text-[#1a1a1a]"}`}>
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </>
                        )}
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
                      <div className="relative">
                        <label className={labelStyle}>{t("adminResources.form.roomType")}</label>
                        <div className="flex gap-1 relative">
                          <button type="button" onClick={() => setShowRoomTypeDropdown(v => !v)} className="flex-1 bg-white border border-[#e5e7eb] rounded-xl px-3 py-2 text-xs text-left flex items-center justify-between cursor-pointer focus:border-[#FF4747] transition-colors">
                            <span className="text-[#1a1a1a]">
                              {roomForm.roomType === "Hall" ? t("adminResources.options.roomType.hall") : roomForm.roomType === "Conference Room" ? t("adminResources.options.roomType.conferenceRoom") : roomForm.roomType === "Classroom" ? t("adminResources.options.roomType.classroom") : roomForm.roomType === "Lab" ? t("adminResources.options.roomType.lab") : roomForm.roomType === "Outdoor" ? t("adminResources.options.roomType.outdoor") : roomForm.roomType === "Booth" ? t("adminResources.options.roomType.booth") : roomForm.roomType === "VIP Lounge" ? t("adminResources.options.roomType.vipLounge") : roomForm.roomType === "Exhibition Space" ? t("adminResources.options.roomType.exhibitionSpace") : roomForm.roomType}
                            </span>
                            <ChevronRight size={14} className={`text-[#aaa] transition-transform ${showRoomTypeDropdown ? "rotate-90" : ""}`} />
                          </button>
                          <button type="button" onClick={() => setShowAddCustomType(!showAddCustomType)} className="px-3 py-2 bg-stone-100 hover:bg-stone-200 border border-[#e5e7eb] rounded-xl text-xs font-bold shrink-0 cursor-pointer">+</button>
                          {showRoomTypeDropdown && (
                            <>
                              <div className="fixed inset-0 z-40" onClick={() => setShowRoomTypeDropdown(false)} />
                              <div className="absolute left-0 right-[44px] top-full mt-1.5 z-50 bg-white border border-[#e5e7eb] rounded-xl shadow-xl overflow-hidden py-1 max-h-60 overflow-y-auto">
                                {[
                                  { value: "Hall", label: t("adminResources.options.roomType.hall") },
                                  { value: "Conference Room", label: t("adminResources.options.roomType.conferenceRoom") },
                                  { value: "Classroom", label: t("adminResources.options.roomType.classroom") },
                                  { value: "Lab", label: t("adminResources.options.roomType.lab") },
                                  { value: "Outdoor", label: t("adminResources.options.roomType.outdoor") },
                                  { value: "Booth", label: t("adminResources.options.roomType.booth") },
                                  { value: "VIP Lounge", label: t("adminResources.options.roomType.vipLounge") },
                                  { value: "Exhibition Space", label: t("adminResources.options.roomType.exhibitionSpace") },
                                  ...customRoomTypes.map(type => ({ value: type, label: type }))
                                ].map((opt, idx) => (
                                  <button key={idx} type="button" onClick={() => { setRoomForm(f => ({ ...f, roomType: opt.value })); setShowRoomTypeDropdown(false); }} className={`w-full text-left px-4 py-2.5 text-xs hover:bg-[#fafafa] transition-colors cursor-pointer ${roomForm.roomType === opt.value ? "text-[#FF4747] font-semibold bg-[#fff5f5]" : "text-[#1a1a1a]"}`}>
                                    {opt.label}
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
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
                    <div className="relative">
                      <label className={labelStyle}>{t("adminResources.form.asset") || "Asset"}</label>
                      <button type="button" onClick={() => setShowAllocResDropdown(v => !v)} className="w-full bg-white border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-xs text-left flex items-center justify-between cursor-pointer focus:border-[#FF4747] transition-colors">
                        <span className={allocationForm.resourceId ? "text-[#1a1a1a]" : "text-[#aaa]"}>
                          {allocationForm.resourceId ? resources.find(res => (res.resourceId || res.id) === allocationForm.resourceId)?.name || "Select an asset" : t("adminResources.form.selectAsset") || "Select an asset"}
                        </span>
                        <ChevronRight size={14} className={`text-[#aaa] transition-transform ${showAllocResDropdown ? "rotate-90" : ""}`} />
                      </button>
                      {showAllocResDropdown && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setShowAllocResDropdown(false)} />
                          <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-[#e5e7eb] rounded-xl shadow-xl overflow-hidden py-1 max-h-60 overflow-y-auto">
                            <button type="button" onClick={() => { setAllocationForm(f => ({ ...f, resourceId: "" })); setShowAllocResDropdown(false); }} className={`w-full text-left px-4 py-2.5 text-xs hover:bg-[#fafafa] transition-colors cursor-pointer ${!allocationForm.resourceId ? "text-[#FF4747] font-semibold bg-[#fff5f5]" : "text-[#1a1a1a]"}`}>
                              {t("adminResources.form.selectAsset") || "Select an asset"}
                            </button>
                            {resources.filter(res => {
                              const selectedRoom = rooms.find(rm => (rm.roomId || rm.id) === allocationForm.roomId);
                              if (!selectedRoom || !selectedRoom.locationId) return true;
                              return !res.locationId || res.locationId === selectedRoom.locationId;
                            }).map(res => {
                              const id = res.resourceId || res.id;
                              const isSelected = id === allocationForm.resourceId;
                              return (
                                <button key={id} type="button" onClick={() => { 
                                  const newResId = id || "";
                                  const selectedRoom = rooms.find(r => (r.roomId || r.id) === allocationForm.roomId);
                                  const isRoomValid = !selectedRoom || !selectedRoom.locationId || !res.locationId || selectedRoom.locationId === res.locationId;
                                  setAllocationForm(f => ({ ...f, resourceId: newResId, roomId: isRoomValid ? f.roomId : "" }));
                                  setShowAllocResDropdown(false); 
                                }} className={`w-full text-left px-4 py-2.5 text-xs hover:bg-[#fafafa] transition-colors cursor-pointer ${isSelected ? "text-[#FF4747] font-semibold bg-[#fff5f5]" : "text-[#1a1a1a]"}`}>
                                  {res.name}
                                </button>
                              );
                            })}
                          </div>
                        </>
                      )}
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

                    <div className="relative">
                      <label className={labelStyle}>{t("adminResources.form.room") || "Room"}</label>
                      <button type="button" onClick={() => setShowAllocRoomDropdown(v => !v)} className="w-full bg-white border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-xs text-left flex items-center justify-between cursor-pointer focus:border-[#FF4747] transition-colors">
                        <span className={allocationForm.roomId ? "text-[#1a1a1a]" : "text-[#aaa]"}>
                          {allocationForm.roomId ? rooms.find(rm => (rm.roomId || rm.id) === allocationForm.roomId)?.name || "Select a room" : t("adminResources.form.selectRoom") || "Select a room"}
                        </span>
                        <ChevronRight size={14} className={`text-[#aaa] transition-transform ${showAllocRoomDropdown ? "rotate-90" : ""}`} />
                      </button>
                      {showAllocRoomDropdown && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setShowAllocRoomDropdown(false)} />
                          <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-[#e5e7eb] rounded-xl shadow-xl overflow-hidden py-1 max-h-60 overflow-y-auto">
                            <button type="button" onClick={() => { setAllocationForm(f => ({ ...f, roomId: "" })); setShowAllocRoomDropdown(false); }} className={`w-full text-left px-4 py-2.5 text-xs hover:bg-[#fafafa] transition-colors cursor-pointer ${!allocationForm.roomId ? "text-[#FF4747] font-semibold bg-[#fff5f5]" : "text-[#1a1a1a]"}`}>
                              {t("adminResources.form.selectRoom") || "Select a room"}
                            </button>
                            {rooms.filter(rm => {
                              const selectedRes = resources.find(res => (res.resourceId || res.id) === allocationForm.resourceId);
                              if (!selectedRes || !selectedRes.locationId) return true;
                              return !rm.locationId || rm.locationId === selectedRes.locationId;
                            }).map(rm => {
                              const id = rm.roomId || rm.id;
                              const isSelected = id === allocationForm.roomId;
                              return (
                                <button key={id} type="button" onClick={() => { 
                                  const newRoomId = id || "";
                                  const selectedRes = resources.find(r => (r.resourceId || r.id) === allocationForm.resourceId);
                                  const isResValid = !selectedRes || !selectedRes.locationId || !rm.locationId || selectedRes.locationId === rm.locationId;
                                  setAllocationForm(f => ({ ...f, roomId: newRoomId, resourceId: isResValid ? f.resourceId : "" }));
                                  setShowAllocRoomDropdown(false); 
                                }} className={`w-full text-left px-4 py-2.5 text-xs hover:bg-[#fafafa] transition-colors cursor-pointer ${isSelected ? "text-[#FF4747] font-semibold bg-[#fff5f5]" : "text-[#1a1a1a]"}`}>
                                  {rm.name}
                                </button>
                              );
                            })}
                          </div>
                        </>
                      )}
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

                    <div className="relative">
                      <label className={labelStyle}>{t("adminResources.form.allocationStatus") || "Status"}</label>
                      <button type="button" onClick={() => setShowAllocStatusDropdown(v => !v)} className="w-full bg-white border border-[#e5e7eb] rounded-xl px-4 py-2.5 text-xs text-left flex items-center justify-between cursor-pointer focus:border-[#FF4747] transition-colors">
                        <span className="text-[#1a1a1a]">
                          {allocationForm.status === "ACTIVE" ? (t("adminResources.options.allocationStatus.active") || "Active") : (t("adminResources.options.allocationStatus.ended") || "Ended")}
                        </span>
                        <ChevronRight size={14} className={`text-[#aaa] transition-transform ${showAllocStatusDropdown ? "rotate-90" : ""}`} />
                      </button>
                      {showAllocStatusDropdown && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setShowAllocStatusDropdown(false)} />
                          <div className="absolute left-0 right-0 top-full mt-1.5 z-50 bg-white border border-[#e5e7eb] rounded-xl shadow-xl overflow-hidden py-1 max-h-60 overflow-y-auto">
                            {[
                              { value: "ACTIVE", label: t("adminResources.options.allocationStatus.active") || "Active" },
                              { value: "ENDED", label: t("adminResources.options.allocationStatus.ended") || "Ended" }
                            ].map(opt => (
                              <button key={opt.value} type="button" onClick={() => { setAllocationForm(f => ({ ...f, status: opt.value })); setShowAllocStatusDropdown(false); }} className={`w-full text-left px-4 py-2.5 text-xs hover:bg-[#fafafa] transition-colors cursor-pointer ${allocationForm.status === opt.value ? "text-[#FF4747] font-semibold bg-[#fff5f5]" : "text-[#1a1a1a]"}`}>
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </>
                      )}
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
                </div>
              </>

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
                  <div className="flex items-center gap-3">
                    {/* Event Filter */}
                    <div className="relative flex items-center gap-1.5 bg-[#f9fafb] border border-[#e5e7eb] rounded-xl px-3 py-1.5 shrink-0">
                      <Calendar size={13} className="text-[#888]" />
                      <button type="button" onClick={() => setShowEventFilterDropdown(v => !v)} className="bg-transparent text-[11px] text-[#1a1a1a] font-semibold outline-none cursor-pointer flex items-center justify-between gap-2 min-w-[100px]">
                        <span>{selectedEventId === "ALL" ? t("adminResources.filters.allEvents") : events.find(ev => (ev.eventId || ev.id) === selectedEventId)?.title || t("adminResources.filters.allEvents")}</span>
                        <ChevronRight size={10} className={`text-[#aaa] transition-transform ${showEventFilterDropdown ? "rotate-90" : ""}`} />
                      </button>
                      {showEventFilterDropdown && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setShowEventFilterDropdown(false)} />
                          <div className="absolute right-0 top-full mt-1.5 z-50 bg-white border border-[#e5e7eb] rounded-xl shadow-xl overflow-hidden py-1 min-w-[150px] max-h-60 overflow-y-auto">
                            <button type="button" onClick={() => { setSelectedEventId("ALL"); setSelectedLocationId("ALL"); setShowEventFilterDropdown(false); }} className={`w-full text-left px-3 py-1.5 text-[11px] hover:bg-[#fafafa] transition-colors cursor-pointer ${selectedEventId === "ALL" ? "text-[#FF4747] font-semibold bg-[#fff5f5]" : "text-[#1a1a1a]"}`}>
                              {t("adminResources.filters.allEvents")}
                            </button>
                            {events.map(ev => {
                              const id = ev.eventId || ev.id;
                              const isSelected = id === selectedEventId;
                              return (
                                <button key={id} type="button" onClick={() => { setSelectedEventId(id); setSelectedLocationId("ALL"); setShowEventFilterDropdown(false); }} className={`w-full text-left px-3 py-1.5 text-[11px] hover:bg-[#fafafa] transition-colors cursor-pointer ${isSelected ? "text-[#FF4747] font-semibold bg-[#fff5f5]" : "text-[#1a1a1a]"}`}>
                                  {ev.title}
                                </button>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Location Filter */}
                    <div className="relative flex items-center gap-1.5 bg-[#f9fafb] border border-[#e5e7eb] rounded-xl px-3 py-1.5 shrink-0">
                      <MapPin size={13} className="text-[#888]" />
                      <button type="button" onClick={() => setShowLocationFilterDropdown(v => !v)} className="bg-transparent text-[11px] text-[#1a1a1a] font-semibold outline-none cursor-pointer flex items-center justify-between gap-2 min-w-[120px]">
                        <span>{selectedLocationId === "ALL" ? t("adminResources.filters.allLocations") : filterLocations.find(loc => loc.locationId === selectedLocationId)?.venueName || t("adminResources.filters.allLocations")}</span>
                        <ChevronRight size={10} className={`text-[#aaa] transition-transform ${showLocationFilterDropdown ? "rotate-90" : ""}`} />
                      </button>
                      {showLocationFilterDropdown && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setShowLocationFilterDropdown(false)} />
                          <div className="absolute right-0 top-full mt-1.5 z-50 bg-white border border-[#e5e7eb] rounded-xl shadow-xl overflow-hidden py-1 min-w-[150px] max-h-60 overflow-y-auto">
                            <button type="button" onClick={() => { setSelectedLocationId("ALL"); setShowLocationFilterDropdown(false); }} className={`w-full text-left px-3 py-1.5 text-[11px] hover:bg-[#fafafa] transition-colors cursor-pointer ${selectedLocationId === "ALL" ? "text-[#FF4747] font-semibold bg-[#fff5f5]" : "text-[#1a1a1a]"}`}>
                              {t("adminResources.filters.allLocations")}
                            </button>
                            {filterLocations.map(loc => {
                              const isSelected = loc.locationId === selectedLocationId;
                              return (
                                <button key={loc.locationId} type="button" onClick={() => { setSelectedLocationId(loc.locationId); setShowLocationFilterDropdown(false); }} className={`w-full text-left px-3 py-1.5 text-[11px] hover:bg-[#fafafa] transition-colors cursor-pointer ${isSelected ? "text-[#FF4747] font-semibold bg-[#fff5f5]" : "text-[#1a1a1a]"}`}>
                                  {loc.venueName}
                                </button>
                              );
                            })}
                          </div>
                        </>
                      )}
                    </div>

                    {/* Search */}
                    <div className="relative flex items-center">
                      <button type="button" onClick={() => setShowSearchInput(v => !v)} className="w-8 h-8 flex items-center justify-center rounded-xl bg-[#f9fafb] border border-[#e5e7eb] text-[#888] hover:text-[#1a1a1a] hover:border-[#FF4747] transition-colors cursor-pointer" title="Search">
                        <Search size={14} />
                      </button>
                      
                      {showSearchInput && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => setShowSearchInput(false)} />
                          <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-[#e5e7eb] rounded-xl shadow-lg flex items-center px-3 py-2 z-50 transform origin-top transition-all">
                            <Search className="text-[#aaa] mr-2 shrink-0" size={13} />
                            <input
                              type="text"
                              placeholder={activeTab === "assets" ? t("adminResources.filters.searchAssetsPlaceholder") : activeTab === "rooms" ? t("adminResources.filters.searchSpacesPlaceholder") : (t("adminResources.filters.searchAllocationsPlaceholder") || "Search allocations...")}
                              value={searchQuery}
                              onChange={e => setSearchQuery(e.target.value)}
                              className="w-full bg-transparent text-[11px] text-[#1a1a1a] outline-none placeholder:text-[#aaa]"
                              autoFocus
                            />
                          </div>
                        </>
                      )}
                    </div>
                  </div>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
                                {res.itemsPerUnit && res.itemsPerUnit > 1 && (
                                  <span className="px-1.5 py-0.5 bg-stone-100 text-stone-600 rounded">
                                    {res.itemsPerUnit} items per {res.unit || 'unit'}
                                  </span>
                                )}
                                {res.uniqueIdentifier && (
                                  <span className="px-1.5 py-0.5 bg-stone-100 text-stone-400 font-mono rounded">
                                    {res.uniqueIdentifier}
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
                                      setEditingResource(res); setIsDrawerOpen(true);
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
                                        uniqueIdentifier: res.uniqueIdentifier || "",
                                        itemsPerUnit: res.itemsPerUnit || 1,
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
                                      setEditingRoom(rm); setIsDrawerOpen(true);
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
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
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
                                  setEditingAllocation(al); setIsDrawerOpen(true);
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

        {/* FLOATING ACTION BUTTONS FOR TABS */}
        <div className="fixed bottom-8 right-8 flex flex-col gap-4 z-50">
          <div className="group relative flex items-center justify-end">
            <span className="absolute right-16 px-3 py-1.5 bg-[#1a1a1a] text-white text-[11px] font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap shadow-lg">
              {t("adminResources.header.tabAssets") || "Assets & Equipment"}
            </span>
            <button
              onClick={() => { setActiveTab("assets"); setSearchQuery(""); }}
              className={`flex items-center justify-center w-14 h-14 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-300 transform hover:-translate-y-1 hover:scale-105 cursor-pointer border ${activeTab === "assets" ? "bg-[#FF4747] text-white border-transparent" : "bg-white text-[#1a1a1a] hover:text-[#FF4747] border-stone-100"}`}
            >
              <Package size={22} className={activeTab === "assets" ? "" : "opacity-80"} />
            </button>
          </div>
          
          <div className="group relative flex items-center justify-end">
            <span className="absolute right-16 px-3 py-1.5 bg-[#1a1a1a] text-white text-[11px] font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap shadow-lg">
              {t("adminResources.header.tabRooms") || "Rooms & Venues"}
            </span>
            <button
              onClick={() => { setActiveTab("rooms"); setSearchQuery(""); }}
              className={`flex items-center justify-center w-14 h-14 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-300 transform hover:-translate-y-1 hover:scale-105 cursor-pointer border ${activeTab === "rooms" ? "bg-[#FF4747] text-white border-transparent" : "bg-white text-[#1a1a1a] hover:text-[#FF4747] border-stone-100"}`}
            >
              <Home size={22} className={activeTab === "rooms" ? "" : "opacity-80"} />
            </button>
          </div>
          
          <div className="group relative flex items-center justify-end">
            <span className="absolute right-16 px-3 py-1.5 bg-[#1a1a1a] text-white text-[11px] font-bold rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none whitespace-nowrap shadow-lg">
              {t("adminResources.header.tabAllocations") || "Allocations"}
            </span>
            <button
              onClick={() => { setActiveTab("allocations"); setSearchQuery(""); }}
              className={`flex items-center justify-center w-14 h-14 rounded-full shadow-[0_8px_30px_rgb(0,0,0,0.12)] transition-all duration-300 transform hover:-translate-y-1 hover:scale-105 cursor-pointer border ${activeTab === "allocations" ? "bg-[#FF4747] text-white border-transparent" : "bg-white text-[#1a1a1a] hover:text-[#FF4747] border-stone-100"}`}
            >
              <Link2 size={22} className={activeTab === "allocations" ? "" : "opacity-80"} />
            </button>
          </div>
        </div>

      </div>
    </div>
  );
}
