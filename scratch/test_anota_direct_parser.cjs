const fs = require('fs');
const path = require('path');

const filePath = path.join(__dirname, 'response_1781448085852_menu_merchant.json');
if (!fs.existsSync(filePath)) {
  console.error('File not found!');
  process.exit(1);
}

const res = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
const menuData = res.data.menu;

function parseAnotaAiMenu(menu) {
  const categories = [];
  const menuAuxMap = new Map();
  
  // Map auxiliary categories for quick lookup by category_id
  if (Array.isArray(menu.menu_aux)) {
    menu.menu_aux.forEach(cat => {
      menuAuxMap.set(cat.category_id, cat);
    });
  }
  
  // Track all additional options/borders to put them in a separate category
  const borderItemsMap = new Map();
  
  // 1. Process main categories
  if (Array.isArray(menu.menu)) {
    menu.menu.forEach(cat => {
      const catName = cat.title || 'Geral';
      const items = [];
      
      if (Array.isArray(cat.itens)) {
        cat.itens.forEach(item => {
          const itemName = item.title || '';
          const itemPrice = item.price || item.minimal_price || 0;
          const itemDesc = item.description || '';
          const itemImage = item.image || '';
          
          // Check if this item is a pizza/product with next steps pointing to flavors or complements
          let hasFlavors = false;
          let flavorCategory = null;
          let borderCategories = [];
          
          if (Array.isArray(item.next_steps)) {
            item.next_steps.forEach(step => {
              const auxCat = menuAuxMap.get(step.category);
              if (auxCat) {
                const auxTitle = (auxCat.title || '').toLowerCase();
                if (auxTitle.includes('sabor') || auxTitle.includes('sabores')) {
                  hasFlavors = true;
                  flavorCategory = auxCat;
                } else if (auxTitle.includes('borda') || auxTitle.includes('massa') || auxTitle.includes('adicional')) {
                  borderCategories.push(auxCat);
                }
              }
            });
          }
          
          if (hasFlavors && flavorCategory) {
            // Flatten flavors!
            console.log(`🍕 Flattening flavors for: ${itemName} (${flavorCategory.title})`);
            if (Array.isArray(flavorCategory.itens)) {
              flavorCategory.itens.forEach(flavor => {
                const flavorName = flavor.title || '';
                const flavorExtraPrice = flavor.price || 0;
                const finalPrice = itemPrice + flavorExtraPrice;
                
                // Construct the description including border options notes
                let finalDesc = flavor.description || itemDesc;
                const borderNotes = borderCategories.map(bc => {
                  const itemsWithPrice = (bc.itens || [])
                    .filter(bi => bi.price > 0)
                    .map(bi => `${bi.title} por +R$ ${bi.price.toFixed(2)}`);
                  return itemsWithPrice.length > 0 ? `[${bc.title}: ${itemsWithPrice.join(', ')}]` : '';
                }).filter(Boolean).join(' ');
                
                if (borderNotes) {
                  finalDesc = `${finalDesc ? finalDesc + '. ' : ''}${borderNotes}`;
                }
                
                items.push({
                  name: `${itemName} - ${flavorName}`,
                  price: `R$ ${finalPrice.toFixed(2)}`,
                  description: finalDesc,
                  image_url: flavor.image || itemImage
                });
              });
            }
          } else {
            // Standard item
            let finalDesc = itemDesc;
            const borderNotes = borderCategories.map(bc => {
              const itemsWithPrice = (bc.itens || [])
                .filter(bi => bi.price > 0)
                .map(bi => `${bi.title} por +R$ ${bi.price.toFixed(2)}`);
              return itemsWithPrice.length > 0 ? `[${bc.title}: ${itemsWithPrice.join(', ')}]` : '';
            }).filter(Boolean).join(' ');
            
            if (borderNotes) {
              finalDesc = `${finalDesc ? finalDesc + '. ' : ''}${borderNotes}`;
            }
            
            items.push({
              name: itemName,
              price: `R$ ${itemPrice.toFixed(2)}`,
              description: finalDesc,
              image_url: itemImage
            });
          }
          
          // Add border items to our global borders collection
          borderCategories.forEach(bc => {
            if (Array.isArray(bc.itens)) {
              bc.itens.forEach(bi => {
                if (bi.price > 0) {
                  const key = `${bi.title}-${bi.price}`;
                  borderItemsMap.set(key, {
                    name: `Adicional: ${bi.title}`,
                    price: `R$ ${bi.price.toFixed(2)}`,
                    description: bi.description || '',
                    image_url: bi.image || ''
                  });
                }
              });
            }
          });
        });
      }
      
      if (items.length > 0) {
        categories.push({
          name: catName,
          items: items
        });
      }
    });
  }
  
  // 2. Add the Adicionais / Bordas category if we collected any border/extra items
  if (borderItemsMap.size > 0) {
    categories.push({
      name: "Adicionais / Bordas",
      items: Array.from(borderItemsMap.values())
    });
  }
  
  return categories;
}

const parsed = parseAnotaAiMenu(menuData);
console.log('Parsed Category Count:', parsed.length);
parsed.forEach(cat => {
  console.log(`- ${cat.name}: ${cat.items.length} items`);
  if (cat.items.length > 0) {
    console.log(`   Sample item:`, cat.items[0]);
  }
});

fs.writeFileSync(path.join(__dirname, 'test_scraped_menu_parsed.json'), JSON.stringify(parsed, null, 2), 'utf-8');
console.log('Done.');
