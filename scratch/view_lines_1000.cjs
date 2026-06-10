const fs = require('fs');

const lines = fs.readFileSync('src/pages/admin/ExportedRestaurants.tsx', 'utf8').split('\n');
console.log(`--- Lines 1000 to 1030 ---`);
for (let i = 999; i < Math.min(lines.length, 1030); i++) {
  console.log(`${i+1}: ${lines[i]}`);
}

console.log(`\n--- Lines 1700 to 1750 ---`);
for (let i = 1699; i < Math.min(lines.length, 1750); i++) {
  console.log(`${i+1}: ${lines[i]}`);
}
