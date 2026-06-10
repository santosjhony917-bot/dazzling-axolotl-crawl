const fs = require('fs');
const path = require('path');

const logPath = 'C:\\Users\\meuno\\.gemini\\antigravity\\brain\\6186e84d-17fd-47d6-8cb2-9edea52bd9e6\\.system_generated\\logs\\transcript.jsonl';
if (!fs.existsSync(logPath)) {
  console.error("Log file not found at " + logPath);
  process.exit(1);
}

const lines = fs.readFileSync(logPath, 'utf8').split('\n');
console.log(`Analyzing ${lines.length} lines from transcript...`);

lines.forEach((line, idx) => {
  if (!line.trim()) return;
  try {
    const obj = JSON.parse(line);
    const type = obj.type || 'unknown';
    const source = obj.source || 'unknown';
    const step = obj.step_index;
    
    // Check if "ExportedRestaurants" or "useAdminRestaurants" is present in this step
    const hasWord = line.includes('ExportedRestaurants');
    if (hasWord) {
      console.log(`Line ${idx}: Step ${step} | Source: ${source} | Type: ${type} | Size: ${line.length} bytes`);
      
      // Let's inspect where it is.
      if (obj.tool_calls) {
        obj.tool_calls.forEach((tc, tcIdx) => {
          console.log(`  Tool Call ${tcIdx}: Server=${tc.ServerName}, Tool=${tc.ToolName}`);
          if (tc.Arguments) {
            const argsStr = JSON.stringify(tc.Arguments);
            console.log(`    Arguments length: ${argsStr.length}`);
            if (argsStr.length > 2000) {
              console.log(`    Arguments starts with: ${argsStr.substring(0, 100)}`);
            }
          }
        });
      }
      
      if (obj.content) {
        console.log(`  Content length: ${obj.content.length}`);
        if (obj.content.length > 2000) {
          console.log(`    Content starts with: ${obj.content.substring(0, 100)}`);
        }
      }
      
      if (obj.output) {
        const outStr = typeof obj.output === 'string' ? obj.output : JSON.stringify(obj.output);
        console.log(`  Output length: ${outStr.length}`);
        if (outStr.length > 2000) {
          console.log(`    Output starts with: ${outStr.substring(0, 100)}`);
        }
      }
    }
  } catch (e) {
    // Console log line index if parsing failed
  }
});
