const fs = require('fs');
let content = fs.readFileSync('app/admin/events/page.tsx', 'utf8');

// 1. Move getNextSectionOrder outside and use it for displayOrder
content = content.replace(
  'const [sectionForm, setSectionForm] = useState({ title: "", content: "", imageUrl: "", displayOrder: 0, sectionType: "CUSTOM", status: "ACTIVE" });\n\n  // -- Edit mode',
  'const [sectionForm, setSectionForm] = useState({ title: "", content: "", imageUrl: "", displayOrder: 0, sectionType: "CUSTOM", status: "ACTIVE" });\n\n  const getNextSectionOrder = (secs: any[]) => secs && secs.length > 0 ? Math.max(...secs.map((s: any) => s.displayOrder || 0)) + 1 : 0;\n\n  // -- Edit mode'
);

content = content.replace(
  'displayOrder: 0, sectionType: "CUSTOM", status: "ACTIVE" }); }} className="text-xs text-[#888] hover:text-[#1a1a1a] cursor-pointer underline">Cancel</button>',
  'displayOrder: getNextSectionOrder(eventSections), sectionType: "CUSTOM", status: "ACTIVE" }); }} className="text-xs text-[#888] hover:text-[#1a1a1a] cursor-pointer underline">Cancel</button>'
);

content = content.replace(
  'const filteredSections = (sectionsList || []).filter(byEvent);\n      setEventSections(filteredSections);',
  'const filteredSections = (sectionsList || []).filter(byEvent);\n      setEventSections(filteredSections);\n      setSectionForm(prev => ({ ...prev, displayOrder: getNextSectionOrder(filteredSections) }));'
);

// We must handle the save/delete section reset properly:
content = content.replace(
  'setSectionForm({ title: "", content: "", imageUrl: "", displayOrder: 0, sectionType: "CUSTOM", status: "ACTIVE" });\n      const secs = await eventService.getEventSections(selectedId).catch(() => []);',
  'const secs = await eventService.getEventSections(selectedId).catch(() => []);\n      setSectionForm({ title: "", content: "", imageUrl: "", displayOrder: getNextSectionOrder(secs), sectionType: "CUSTOM", status: "ACTIVE" });'
);

content = content.replace(
  'setSectionForm({ title: "", content: "", imageUrl: "", displayOrder: 0, sectionType: "CUSTOM", status: "ACTIVE" });\n      }\n    } catch (err: any) {',
  'const secs = await eventService.getEventSections(selectedId).catch(() => []);\n      setSectionForm({ title: "", content: "", imageUrl: "", displayOrder: getNextSectionOrder(secs), sectionType: "CUSTOM", status: "ACTIVE" });\n      }\n    } catch (err: any) {'
);

// 2. Remove TEXT, SCHEDULE, REGISTRATION from SECTION_TYPES
content = content.replace(
  'const SECTION_TYPES: { type: string; icon: any; label: string; hint: string }[] = [\n                      { type: "HERO",          icon: ImageIcon,  label: "Hero",         hint: "Full-width banner at the top of the page" },\n                      { type: "TEXT",          icon: FileText,   label: "Text",         hint: "Title + description with optional image" },\n                      { type: "SCHEDULE",      icon: Calendar,   label: "Schedule",     hint: "Auto-pulls sessions and agenda" },\n                      { type: "IMAGE_GALLERY", icon: ImageIcon,  label: "Gallery",      hint: "Emphasises an image with caption" },\n                      { type: "REGISTRATION",  icon: Ticket,     label: "Register CTA", hint: "Call-to-action block driving registrations" },\n                      { type: "CUSTOM",        icon: Sparkles,   label: "Custom",       hint: "Freeform block — anything goes" },\n                    ];',
  'const SECTION_TYPES: { type: string; icon: any; label: string; hint: string }[] = [\n                      { type: "HERO",          icon: ImageIcon,  label: "Hero",         hint: "Full-width banner at the top of the page" },\n                      { type: "IMAGE_GALLERY", icon: ImageIcon,  label: "Gallery",      hint: "Emphasises an image with caption" },\n                      { type: "CUSTOM",        icon: Sparkles,   label: "Custom",       hint: "Freeform block — anything goes" },\n                    ];'
);

// 3. Change needsImage to needsMedia
content = content.replace(
  'const needsImage = ["HERO", "TEXT", "IMAGE_GALLERY", "CUSTOM"].includes(sectionForm.sectionType);\n                    const isAutoType = ["SCHEDULE"].includes(sectionForm.sectionType);',
  'const needsMedia = ["HERO", "IMAGE_GALLERY", "CUSTOM"].includes(sectionForm.sectionType);\n                    const isAutoType = false;'
);

// 4. Update the image input to media input block
const oldImageInputBlock = `{needsImage && (
                            <div>
                              <label className={label}>Image URL {sectionForm.sectionType === "HERO" ? "*" : "(optional)"}</label>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 relative">
                                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#888]">
                                    <ImageIcon size={16} />
                                  </div>
                                  <input required={sectionForm.sectionType === "HERO"} placeholder="https://..." value={sectionForm.imageUrl} onChange={e => setSectionForm(f => ({ ...f, imageUrl: e.target.value }))} className={\`\${inp} pl-9\`} />
                                </div>
                              </div>
                            </div>
                          )}`;

const newMediaInputBlock = `{needsMedia && (
                            <div>
                              <label className={label}>
                                {sectionForm.sectionType === "IMAGE_GALLERY" 
                                  ? "Media URL(s) (Paste comma-separated URLs for multiple images, or a single video URL) *" 
                                  : "Media URL (Image or Video) " + (sectionForm.sectionType === "HERO" ? "*" : "(optional)")}
                              </label>
                              <div className="flex items-center gap-2">
                                <div className="flex-1 relative">
                                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-[#888]">
                                    <ImageIcon size={16} />
                                  </div>
                                  <textarea rows={2} required={sectionForm.sectionType === "HERO" || sectionForm.sectionType === "IMAGE_GALLERY"} placeholder="https://example.com/img1.jpg, https://example.com/img2.jpg" value={sectionForm.imageUrl} onChange={e => setSectionForm(f => ({ ...f, imageUrl: e.target.value }))} className={\`\${inp} pl-9 py-2\`} />
                                </div>
                              </div>
                            </div>
                          )}`;

content = content.replace(oldImageInputBlock, newMediaInputBlock);

fs.writeFileSync('app/admin/events/page.tsx', content);
console.log("Restored all UI/UX refinements");
