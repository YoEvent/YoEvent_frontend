const fs = require('fs');
let content = fs.readFileSync('app/admin/events/page.tsx', 'utf8');

// 1. Remove FLOATING ACTION BUTTONS
const floatingBlockRegex = /\s*\{\/\* FLOATING ACTION BUTTONS \*\/\}\s*<div className="fixed top-4 right-8 z-\[100\] flex items-center gap-3">[\s\S]*?<\/div>/;
content = content.replace(floatingBlockRegex, '');

// 2. Locate the header block where `selectedEvent?.status` is used
const headerTargetStr = 'text-[#888]"}`}>{selectedEvent?.status}</span>\n                </div>\n                <div className="flex items-center gap-2">';

const injection = `text-[#888]"}\`}>{selectedEvent?.status}</span>
                </div>
                <div className="flex items-center gap-2">
                  <button onClick={() => { setShowNew(false); setSelectedId(""); }} className="px-4 py-2 bg-[#1a1a1a] text-white rounded-xl text-xs font-bold hover:bg-[#333] transition-colors cursor-pointer flex items-center gap-2">
                    <List size={14} /> View Event List
                  </button>
                  <button onClick={() => { setShowNew(true); setSelectedId(""); }} className="px-4 py-2 bg-[#FF4747] text-white rounded-xl text-xs font-bold hover:bg-[#e03e3e] transition-colors cursor-pointer flex items-center gap-2">
                    <Plus size={14} /> New Event
                  </button>
                  <div className="w-px h-6 bg-[#e5e7eb] mx-1"></div>`;

content = content.replace(headerTargetStr, injection);

fs.writeFileSync('app/admin/events/page.tsx', content);
console.log("Moved buttons to main event editor header");
