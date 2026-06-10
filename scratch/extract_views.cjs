const fs = require('fs');
const path = require('path');

const logPath = 'C:\\Users\\meuno\\.gemini\\antigravity\\brain\\6186e84d-17fd-47d6-8cb2-9edea52bd9e6\\.system_generated\\logs\\transcript.jsonl';
const outDir = path.join(__dirname, 'views');
if (!fs.existsSync(outDir)) {
  fs.mkdirSync(outDir);
}

if (fs.existsSync(logPath)) {
  const lines = fs.readFileSync(logPath, 'utf8').split('\n');
  lines.forEach((l, idx) => {
    if (!l.trim()) return;
    try {
      const obj = JSON.parse(l);
      const str = JSON.stringify(obj);
      if (str.includes('ExportedRestaurants.tsx')) {
        const step = obj.step_index;
        const type = obj.type;
        let content = '';
        if (obj.output) {
          content = typeof obj.output === 'string' ? obj.output : JSON.stringify(obj.output);
        } else if (obj.content) {
          content = obj.content;
        }
        
        if (content.length > 50) {
          const filename = `step_${step}_${type}.txt`;
          fs.writeFileSync(path.join(outDir, filename), content);
          console.log(`Saved ${filename} (size: ${content.length})`);
        }
      }
    } catch (e) {}
  });
} else {
  console.log("Log not found");
}
