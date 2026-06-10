const fs = require('fs');
const path = require('path');

const viewsDir = path.join(__dirname, 'views');
const files = fs.readdirSync(viewsDir);

// Map of line number to line content
const lineMap = new Map();

files.forEach(file => {
  if (!file.includes('VIEW_FILE')) return;
  const content = fs.readFileSync(path.join(viewsDir, file), 'utf8');
  
  // Verify it is a view of the ExportedRestaurants.tsx file
  if (!content.includes('src/pages/admin/ExportedRestaurants.tsx') && !content.includes('src\\pages\\admin\\ExportedRestaurants.tsx')) {
    return; // Skip views of implementation_plan, task, etc.
  }
  
  console.log(`Processing valid view file: ${file}`);
  const lines = content.split('\n');
  lines.forEach(l => {
    const match = l.match(/^(\d+): (.*)$/);
    if (match) {
      const lineNum = parseInt(match[1], 10);
      const lineText = match[2];
      
      if (!lineMap.has(lineNum)) {
        lineMap.set(lineNum, lineText);
      } else {
        if (lineText.length > lineMap.get(lineNum).length) {
          lineMap.set(lineNum, lineText);
        }
      }
    }
  });
});

console.log(`Reconstructed ${lineMap.size} lines.`);

// Let's find missing ranges
const lineNums = Array.from(lineMap.keys()).sort((a, b) => a - b);
if (lineNums.length === 0) {
  console.log("No lines reconstructed.");
  process.exit(0);
}
const minLine = lineNums[0];
const maxLine = lineNums[lineNums.length - 1];
console.log(`Lines span from ${minLine} to ${maxLine}`);

let missing = [];
for (let i = 1; i <= maxLine; i++) {
  if (!lineMap.has(i)) {
    missing.push(i);
  }
}
console.log(`Missing lines: ${missing.length}`);
if (missing.length > 0) {
  let start = missing[0];
  let prev = missing[0];
  let ranges = [];
  for (let i = 1; i < missing.length; i++) {
    if (missing[i] === prev + 1) {
      prev = missing[i];
    } else {
      ranges.push([start, prev]);
      start = missing[i];
      prev = missing[i];
    }
  }
  ranges.push([start, prev]);
  console.log("Missing ranges:", ranges);
}

// Write the reconstructed file
let fileContent = '';
for (let i = 1; i <= maxLine; i++) {
  fileContent += (lineMap.get(i) || `// MISSING LINE ${i}`) + '\n';
}
fs.writeFileSync(path.join(__dirname, 'reconstructed_ExportedRestaurants.tsx'), fileContent);
console.log(`Saved reconstructed_ExportedRestaurants.tsx`);
