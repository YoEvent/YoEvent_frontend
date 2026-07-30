const fs = require('fs');
let content = fs.readFileSync('app/admin/events/page.tsx', 'utf8');

// 1. Remove NewCategoryRow rendering
content = content.replace(
  /\{\/\* Inline new category \*\/\}\s*<NewCategoryRow[^\>]*\/\>/,
  ''
);

// 2. Change Category Select and "-- No category --"
const oldSelectRegex = /<select value=\{detailsForm\.categoryId\}.*?<\/select>/s;

const newSelect = `<select value={detailsForm.categoryId} onChange={async e => {
                              const val = e.target.value;
                              if (val === "ADD_NEW") {
                                const newName = window.prompt("Enter new category name:");
                                if (newName && newName.trim()) {
                                  try {
                                    const created = await eventService.createEventCategory({ tenantId: auth?.tenantId, name: newName.trim() });
                                    const cats = await eventService.getEventCategories();
                                    setCategories(cats || []);
                                    setDetailsForm(f => ({ ...f, categoryId: created?.categoryId || created?.id }));
                                  } catch (err) {
                                    alert("Failed to create category");
                                  }
                                }
                              } else {
                                setDetailsForm(f => ({ ...f, categoryId: val }));
                              }
                            }} className={inp}>
                              <option value="">No category</option>
                              {categories.map((c: any) => <option key={c.categoryId || c.id} value={c.categoryId || c.id}>{c.name}</option>)}
                              <option value="ADD_NEW" className="font-bold text-[#FF4747]">+ Add New Category</option>
                            </select>`;

content = content.replace(oldSelectRegex, newSelect);

// 3. Centralize tabs container
content = content.replace(
  'className="bg-white border-b border-[#e5e7eb] px-4 flex gap-1 overflow-x-auto shrink-0 scrollbar-hide"',
  'className="bg-white border-b border-[#e5e7eb] px-4 flex justify-center gap-1 overflow-x-auto shrink-0 scrollbar-hide"'
);

// 4. Centralize tab contents by adding `w-full mx-auto` to the tab wrappers
// This matches `<div className="max-w-4xl space-y-6">` and similar.
content = content.replace(/className="max-w-([a-z0-9]+) (space-y-|grid)/g, 'className="max-w-$1 w-full mx-auto $2');

fs.writeFileSync('app/admin/events/page.tsx', content);
console.log("Applied Category Dropdown and Centralization logic");
