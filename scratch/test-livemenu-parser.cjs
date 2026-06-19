const fs = require('fs');

function parseLiveMenu(data) {
  const categories = [];
  
  if (!Array.isArray(data)) {
    console.error("Data is not an array");
    return [];
  }
  
  data.forEach((tab, tabIdx) => {
    // Resolve o nome da aba (Menu do Chef, Menu à La Carte, etc.)
    let tabName = 'Geral';
    if (tab.name) {
      tabName = typeof tab.name === 'object' ? (tab.name.pt || tab.name.en || Object.values(tab.name)[0]) : tab.name;
    }
    
    console.log(`\nProcessing Tab [${tabIdx}]: "${tabName}"`);
    
    if (Array.isArray(tab.menus)) {
      tab.menus.forEach(cat => {
        // Resolve o nome da categoria (Entradas, Peixes, etc.)
        let catName = 'Outros';
        if (cat.name) {
          catName = typeof cat.name === 'object' ? (cat.name.pt || cat.name.en || Object.values(cat.name)[0]) : cat.name;
        }
        
        // No banco de dados Supabase, a hierarquia é achatada (apenas 1 nível de categoria).
        // Se tivermos categorias iguais em abas diferentes (ex: "Entradas" no "Menu do Chef" e "Entradas" no "Menu à La Carte"),
        // ou se quisermos manter a separação das abas para fazer sentido na listagem achatada,
        // podemos combinar o nome da aba com o da categoria.
        // Mas espere! O usuário reclamou de "Pratos R$ 79,90" ou de categorias ruins.
        // Se a categoria já for descritiva (como "Entradas", "Peixes", etc.), podemos usar o nome limpo.
        // Se a categoria for muito genérica ou se referir a preços, ou se quisermos manter o contexto do menu principal,
        // podemos concatenar se as abas forem diferentes de "Menu à La Carte" (por exemplo, "Menu do Chef - Entradas").
        // Vamos pensar na melhor estratégia de achatamento:
        let finalCatName = catName;
        if (tabName !== 'Menu à La Carte' && tabName !== 'Menu à La Carte.' && tabName !== 'Geral') {
          // Se for outra aba, concatena para contextualizar (ex: "Menu do Chef - Entradas", "Bebidas - Soft Drinks")
          finalCatName = `${tabName} - ${catName}`;
        }
        
        const items = [];
        
        if (Array.isArray(cat.menuItems)) {
          cat.menuItems.forEach(item => {
            let itemName = '';
            if (item.name) {
              itemName = typeof item.name === 'object' ? (item.name.pt || item.name.en || Object.values(item.name)[0]) : item.name;
            }
            
            let itemDesc = '';
            if (item.descript) {
              itemDesc = typeof item.descript === 'object' ? (item.descript.pt || item.descript.en || Object.values(item.descript)[0] || '') : item.descript;
            }
            
            const price = item.price ? (item.price / 100) : 0;
            const imageUrl = item.avatarUrl ? `https://static.tagme.com.br/pubimg/${item.avatarUrl}` : '';
            
            if (itemName) {
              items.push({
                name: itemName.trim(),
                description: itemDesc.trim().replace(/\n+/g, ' '),
                price: price,
                image_url: imageUrl
              });
            }
          });
        }
        
        if (items.length > 0) {
          // Procura se já existe uma categoria com este nome final
          let existingCat = categories.find(c => c.name === finalCatName);
          if (existingCat) {
            // Adiciona itens novos sem duplicar pelo nome
            items.forEach(newItem => {
              if (!existingCat.items.some(item => item.name === newItem.name)) {
                existingCat.items.push(newItem);
              }
            });
          } else {
            categories.push({
              name: finalCatName,
              items: items
            });
          }
        }
      });
    }
  });
  
  return categories;
}

const rawData = JSON.parse(fs.readFileSync('scratch/livemenu_response_sample.json', 'utf-8'));
const parsed = parseLiveMenu(rawData);

let totalItems = 0;
parsed.forEach(c => {
  totalItems += c.items.length;
  console.log(`  - Categoria: "${c.name}" (${c.items.length} itens)`);
});
console.log(`\nTotal de categorias estruturadas: ${parsed.length}`);
console.log(`Total de itens de menu estruturados: ${totalItems}`);
