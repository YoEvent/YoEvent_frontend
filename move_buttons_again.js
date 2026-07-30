const fs = require('fs');
let content = fs.readFileSync('app/admin/events/page.tsx', 'utf8');

// 1. Remove ACTION HEADER block
const actionHeaderRegex = /\s*\{\/\* ACTION HEADER \*\/\}\s*<div className="flex justify-end gap-3 p-4 bg-white border-b border-\[#e5e7eb\] shrink-0">[\s\S]*?<\/div>\s*/;
content = content.replace(actionHeaderRegex, '\n\n          ');

// 2. Inject buttons into the main Header block
const injection = `<div className="flex items-center gap-2">
                  {(selectedId || showNew) && (
                    <button onClick={() => { setShowNew(false); setSelectedId(""); }} className="px-4 py-2 bg-[#1a1a1a] text-white rounded-xl text-xs font-bold hover:bg-[#333] transition-colors cursor-pointer flex items-center gap-2">
                      <List size={14} /> View Event List
                    </button>
                  )}
                  {!showNew && (
                    <button onClick={() => { setShowNew(true); setSelectedId(""); }} className="px-4 py-2 bg-[#FF4747] text-white rounded-xl text-xs font-bold hover:bg-[#e03e3e] transition-colors cursor-pointer flex items-center gap-2">
                      <Plus size={14} /> New Event
                    </button>
                  )}
                  <div className="w-px h-6 bg-[#e5e7eb] mx-1"></div>`; // A subtle divider between our global buttons and the tab-specific save buttons

content = content.replace('<div className="flex items-center gap-2">', injection);

fs.writeFileSync('app/admin/events/page.tsx', content);
console.log("Moved buttons to main header");
