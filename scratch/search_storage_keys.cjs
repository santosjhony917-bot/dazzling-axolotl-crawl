const fs = require('fs');

const content = fs.readFileSync('src/pages/admin/GoogleMapsCollector.tsx', 'utf8');
const lines = content.split('\n');
lines.forEach((line, idx) => {
  if (line.includes('localStorage') || line.includes('mock-')) {
    console.log(`L${idx+1}: ${line.trim()}`);
  }
});
