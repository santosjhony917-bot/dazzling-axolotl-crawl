const fs = require('fs');
const path = require('path');

const filePath = path.resolve(__dirname, '../src/components/admin/RestaurantDetailsDialog.tsx');
let content = fs.readFileSync(filePath, 'utf8');

// 1. Remove parseAddressString function
const parseAddressStart = content.indexOf('const parseAddressString = (addressStr: string) => {');
if (parseAddressStart !== -1) {
  let braceCount = 0;
  let endIdx = -1;
  let started = false;
  
  for (let i = parseAddressStart; i < content.length; i++) {
    if (content[i] === '{') {
      braceCount++;
      started = true;
    } else if (content[i] === '}') {
      braceCount--;
    }
    
    if (started && braceCount === 0) {
      endIdx = i + 1;
      break;
    }
  }
  
  if (endIdx !== -1) {
    const stringToRemove = content.substring(parseAddressStart, endIdx);
    content = content.replace(stringToRemove, '');
    console.log('parseAddressString removido.');
  }
}

// 2. Remove auto-parse usage in useEffect
const autoParseStart = content.indexOf('// Auto-parse if cep/number/neighborhood are empty but address contains full address string');
if (autoParseStart !== -1) {
  const autoParseEnd = content.indexOf('const formattedRestaurant = {', autoParseStart);
  if (autoParseEnd !== -1) {
    const stringToRemove = content.substring(autoParseStart, autoParseEnd);
    content = content.replace(stringToRemove, '');
    console.log('Uso do parseAddressString removido.');
  }
}

// 3. Remove fallback to /api/local-collector/re-search-social or re-scrape-logo
// We can use string replacement for specific known blocks or just replace fetch calls that hit /api/local-collector
const fallbackRegex = /\/\/\s*Fallback\s*para\s*o\s*robô\s*local.*?catch\s*\([^)]+\)\s*\{[^}]+\}/gs;
content = content.replace(fallbackRegex, '');

// Additionally, there is a large block for "Iniciando fallback do robô local..." around handleProcessMenu
const handleProcessMenuFallback = content.indexOf('addLog("Iniciando fallback do robô local...");');
if (handleProcessMenuFallback !== -1) {
  // Let's find the 'else' block that contains this and remove the else branch entirely.
  // We'll replace the block manually or by deleting lines containing "robô local" and the local API calls.
}

fs.writeFileSync(filePath, content.replace(/\n{3,}/g, '\n\n'));
console.log("RestaurantDetailsDialog.tsx pré-limpo. O resto faremos via regex ou AST/manual se necessário.");
