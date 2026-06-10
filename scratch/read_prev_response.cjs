const fs = require('fs');
const path = require('path');

const logPath = 'C:\\Users\\meuno\\.gemini\\antigravity\\brain\\664ec392-e05d-4c70-8287-40991e501211\\.system_generated\\logs\\transcript.jsonl';
const outputPath = path.join(__dirname, 'previous_assistant_response.txt');

const lines = fs.readFileSync(logPath, 'utf8').split('\n');
const results = [];
for (const line of lines) {
  if (line.trim()) {
    try {
      const obj = JSON.parse(line);
      if (obj.step_index >= 9251 && obj.step_index <= 9262) {
        results.push(`--- Step ${obj.step_index} (${obj.source} / ${obj.type}) ---\n${obj.content || ''}`);
      }
    } catch (e) {
      // ignore
    }
  }
}

fs.writeFileSync(outputPath, results.join('\n\n'), 'utf8');
console.log('Wrote previous responses to', outputPath);
