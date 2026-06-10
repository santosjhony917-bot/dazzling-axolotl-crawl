const fs = require('fs');

const content = fs.readFileSync('src/pages/admin/ExportedRestaurants.tsx', 'utf8');
const lines = content.split('\n');

// Find all lines containing "export default function ExportedRestaurants"
lines.forEach((line, idx) => {
  if (line.includes('export default function ExportedRestaurants')) {
    console.log(`Found ExportedRestaurants declaration at line ${idx+1}`);
  }
});
