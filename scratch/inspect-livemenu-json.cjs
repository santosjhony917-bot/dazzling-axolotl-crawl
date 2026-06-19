const axios = require('axios');
const fs = require('fs');

async function run() {
  const url = "https://customers.tagme.com.br/dine-in/menu/620a771b6e7bfc0012a16264/Dine-in?ignoreDisabled=1";
  console.log(`📡 Buscando JSON do LiveMenu: ${url}`);
  
  try {
    const response = await axios.get(url);
    const data = response.data;
    
    fs.writeFileSync('scratch/livemenu_response_sample.json', JSON.stringify(data, null, 2), 'utf-8');
    console.log("💾 JSON completo salvo em scratch/livemenu_response_sample.json");
    
    // Analisa a estrutura do primeiro nível
    console.log("\n--- Estrutura do Primeiro Nível (Abas) ---");
    if (Array.isArray(data)) {
      console.log(`O JSON retornado é uma Array com ${data.length} elementos.`);
      data.forEach((tab, i) => {
        console.log(`\nAba [${i}]:`);
        console.log(`  - Title/Name: ${tab.title || tab.name || 'Sem nome'}`);
        console.log(`  - Keys do objeto: ${Object.keys(tab).join(', ')}`);
        
        // Verifica se tem categorias ou seções
        if (tab.categories && Array.isArray(tab.categories)) {
          console.log(`  - Categorias (tab.categories): ${tab.categories.length}`);
          tab.categories.forEach((cat, j) => {
            console.log(`    * Categoria [${j}]: "${cat.title || cat.name}" com ${cat.items ? cat.items.length : 0} itens`);
          });
        } else if (tab.sections && Array.isArray(tab.sections)) {
          console.log(`  - Seções (tab.sections): ${tab.sections.length}`);
        } else if (tab.itens && Array.isArray(tab.itens)) {
          console.log(`  - Itens direto na aba: ${tab.itens.length}`);
        }
      });
    } else if (typeof data === 'object' && data !== null) {
      console.log("O JSON retornado é um Objeto.");
      const keys = Object.keys(data);
      console.log(`Chaves principais: ${keys.join(', ')}`);
      
      keys.forEach(key => {
        const tab = data[key];
        console.log(`\nChave/Aba "${key}":`);
        console.log(`  - Title/Name: ${tab.title || tab.name || 'Sem nome'}`);
        console.log(`  - Keys do objeto: ${Object.keys(tab).join(', ')}`);
        
        // Verifica categorias
        const categories = tab.categories || tab.menu_categories || tab.sections || [];
        if (Array.isArray(categories)) {
          console.log(`  - Categorias encontradas: ${categories.length}`);
          if (categories.length > 0) {
            const firstCat = categories[0];
            console.log(`    * Exemplo categoria: "${firstCat.name || firstCat.title}"`);
            console.log(`    * Chaves da categoria: ${Object.keys(firstCat).join(', ')}`);
            const items = firstCat.items || firstCat.products || firstCat.itens || [];
            console.log(`    * Quantidade de itens na primeira categoria: ${items.length}`);
            if (items.length > 0) {
              console.log(`    * Exemplo de item:`, JSON.stringify(items[0], null, 2));
            }
          }
        }
      });
    }
  } catch (err) {
    console.error("❌ Erro ao buscar/analisar JSON:", err.message);
  }
}

run();
