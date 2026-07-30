const fs = require('fs');
let content = fs.readFileSync('app/admin/events/page.tsx', 'utf8');

// replace the entire CategorySelect block
content = content.replace(/<CategorySelect[\s\S]*?categories=\{categories\}\s*\/>/, '<select className={selectInp} value={detailsForm.categoryId} onChange={e => setDetailsForm(f => ({ ...f, categoryId: e.target.value }))}><option value="">Select Category</option>{categories.map(c => <option key={c.categoryId || c.id} value={c.categoryId || c.id}>{c.name}</option>)}</select>');

// fix options: JSON.stringify
content = content.replace(/options: JSON\.stringify\(pollForm\.options\.filter\(o => o\.trim\(\)\)\),/, 'options: pollForm.options.filter(o => o.trim()),');
content = content.replace(/options: JSON\.stringify\(pollForm\.options\)/, 'options: pollForm.options');

fs.writeFileSync('app/admin/events/page.tsx', content);
