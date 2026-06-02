const fs = require('fs');
const path = require('path');

const rootDir = path.join(__dirname, '..', 'src');
const patterns = [
  /\/restaurant-area\/search\b/,
  /\/restaurant-area\/home\b/,
  /\/restaurant-area\/favorites\b/
];

function searchDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);
    if (stat.isDirectory()) {
      searchDir(fullPath);
    } else if (stat.isFile() && /\.(tsx|ts|js|jsx)$/.test(file)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      patterns.forEach(pattern => {
        if (pattern.test(content)) {
          console.log(`Found pattern ${pattern} in file: ${fullPath}`);
        }
      });
    }
  }
}

searchDir(rootDir);
console.log('Search complete.');
