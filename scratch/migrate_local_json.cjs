const fs = require('fs');
const path = require('path');

const JSON_PATH = path.join(__dirname, '..', 'scraped_restaurants_google.json');

const NEIGHBORHOODS = new Set([
  'jose americo', 'cristo redentor', 'cruz das armas', 'portal do sol',
  'jardim cidade universitaria', 'ernani satiro', 'mangabeira', 'gramame',
  'sao jose', 'cuia', 'roger', 'bancarios', 'anatolia', 'manaira',
  'aeroclube', 'centro', 'bairro dos estados', 'torre', 'agua fria',
  'geisel', 'tambau', 'miramar', 'cabo branco', 'joao pessoa', 'estados',
  'bessa', 'altiplano', 'valentina', 'castelo branco', 'jardim oceania',
  'jaguaribe', 'mandacaru', 'padre ze', 'varadouro', 'alto do mateus',
  'ilha do bispo', 'oitizeiro', 'bairro das industrias', 'mussumago',
  'colinas do sul', 'paratibe', 'planalto da boa esperanca', 'cidade verde',
  'penha', 'seixas', 'ponte de terra', 'grotas', 'jacare', 'intermares',
  'tambauzinho', 'expedicionarios', 'ipes', 'estados', 'treze de maio',
  'distrito industrial'
]);

function normalize(str) {
  if (!str) return '';
  return str.toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, "")
    .trim();
}

function cleanName(name) {
  const parts = name.split(' - ');
  if (parts.length < 2) return name;
  
  const lastPart = parts[parts.length - 1].trim();
  const normLast = normalize(lastPart);
  
  if (NEIGHBORHOODS.has(normLast)) {
    const newName = parts.slice(0, -1).join(' - ');
    return cleanName(newName);
  }
  
  return name;
}

async function run() {
  console.log(`Lendo arquivo local: ${JSON_PATH}...`);
  if (!fs.existsSync(JSON_PATH)) {
    console.error(`❌ Arquivo ${JSON_PATH} não encontrado.`);
    return;
  }

  const rawData = fs.readFileSync(JSON_PATH, 'utf-8');
  let restaurants = [];
  try {
    restaurants = JSON.parse(rawData);
  } catch (err) {
    console.error('❌ Erro ao analisar o JSON:', err.message);
    return;
  }

  console.log(`Carregados ${restaurants.length} restaurantes locais. Analisando...`);

  let nameUpdateCount = 0;
  let cityUpdateCount = 0;

  const updatedRestaurants = restaurants.map(rest => {
    let nameChanged = false;
    let cityChanged = false;

    // 1. Limpar nome
    const cleanedName = cleanName(rest.name || '');
    if (cleanedName !== rest.name) {
      rest.name = cleanedName;
      nameChanged = true;
    }

    // 2. Limpar cidade
    if (rest.city && rest.city.includes(' - PB')) {
      rest.city = rest.city.replace(' - PB', '').trim();
      cityChanged = true;
    }

    // 3. Limpar address se contiver cidade duplicada em alguns campos (opcional, mas vamos manter focado na cidade e nome)

    if (nameChanged) nameUpdateCount++;
    if (cityChanged) cityUpdateCount++;

    return rest;
  });

  console.log(`Resultados da análise:`);
  console.log(`- Nomes a serem atualizados: ${nameUpdateCount}`);
  console.log(`- Cidades a serem atualizadas: ${cityUpdateCount}`);

  if (nameUpdateCount > 0 || cityUpdateCount > 0) {
    console.log('Gravando alterações de volta no arquivo JSON...');
    fs.writeFileSync(JSON_PATH, JSON.stringify(updatedRestaurants, null, 2), 'utf-8');
    console.log('✅ Gravação concluída com sucesso!');
  } else {
    console.log('Nenhuma alteração necessária no arquivo local.');
  }
}

run();
