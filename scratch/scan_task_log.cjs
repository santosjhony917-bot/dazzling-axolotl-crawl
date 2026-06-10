const fs = require('fs');
const logPath = 'C:\\Users\\meuno\\.gemini\\antigravity\\brain\\6186e84d-17fd-47d6-8cb2-9edea52bd9e6\\.system_generated\\tasks\\task-98.log';

if (fs.existsSync(logPath)) {
  const stat = fs.statSync(logPath);
  console.log(`File size: ${stat.size} bytes`);
  const content = fs.readFileSync(logPath, 'utf8');
  console.log("Snippet:");
  console.log(content.substring(0, 1000));
} else {
  console.log("File not found");
}
