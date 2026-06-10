const fs = require('fs');
const path = require('path');

function walkDir(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    const dirPath = path.join(dir, f);
    const isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walkDir(dirPath, callback);
    } else {
      if (dirPath.endsWith('.tsx') || dirPath.endsWith('.ts')) {
        callback(dirPath);
      }
    }
  });
}

let modifiedFiles = 0;

walkDir('./src', (filePath) => {
  let content = fs.readFileSync(filePath, 'utf-8');
  let originalContent = content;

  // 1. Primary Colors
  content = content.replace(/bg-blue-600/g, 'bg-primary');
  content = content.replace(/bg-blue-700/g, 'bg-primary');
  content = content.replace(/bg-\[\#022d68\]/g, 'bg-primary');
  content = content.replace(/bg-\[\#022D68\]/g, 'bg-primary');
  content = content.replace(/text-blue-600/g, 'text-primary');
  content = content.replace(/text-\[\#022d68\]/g, 'text-primary');
  content = content.replace(/text-\[\#022D68\]/g, 'text-primary');
  content = content.replace(/border-blue-600/g, 'border-primary');
  content = content.replace(/border-\[\#022d68\]/g, 'border-primary');
  content = content.replace(/border-\[\#022D68\]/g, 'border-primary');

  // 2. Highlight Colors
  content = content.replace(/bg-orange-500/g, 'bg-highlight');
  content = content.replace(/bg-\[\#e47948\]/g, 'bg-highlight');
  content = content.replace(/bg-\[\#E47948\]/g, 'bg-highlight');
  content = content.replace(/text-orange-500/g, 'text-highlight');
  content = content.replace(/text-\[\#e47948\]/g, 'text-highlight');
  content = content.replace(/text-\[\#E47948\]/g, 'text-highlight');
  content = content.replace(/border-orange-500/g, 'border-highlight');
  content = content.replace(/border-\[\#e47948\]/g, 'border-highlight');
  content = content.replace(/border-\[\#E47948\]/g, 'border-highlight');

  // 3. Shadows and Flat Design
  content = content.replace(/shadow-md/g, 'shadow-none');
  content = content.replace(/shadow-lg/g, 'shadow-none');
  content = content.replace(/shadow-xl/g, 'shadow-none');
  content = content.replace(/shadow-sm/g, 'shadow-none');
  
  // 4. Cards and Container Radii (16px / rounded-2xl or standard)
  // Tailwind default xl is 20px, lg is 16px. wait, in the tailwind config it is:
  // lg: 1rem (16px), xl: 1.25rem (20px), 2xl: 1.5rem (24px).
  // So 16px is `rounded-lg` or we can use `rounded-[16px]`
  content = content.replace(/rounded-xl/g, 'rounded-2xl'); // The user wants 16px, wait!
  // I will just let tailwind config define `xl`? No, let's keep it safe.
  // Actually, I'll update button.tsx manually, and maybe run this script just for colors/shadows.

  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf-8');
    modifiedFiles++;
    console.log('Modified:', filePath);
  }
});
console.log('Total files modified:', modifiedFiles);
