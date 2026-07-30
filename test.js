const fs = require('fs');
let content = fs.readFileSync('app/admin/events/page.tsx', 'utf8');

// 1. Centralize tabs container
content = content.replace(
  '<div className="bg-white border-b border-[#e5e7eb] px-4 flex gap-1 overflow-x-auto shrink-0 scrollbar-hide"',
  '<div className="bg-white border-b border-[#e5e7eb] px-4 flex justify-center gap-1 overflow-x-auto shrink-0 scrollbar-hide"'
);

// 2. Centralize tab contents
content = content.replace(
  '<div className="flex-1 overflow-y-auto p-8">',
  '<div className="flex-1 overflow-y-auto p-8 flex justify-center">\n                  <div className="w-full max-w-5xl flex flex-col items-center">\n                    <div className="w-full">'
);
// Now we need to close the extra divs before `</div>\n        </div>\n      </div>\n    </div>`
// I'll just change the content containers instead.
