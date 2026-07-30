const fs = require('fs');
let content = fs.readFileSync('app/admin/events/page.tsx', 'utf8');

// Replace the </aside> that comes right before the Editor comment
const parts = content.split('</aside>');
if (parts.length > 1) {
    // There might be multiple </aside>, but the one we want is the first one in this file usually.
    // Let's find the exact block:
    content = content.replace(
      /<\/aside>[\s\r\n]*\{\/\* [^\*]*RIGHT: Editor[^\*]*\*\/\}/,
      '</aside>\n          )}\n\n          {/* -- RIGHT: Editor -- */}'
    );
}
fs.writeFileSync('app/admin/events/page.tsx', content);
console.log("Fixed missing closing bracket");
