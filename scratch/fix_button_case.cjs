const fs = require('fs');

let content = fs.readFileSync('src/pages/admin/ExportedRestaurants.tsx', 'utf8');

// Replace "<button" with "<Button" (but be careful of other words like "buttonText" or similar.
// In JSX, "<button\n" or "<button " indicates the tag.
const updated = content
  .replace(/<button /g, '<Button ')
  .replace(/<button\n/g, '<Button\n');

fs.writeFileSync('src/pages/admin/ExportedRestaurants.tsx', updated);
console.log("Updated opening button tags to uppercase Button.");
