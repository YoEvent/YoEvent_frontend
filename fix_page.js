const fs = require('fs');
const file = 'c:/Users/VICTUS/Desktop/Projects/School Projects/YoEventFront/YoEvent_frontend/app/admin/events/page.tsx';
let content = fs.readFileSync(file, 'utf8');

content = content.replace(
  ']);\n\n      // Populate event details directly from the fetched event (avoids stale state)',
  ']);\n\n      const getNextSectionOrder = (secs) => secs && secs.length > 0 ? Math.max(...secs.map((s) => s.displayOrder || 0)) + 1 : 0;\n\n      // Populate event details directly from the fetched event (avoids stale state)'
);

content = content.replace(
  'setEventSections((sectionsList || []).filter(byEvent));',
  'const filteredSections = (sectionsList || []).filter(byEvent);\n      setEventSections(filteredSections);\n      setSectionForm(prev => ({ ...prev, displayOrder: getNextSectionOrder(filteredSections) }));'
);

content = content.replace(
  'setSectionForm({ title: "", content: "", imageUrl: "", displayOrder: 0, sectionType: "CUSTOM", status: "ACTIVE" });\n      const secs = await eventService.getEventSections(selectedId).catch(() => []);',
  'const secs = await eventService.getEventSections(selectedId).catch(() => []);\n      setSectionForm({ title: "", content: "", imageUrl: "", displayOrder: secs && secs.length > 0 ? Math.max(...secs.map((s) => s.displayOrder || 0)) + 1 : 0, sectionType: "CUSTOM", status: "ACTIVE" });'
);

content = content.replace(
  'setSectionForm({ title: "", content: "", imageUrl: "", displayOrder: 0, sectionType: "CUSTOM", status: "ACTIVE" });\n      }\n    } catch (err: any) {\n      showToast(err.message || t("adminEvents.toasts.sectionDeleteFailed"));',
  'setSectionForm({ title: "", content: "", imageUrl: "", displayOrder: secs && secs.length > 0 ? Math.max(...secs.map((s) => s.displayOrder || 0)) + 1 : 0, sectionType: "CUSTOM", status: "ACTIVE" });\n      }\n    } catch (err: any) {\n      showToast(err.message || t("adminEvents.toasts.sectionDeleteFailed"));'
);

content = content.replace(
  'setSectionForm({ title: "", content: "", imageUrl: "", displayOrder: 0, sectionType: "CUSTOM", status: "ACTIVE" }); }} className="text-xs text-[#888] hover:text-[#1a1a1a] cursor-pointer underline">Cancel</button>',
  'setSectionForm({ title: "", content: "", imageUrl: "", displayOrder: getNextSectionOrder(eventSections), sectionType: "CUSTOM", status: "ACTIVE" }); }} className="text-xs text-[#888] hover:text-[#1a1a1a] cursor-pointer underline">Cancel</button>'
);

fs.writeFileSync(file, content);
console.log("Fixed page.tsx");
