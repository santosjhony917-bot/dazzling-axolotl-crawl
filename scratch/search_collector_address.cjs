const fs = require('fs');

const content = fs.readFileSync('src/pages/admin/GoogleMapsCollector.tsx', 'utf8');
const lines = content.split('\n');

lines.forEach((line, idx) => {
  if (line.includes('address') || line.includes('cep') || line.includes('neighborhood') || line.includes('number')) {
    if (line.includes('completedMap') || line.includes('fallbackList') || line.includes('import') || line.includes('save') || line.includes('const ') || line.includes('let ')) {
      console.log(`L${idx+1}: ${line.trim()}`);
    }
  }
});
