const fs = require('fs');

const lines = fs.readFileSync('src/pages/admin/ExportedRestaurants.tsx', 'utf8').split('\n');
for (let i = 29; i < Math.min(lines.length, 80); i++) {
  console.log(`${i+1}: ${lines[i]}`);
}
