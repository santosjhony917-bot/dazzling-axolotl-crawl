const fs = require('fs');

const content = fs.readFileSync('src/pages/admin/GoogleMapsCollector.tsx', 'utf8');
const lines = content.split('\n');

// Find lines containing mock-completed-restaurants and print 15 lines before and after
lines.forEach((line, idx) => {
  if (line.includes('mock-completed-restaurants') && line.includes('setItem')) {
    console.log(`--- Match at line ${idx+1} ---`);
    for (let i = Math.max(0, idx - 10); i < Math.min(lines.length, idx + 15); i++) {
      console.log(`${i+1}: ${lines[i]}`);
    }
  }
});
