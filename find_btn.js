const fs = require('fs');
const lines = fs.readFileSync('app/admin/events/page.tsx', 'utf8').split('\n');

for (let i = 1220; i <= 1245; i++) {
  console.log(`Line ${i}:`, lines[i]);
}
