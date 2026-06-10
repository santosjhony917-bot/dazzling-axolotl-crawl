const fs = require('fs');
const path = require('path');

const dir = 'C:\\Users\\meuno\\.gemini\\antigravity\\brain\\6186e84d-17fd-47d6-8cb2-9edea52bd9e6\\.system_generated\\messages';
if (fs.existsSync(dir)) {
  const files = fs.readdirSync(dir);
  files.forEach(f => {
    if (f.endsWith('.json') && f !== 'cursor.json' && f !== 'read.json') {
      const p = path.join(dir, f);
      const content = fs.readFileSync(p, 'utf8');
      console.log(`File: ${f}, Size: ${content.length}`);
      if (content.includes('ExportedRestaurants')) {
        console.log(`  Match found!`);
        if (content.length < 5000) {
          console.log(content.substring(0, 1000));
        } else {
          console.log(content.substring(0, 500) + '...');
        }
      }
    }
  });
}
