const fs = require('fs');
let content = fs.readFileSync('app/admin/events/page.tsx', 'utf8');

// Add List icon
content = content.replace(
  'FileText, Sparkles\n} from "lucide-react";',
  'FileText, Sparkles, List\n} from "lucide-react";'
);

// Add FABs
const fabHtml = `
      {/* FLOATING ACTION BUTTONS */}
      <div className="fixed top-4 right-8 z-[100] flex items-center gap-3">
        <button onClick={() => { setShowNew(false); setSelectedId(""); }} className="px-4 py-2 bg-white text-[#1a1a1a] shadow-lg border border-[#e5e7eb] rounded-full text-xs font-bold hover:bg-[#fafafa] transition-colors cursor-pointer flex items-center gap-2">
          <List size={14} /> View Event List
        </button>
        <button onClick={() => { setShowNew(true); setSelectedId(""); }} className="px-4 py-2 bg-[#FF4747] shadow-lg text-white rounded-full text-xs font-bold hover:bg-[#e03e3e] transition-colors cursor-pointer flex items-center gap-2">
          <Plus size={14} /> New Event
        </button>
      </div>

      <div className="ml-[220px] flex-1 flex h-full overflow-hidden">`;

content = content.replace(
  '<div className="ml-[220px] flex-1 flex h-full overflow-hidden">',
  fabHtml
);

fs.writeFileSync('app/admin/events/page.tsx', content);
