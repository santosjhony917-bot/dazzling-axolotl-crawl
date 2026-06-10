const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'reconstructed_ExportedRestaurants.tsx');
if (fs.existsSync(filePath)) {
  const lines = fs.readFileSync(filePath, 'utf8').split('\n');
  console.log(`Lines 500 to 700:`);
  for (let i = 499; i < Math.min(lines.length, 700); i++) {
    console.log(`${i+1}: ${lines[i]}`);
  }
} else {
  console.log("File not found");
}
