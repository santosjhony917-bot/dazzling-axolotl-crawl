const fs = require('fs');
let content = fs.readFileSync('scratch/ai_validation_block.tsx', 'utf8');

// Replace showSuccess / showError with toast.success / toast.error
content = content.replace(/showSuccess\(/g, 'toast.success(');
content = content.replace(/showError\(/g, 'toast.error(');

// Replace `results.find` with the restaurant passed in
content = content.replace(/const rest = results\.find\(r => r\.id === restaurantId\);/g, 'const rest = restaurant;');
content = content.replace(/restaurantId/g, 'restaurant.id');

fs.writeFileSync('scratch/ai_validation_block.tsx', content);
console.log('Transformations applied');
