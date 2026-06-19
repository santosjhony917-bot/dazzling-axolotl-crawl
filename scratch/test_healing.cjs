const { validarECompletarDados } = require('./ai_validator.cjs');

async function test() {
  const estabelecimento = {
    name: "A Barca Cabo Branco",
    city: "João Pessoa",
    state: "PB",
    address: "Av. Cabo Branco",
    neighborhood: "Cabo Branco"
  };

  const dadosColetados = {
    instagram: "https://www.instagram.com/quiosque_abarca_jp/",
    menuSourceUrl: "https://sites.google.com/view/quiosque-abarca-jp/p%C3%A1gina-inicial",
    phone: "83998174440",
    pageContent: ""
  };

  console.log("Iniciando teste de Auto-Cura para A Casa Café Bistrô...");
  const resultado = await validarECompletarDados(estabelecimento, dadosColetados);
  
  const fs = require('fs');
  fs.writeFileSync('scratch/healing_output.json', JSON.stringify(resultado, null, 2));
  console.log("Teste finalizado. Output salvo em scratch/healing_output.json");
}

test();
