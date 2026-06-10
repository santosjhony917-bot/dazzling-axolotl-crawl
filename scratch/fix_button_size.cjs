const fs = require('fs');

let content = fs.readFileSync('src/pages/admin/ExportedRestaurants.tsx', 'utf8');

// Replace size="xs" with size="sm"
const updated = content.replace(/size="xs"/g, 'size="sm"');

fs.writeFileSync('src/pages/admin/ExportedRestaurants.tsx', updated);
console.log("Updated size=\"xs\" to size=\"sm\".");
