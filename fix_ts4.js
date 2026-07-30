const fs = require('fs');
let lines = fs.readFileSync('app/admin/events/page.tsx', 'utf8').split(/\r?\n/);

// Fix line 1138
lines[1137] = '      const payload = { question: pollForm.question, options: pollForm.options.filter(o => o.trim()) };';

// Fix line 1641-1645
lines[1640] = '                          <select';
lines[1641] = '                              className={inp}';
lines[1642] = '                              value={detailsForm.categoryId}';
lines[1643] = '                              onChange={e => setDetailsForm(f => ({ ...f, categoryId: e.target.value }))}';
lines[1644] = '                            >';
lines.splice(1645, 0,
'                              <option value="">Select Category</option>',
'                              {categories.map((c: any) => (',
'                                <option key={c.categoryId || c.id} value={c.categoryId || c.id}>{c.name}</option>',
'                              ))}',
'                            </select>'
);
// Remove the `/>` from the original CategorySelect which was probably on line 1644 (now 1644 was replaced, but what about the rest?)
// Let's just review lines 1640-1655 using PowerShell first.
