const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'reconstructed_ExportedRestaurants.tsx');
if (fs.existsSync(filePath)) {
  const lines = fs.readFileSync(filePath, 'utf8').split('\n');
  console.log(`Reconstructed file has ${lines.length} lines.`);
  
  console.log("\n--- Lines 1 to 70 ---");
  for (let i = 0; i < Math.min(lines.length, 70); i++) {
    console.log(`${i+1}: ${lines[i]}`);
  }
  
  console.log("\n--- Lines 150 to 205 ---");
  for (let i = 149; i < Math.min(lines.length, 205); i++) {
    console.log(`${i+1}: ${lines[i]}`);
  }

  console.log("\n--- Lines 215 to 255 ---");
  for (let i = 214; i < Math.min(lines.length, 255); i++) {
    console.log(`${i+1}: ${lines[i]}`);
  }
} else {
  console.log("File not found");
}
