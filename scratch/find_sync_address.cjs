const fs = require('fs');

const content = fs.readFileSync('src/pages/admin/ExportedRestaurants.tsx', 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  if (line.includes('syncSingleToSupabase') || (idx > 200 && idx < 320 && (line.includes('address') || line.includes('city') || line.includes('state') || line.includes('cep')))) {
    console.log(`L${idx+1}: ${line.trim()}`);
  }
});
