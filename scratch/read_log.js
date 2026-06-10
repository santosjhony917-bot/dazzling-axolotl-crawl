const fs = require('fs');
const path = require('path');

const logPath = 'C:\\Users\\meuno\\.gemini\\antigravity\\brain\\664ec392-e05d-4c70-8287-40991e501211\\.system_generated\\logs\\transcript.jsonl';
const outputPath = path.join(__dirname, 'user_request_9250.txt');

const lines = fs.readFileSync(logPath, 'utf8').split('\n');
for (const line of lines) {
  if (line.trim()) {
    try {
      const obj = JSON.parse(line);
      if (obj.step_index === 9250) {
        fs.writeFileSync(outputPath, obj.content, 'utf8');
        console.log('Successfully wrote to', outputPath);
        break;
      }
    } catch (e) {
      // ignore parse errors
    }
  }
}
