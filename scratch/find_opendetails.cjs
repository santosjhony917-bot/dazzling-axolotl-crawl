const fs = require('fs');

const content = fs.readFileSync('src/pages/admin/ExportedRestaurants.tsx', 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  if (line.includes('const openDetails')) {
    console.log(`Found openDetails at line ${idx+1}:`);
    for (let i = Math.max(0, idx - 5); i < Math.min(lines.length, idx + 15); i++) {
      console.log(`${i+1}: ${lines[i]}`);
    }
  }
});
