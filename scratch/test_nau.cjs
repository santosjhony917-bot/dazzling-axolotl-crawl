const { main } = require('./google_maps_scraper.cjs');

(async () => {
  try {
    console.log("Iniciando coleta para Nau Frutos do Mar em João Pessoa...");
    await main("Nau Frutos do Mar", "João Pessoa", "PB", 1);
    console.log("Coleta concluída!");
  } catch (error) {
    console.error("Erro fatal na coleta:", error);
  }
})();
