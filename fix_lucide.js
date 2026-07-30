const fs = require('fs');
let content = fs.readFileSync('app/admin/events/page.tsx', 'utf8');

// The replacement probably failed.
// Let's just add `List` to the lucide-react imports if it's not there.
if (!content.includes('List\n} from "lucide-react";') && !content.includes('List } from "lucide-react";')) {
    content = content.replace(/} from "lucide-react";/, ', List } from "lucide-react";');
}

fs.writeFileSync('app/admin/events/page.tsx', content);
