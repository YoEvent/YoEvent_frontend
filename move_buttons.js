const fs = require('fs');
let content = fs.readFileSync('app/admin/events/page.tsx', 'utf8');

// The exact floating action block to remove:
const floatingBlockRegex = /\s*\{\/\* FLOATING ACTION BUTTONS \*\/\}\s*<div className="fixed top-4 right-8 z-\[100\] flex items-center gap-3">[\s\S]*?<\/div>/;

// Replace it with nothing
content = content.replace(floatingBlockRegex, '');

// The replacement header to put in the Editor:
const headerBlock = `
            {/* ACTION HEADER */}
            <div className="flex justify-end gap-3 p-4 bg-white border-b border-[#e5e7eb] shrink-0">
              {(selectedId || showNew) && (
                <button onClick={() => { setShowNew(false); setSelectedId(""); }} className="px-4 py-2.5 bg-[#1a1a1a] text-white rounded-xl text-xs font-bold hover:bg-[#333] transition-colors cursor-pointer flex items-center gap-2">
                  <List size={14} /> View Event List
                </button>
              )}
              {!showNew && (
                <button onClick={() => { setShowNew(true); setSelectedId(""); }} className="px-4 py-2.5 bg-[#FF4747] text-white rounded-xl text-xs font-bold hover:bg-[#e03e3e] transition-colors cursor-pointer flex items-center gap-2">
                  <Plus size={14} /> New Event
                </button>
              )}
            </div>
`;

// Find where Editor starts: `<div className="flex-1 flex flex-col overflow-hidden">`
content = content.replace(
  /<div className="flex-1 flex flex-col overflow-hidden">/,
  '<div className="flex-1 flex flex-col overflow-hidden">' + headerBlock
);

fs.writeFileSync('app/admin/events/page.tsx', content);
console.log("Moved FABs to a static header and unified border radiuses.");
