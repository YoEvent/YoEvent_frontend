const fs = require('fs');
let content = fs.readFileSync('app/admin/events/page.tsx', 'utf8');

const target1 = `                          <CategorySelect
                              value={detailsForm.categoryId}
                              onChange={val => setDetailsForm(f => ({ ...f, categoryId: val }))}
                              categories={categories}
                            />`;
const replace1 = `                          <select
                              className={inp}
                              value={detailsForm.categoryId}
                              onChange={e => setDetailsForm(f => ({ ...f, categoryId: e.target.value }))}
                            >
                              <option value="">Select Category</option>
                              {categories.map((c: any) => (
                                <option key={c.categoryId || c.id} value={c.categoryId || c.id}>{c.name}</option>
                              ))}
                            </select>`;

content = content.replace(target1.replace(/\r\n/g, '\n'), replace1);

const target2 = `const payload = { question: pollForm.question, options: JSON.stringify(pollForm.options.filter(o => o.trim())), };`;
const replace2 = `const payload = { question: pollForm.question, options: pollForm.options.filter(o => o.trim()) };`;
content = content.replace(target2, replace2);

fs.writeFileSync('app/admin/events/page.tsx', content);
