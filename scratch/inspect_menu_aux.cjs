const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'response_1781448085852_menu_merchant.json');
if (!fs.existsSync(filePath)) {
  console.error('File not found!');
  process.exit(1);
}

const res = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
const menu = res.data.menu;

console.log('Auxiliary categories list:');
menu.menu_aux.forEach((cat, idx) => {
  console.log(`[${idx}] Title: ${cat.title}, ID: ${cat.category_id}, Items count: ${cat.itens ? cat.itens.length : 0}`);
  if (cat.itens && cat.itens.length > 0) {
    const it = cat.itens[0];
    console.log(`   Sample item name: ${it.title}, Price: ${it.price}, Extra Price: ${it.extra_price || it.price_additional || 'N/A'}`);
    console.log(`   Item keys:`, Object.keys(it));
  }
});
