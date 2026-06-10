const fs = require('fs');

const logPath = 'C:\\Users\\meuno\\.gemini\\antigravity\\brain\\6186e84d-17fd-47d6-8cb2-9edea52bd9e6\\.system_generated\\logs\\transcript.jsonl';
if (fs.existsSync(logPath)) {
  const lines = fs.readFileSync(logPath, 'utf8').split('\n');
  console.log(`Scanning transcript.jsonl (${lines.length} lines) for ExportedRestaurants.tsx contents...`);
  
  lines.forEach((l, idx) => {
    if (!l.trim()) return;
    try {
      const obj = JSON.parse(l);
      const str = JSON.stringify(obj);
      if (str.includes('ExportedRestaurants.tsx')) {
        console.log(`Step ${obj.step_index} (${obj.type}):`);
        
        // Print tool call arguments or view output details
        if (obj.tool_calls) {
          obj.tool_calls.forEach(tc => {
            if (tc.Name === 'view_file' || tc.name === 'view_file') {
              const args = tc.Arguments || tc.args;
              console.log(`  Tool Call view_file: Start=${args.StartLine}, End=${args.EndLine}`);
            } else if (tc.Name === 'replace_file_content' || tc.name === 'replace_file_content') {
              const args = tc.Arguments || tc.args;
              console.log(`  Tool Call replace_file_content: Start=${args.StartLine}, End=${args.EndLine}, targetLen=${args.TargetContent?.length}, replLen=${args.ReplacementContent?.length}`);
            } else if (tc.Name === 'run_command' || tc.name === 'run_command') {
              const args = tc.Arguments || tc.args;
              console.log(`  Tool Call run_command: ${args.CommandLine}`);
            }
          });
        }
        
        if (obj.output) {
          const outStr = typeof obj.output === 'string' ? obj.output : JSON.stringify(obj.output);
          console.log(`  Output size: ${outStr.length}`);
          if (outStr.includes('Showing lines')) {
            const matches = outStr.match(/Showing lines (\d+) to (\d+)/);
            if (matches) {
              console.log(`    Output shows lines ${matches[1]} to ${matches[2]}`);
            }
          }
        }
      }
    } catch (e) {}
  });
} else {
  console.log("Log not found");
}
