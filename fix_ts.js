const fs = require('fs');
const file = 'app/admin/events/page.tsx';
let content = fs.readFileSync(file, 'utf8');

// 1. Remove duplicate getNextSectionOrder
content = content.replace(/const getNextSectionOrder = \(secs: any\[\]\) => secs && secs\.length > 0 \? Math\.max\(\.\.\.secs\.map\(\(s: any\) => s\.displayOrder \|\| 0\)\) \+ 1 : 0;\r?\n/, '');

// 2. Fix secs not found. The issue is that on line 342, `secs` is used but not defined in that scope.
// We can just use `eventSections` instead.
content = content.replace(/displayOrder: secs \? \(secs\.length > 0 \? Math\.max\(\.\.\.secs\.map\(\(s: any\) => s\.displayOrder \|\| 0\)\) \+ 1 : 0\) : 0/g, 'displayOrder: getNextSectionOrder(eventSections)');
content = content.replace(/displayOrder: secs && secs\.length > 0 \? Math\.max\(\.\.\.secs\.map\(\(s: any\) => s\.displayOrder \|\| 0\)\) \+ 1 : 0/g, 'displayOrder: getNextSectionOrder(eventSections)');

// 3. Fix Record<string, string | number>. Let's see what is on line 1139.
// If it's a string being passed as options, maybe it's `pollForm.options = JSON.stringify(...)` instead of string?
content = content.replace(/options: JSON\.stringify\(pollForm\.options\.filter\(o => o\.trim\(\)\)\),/, 'options: pollForm.options.filter(o => o.trim()),');

// 4. Fix CategorySelect
// I will just replace `<CategorySelect ... />` with a standard select input since it's just categories.
const categorySelectPattern = /<CategorySelect\s+value=\{detailsForm\.categoryId\}\s+onChange=\{val => setDetailsForm\(f => \(\{ \.\.\.f, categoryId: val \}\)\)\}\s+categories=\{categories\}\s+\/>/m;
const replacementSelect = `<select className={selectInp} value={detailsForm.categoryId} onChange={e => setDetailsForm(f => ({ ...f, categoryId: e.target.value }))}><option value="">Select Category</option>{categories.map(c => <option key={c.categoryId || c.id} value={c.categoryId || c.id}>{c.name}</option>)}</select>`;
content = content.replace(categorySelectPattern, replacementSelect);

fs.writeFileSync(file, content);
console.log("Fixed manually.");
