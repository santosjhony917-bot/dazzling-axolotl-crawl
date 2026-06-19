const { agenticFetch } = require('./agentic_scraper.cjs');

async function run() {
  const url = "https://livemenu.app/menu/620a771b6e7bfc0012a16264";
  const objective = "Apenas navegue pela primeira tela e extraia tudo com 'found'.";
  
  const ctx = await agenticFetch(url, objective);
  
  const fs = require('fs');
  fs.writeFileSync('scratch/livemenu_dump.txt', ctx);
  console.log("Extração salva em scratch/livemenu_dump.txt");
}

run();
