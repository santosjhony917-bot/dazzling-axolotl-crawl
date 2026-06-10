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
      return; // skip broken symlinks etc
    }
    if (stat && stat.isDirectory()) {
      if (file !== 'node_modules' && file !== '.git') {
        walk(fullPath, results);
      }
    } else {
      if (file === 'ExportedRestaurants.tsx') {
        results.push(fullPath);
      }
    }
  });
  return results;
}

const files = walk('.');
console.log(`Found ${files.length} instances of ExportedRestaurants.tsx:`);
files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  const lines = content.split('\n').length;
  console.log(`Path: ${f}, Size: ${content.length} bytes, Lines: ${lines}`);
});
