const fs = require('fs');
const content = fs.readFileSync('src/pages/admin/ExportedRestaurants.tsx', 'utf8');
const lines = content.split('\n');
console.log(`Active file has ${lines.length} lines.`);
console.log(`First 20 lines:`);
console.log(lines.slice(0, 20).join('\n'));
console.log(`Last 20 lines:`);
console.log(lines.slice(-20).join('\n'));
