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
console.log(`Searching through ${files.length} ts/tsx files...`);

files.forEach(f => {
  const content = fs.readFileSync(f, 'utf8');
  if (content.includes('scraped-google') || content.includes('scraped_restaurants_google') || content.includes('scraped_menus')) {
    console.log(`Match found in: ${f} (size: ${content.length} bytes, lines: ${content.split('\n').length})`);
  }
});
