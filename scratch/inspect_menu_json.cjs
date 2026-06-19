const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'response_1781448085852_menu_merchant.json');
if (!fs.existsSync(filePath)) {
  console.error('File not found!');
  process.exit(1);
}

const res = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
const menu = res.data.menu;

console.log('ALL main categories in menu.menu:');
menu.menu.forEach((cat, idx) => {
  console.log(`[${idx}] Title: ${cat.title}, Itens Count: ${cat.itens ? cat.itens.length : 0}`);
  if (cat.itens && cat.itens.length > 0) {
    console.log(`   Sample item 0 keys:`, Object.keys(cat.itens[0]));
    console.log(`   Sample item 0 (truncated):`, JSON.stringify(cat.itens[0], null, 2).substring(0, 1200));
  }
});

console.log('\nALL auxiliary categories in menu.menu_aux:');
menu.menu_aux.forEach((cat, idx) => {
  console.log(`[${idx}] Title: ${cat.title}, Itens Count: ${cat.itens ? cat.itens.length : 0}`);
});
