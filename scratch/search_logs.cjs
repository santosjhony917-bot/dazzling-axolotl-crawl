const fs = require('fs');
const readline = require('readline');

const logFile = 'C:\\Users\\meuno\\.gemini\\antigravity\\brain\\6186e84d-17fd-47d6-8cb2-9edea52bd9e6\\.system_generated\\logs\\transcript.jsonl';

async function search() {
  const fileStream = fs.createReadStream(logFile);
  const rl = readline.createInterface({
    input: fileStream,
    crlfDelay: Infinity
  });

  const matches = [];
  
  for await (const line of rl) {
    try {
      const obj = JSON.parse(line);
      if (obj.step_index >= 4800 && obj.step_index <= 4818) {
        matches.push(obj);
      }
    } catch (err) {}
  }

  for (const m of matches) {
    if (m.type === 'USER_INPUT' || m.type === 'PLANNER_RESPONSE') {
      console.log(`=== Step ${m.step_index} (${m.source} / ${m.type}) ===`);
      console.log(m.content);
      console.log('\n' + '='.repeat(40) + '\n');
    }
  }
}

search().catch(console.error);
