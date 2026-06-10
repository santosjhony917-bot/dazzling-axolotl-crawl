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
      if (file.endsWith('.tsx') || file.endsWith('.ts')) {
        results.push(fullPath);
      }
    }
  });
  return results;
}

const files = walk('.');
files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  if (content.includes('mock-completed-restaurants') || content.includes('mock-supabase-fallback-restaurants')) {
    console.log(`Found in: ${f} (lines: ${content.split('\n').length})`);
  }
});
