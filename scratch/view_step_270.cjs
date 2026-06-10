const fs = require('fs');

const logPath = 'C:\\Users\\meuno\\.gemini\\antigravity\\brain\\6186e84d-17fd-47d6-8cb2-9edea52bd9e6\\.system_generated\\logs\\transcript.jsonl';
if (fs.existsSync(logPath)) {
  const lines = fs.readFileSync(logPath, 'utf8').split('\n');
  for (const l of lines) {
    if (!l.trim()) continue;
    try {
      const obj = JSON.parse(l);
      if (obj.step_index === 270) {
        console.log("Found Step 270:");
        console.log(JSON.stringify(obj, null, 2));
      }
    } catch (e) {}
  }
} else {
  console.log("Log not found");
}
