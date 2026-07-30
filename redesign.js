const fs = require('fs');
let content = fs.readFileSync('app/admin/events/page.tsx', 'utf8');

// Update FABs
const oldFabs = `{/* FLOATING ACTION BUTTONS */}
      <div className="fixed top-4 right-8 z-[100] flex items-center gap-3">
        <button onClick={() => { setShowNew(false); setSelectedId(""); }} className="px-4 py-2 bg-white text-[#1a1a1a] shadow-lg border border-[#e5e7eb] rounded-full text-xs font-bold hover:bg-[#fafafa] transition-colors cursor-pointer flex items-center gap-2">
          <List size={14} /> View Event List
        </button>
        <button onClick={() => { setShowNew(true); setSelectedId(""); }} className="px-4 py-2 bg-[#FF4747] shadow-lg text-white rounded-full text-xs font-bold hover:bg-[#e03e3e] transition-colors cursor-pointer flex items-center gap-2">
          <Plus size={14} /> New Event
        </button>
      </div>`;

const newFabs = `{/* FLOATING ACTION BUTTONS */}
      <div className="fixed top-4 right-8 z-[100] flex items-center gap-3">
        {(selectedId || showNew) && (
          <button onClick={() => { setShowNew(false); setSelectedId(""); }} className="px-4 py-2 bg-[#1a1a1a] shadow-lg text-white rounded-full text-xs font-bold hover:bg-[#333] transition-colors cursor-pointer flex items-center gap-2">
            <List size={14} /> View Event List
          </button>
        )}
        {!showNew && (
          <button onClick={() => { setShowNew(true); setSelectedId(""); }} className="px-4 py-2 bg-[#FF4747] shadow-lg text-white rounded-full text-xs font-bold hover:bg-[#e03e3e] transition-colors cursor-pointer flex items-center gap-2">
            <Plus size={14} /> New Event
          </button>
        )}
      </div>`;

content = content.replace(oldFabs, newFabs);

// Wrap sidebar in condition to hide when editing/creating
content = content.replace(
  '<aside className="w-72 bg-white border-r border-[#e5e7eb] flex flex-col h-screen sticky top-0">',
  '{!(selectedId || showNew) && (\n          <aside className="w-72 bg-white border-r border-[#e5e7eb] flex flex-col h-screen sticky top-0 shrink-0">'
);

// We need to close the sidebar block. The sidebar ends right before:
// <div className="flex-1 flex flex-col overflow-hidden">
content = content.replace(
  '            </div>\n          </aside>\n\n          {/* -- RIGHT: Editor -- */}',
  '            </div>\n          </aside>\n          )}\n\n          {/* -- RIGHT: Editor -- */}'
);

// If the previous replace failed due to spaces, let's use a regex
content = content.replace(
  /<\/aside>\s*\{\/\* -- RIGHT: Editor -- \*\/\}/,
  '</aside>\n          )}\n\n          {/* -- RIGHT: Editor -- */}'
);

fs.writeFileSync('app/admin/events/page.tsx', content);
console.log("Updated redesign");
