const fs = require('fs');
const path = require('path');

const logPath = 'C:\\Users\\meuno\\.gemini\\antigravity\\brain\\6186e84d-17fd-47d6-8cb2-9edea52bd9e6\\.system_generated\\logs\\transcript.jsonl';
if (!fs.existsSync(logPath)) {
  console.error("Log file not found at " + logPath);
  process.exit(1);
}

const content = fs.readFileSync(logPath, 'utf8');
const lines = content.split('\n');

console.log(`Loaded ${lines.length} lines.`);

let candidates = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (!line.trim()) continue;
  try {
    const parsed = JSON.parse(line);
    const str = JSON.stringify(parsed);
    // Look for tool calls or results mentioning ExportedRestaurants.tsx and contains "scraped" with substantial content
    if (str.includes('ExportedRestaurants.tsx') && str.length > 5000) {
      console.log(`Found candidate at line ${i}, length: ${str.length}`);
      candidates.push({ index: i, length: str.length, parsed });
    }
  } catch (e) {
    // Ignore invalid JSON lines
  }
}

// Save candidate structures to analyze
candidates.forEach((c, idx) => {
  fs.writeFileSync(`scratch/candidate_${idx}.json`, JSON.stringify(c.parsed, null, 2));
  console.log(`Saved candidate_${idx}.json`);
});
