const fs = require('fs');
const path = require('path');

function walk(dir, results = []) {
  const list = fs.readdirSync(dir);
  list.forEach(file => {
    const fullPath = path.join(dir, file);
    let stat;
    try {
      stat = fs.statSync(fullPath);
    } catch(e) {
      return;
    }
    if (stat && stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git') {
        walk(fullPath, results);
      }
    } else {
      if (file.endsWith('.tsx') || file.endsWith('.ts') || file.endsWith('.js') || file.endsWith('.cjs')) {
        results.push(fullPath);
      }
    }
  });
  return results;
}

const files = walk('.');
files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  if (content.includes('VITE_GEMINI') || content.includes('VITE_OPENAI')) {
    console.log(`Found in: ${f}`);
    const lines = content.split('\n');
    lines.forEach((line, idx) => {
      if (line.includes('VITE_GEMINI') || line.includes('VITE_OPENAI')) {
        console.log(`  L${idx+1}: ${line.trim()}`);
      }
    });
  }
});
