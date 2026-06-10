const fs = require('fs');
const path = require('path');

const logPath = 'C:\\Users\\meuno\\.gemini\\antigravity\\brain\\664ec392-e05d-4c70-8287-40991e501211\\.system_generated\\logs\\transcript.jsonl';
const outputPath = path.join(__dirname, 'all_user_inputs_screen_flow.txt');

const lines = fs.readFileSync(logPath, 'utf8').split('\n');
const results = [];
for (const line of lines) {
  if (line.trim()) {
    try {
      const obj = JSON.parse(line);
      if (obj.source === 'USER_EXPLICIT' && obj.content && obj.content.includes('FilterFood - Arquitetura')) {
        results.push(`Step ${obj.step_index} (${obj.created_at}):\n${obj.content}\n==================\n`);
      }
    } catch (e) {
      // ignore
    }
  }
}

fs.writeFileSync(outputPath, results.join('\n\n'), 'utf8');
console.log('Done, wrote', results.length, 'entries');
