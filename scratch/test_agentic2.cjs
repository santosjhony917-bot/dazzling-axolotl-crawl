const { agenticFetch } = require('./agentic_scraper.cjs');

async function run() {
  const url = "https://livemenu.app/menu/620a771b6e7bfc0012a16264";
  const objective = `Se houver ABAS/CATEGORIAS de navegação (ex: "Menu à La Carte", "Sobremesas", "Bebidas"), você DEVE usar a ação 'extract_and_click' para clicar em CADA UMA DELAS iterativamente e extrair o conteúdo.`;
  
  const ctx = await agenticFetch(url, objective);
  
  const fs = require('fs');
  fs.writeFileSync('scratch/livemenu_dump2.txt', ctx || "VAZIO");
  console.log("Extração salva em scratch/livemenu_dump2.txt");
}

run();
