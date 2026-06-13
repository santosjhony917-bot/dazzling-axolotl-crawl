const fs = require('fs');

const planFile = 'C:\\Users\\meuno\\.gemini\\antigravity\\brain\\6186e84d-17fd-47d6-8cb2-9edea52bd9e6\\implementation_plan.md';
const content = fs.readFileSync(planFile, 'utf8');

const lines = content.split('\n');
console.log(`Total lines: ${lines.length}`);

// Print sections containing '11.0' or 'Upgrade' with 10 lines of context before and 30 lines after
for (let i = 0; i < lines.length; i++) {
  if (lines[i].includes('11.0') || lines[i].includes('Upgrade')) {
    console.log(`\n=== MATCH AT LINE ${i+1} ===`);
    const start = Math.max(0, i - 5);
    const end = Math.min(lines.length, i + 35);
    console.log(lines.slice(start, end).join('\n'));
    console.log('='.repeat(40));
    i = end; // skip to avoid duplicate outputs
  }
}
