const fs = require('fs');
const path = require('path');

const JSON_PATH = path.join(__dirname, '..', 'scraped_restaurants_google.json');

if (!fs.existsSync(JSON_PATH)) {
  console.error("JSON file not found!");
  process.exit(1);
}

const data = JSON.parse(fs.readFileSync(JSON_PATH, 'utf-8'));

const NEIGHBORHOODS = [
  'Tambaú', 'Manaíra', 'Cabo Branco', 'Bessa', 'Altiplano', 'Centro', 'Torre',
  'Miramar', 'Bancários', 'Mangabeira', 'Bairro dos Estados', 'Jaguaribe',
  'Geisel', 'Valentina de Figueiredo', 'Castelo Branco', 'Aeroclube', 'Água Fria',
  'Alto do Céu', 'Alto do Mateus', 'Anatólia', 'Bairro das Indústrias', 'Bairro dos Ipês',
  'Barra de Gramame', 'Brisamar', 'Cidade dos Colibris', 'Costa do Sol', 'Costa e Silva',
  'Cristo Redentor', 'Cruz das Armas', 'Cuiá', 'Ernâni Sátiro', 'Expedicionários',
  'Funcionários', 'Gramame', 'Grotão', 'Ilha do Bispo', 'Jardim Cidade Universitária',
  'Jardim Oceania', 'Jardim São Paulo', 'Jardim Veneza', 'João Agripino', 'João Paulo II',
  'José Américo', 'Mandacaru', 'Oitizeiro', 'Padre Zé', 'Paratibe', 'Penha',
  'Portal do Sol', 'Róger', 'São José', 'Tambauzinho', 'Varadouro', 'Varjão'
];

function formatRestaurantNameWithLocation(originalName, addressVal, cityVal = 'João Pessoa', neighborhoodVal = '') {
  if (!originalName) return originalName;

  // Clean strings from private use area characters like  and 
  let cleanName = originalName.replace(/[\uE000-\uF8FF]/g, '').trim();
  let cleanAddress = (addressVal || '').replace(/[\uE000-\uF8FF]/g, '').trim();
  let cleanCity = (cityVal || 'João Pessoa').replace(/[\uE000-\uF8FF]/g, '').trim();
  let cleanNeighborhood = (neighborhoodVal || '').replace(/[\uE000-\uF8FF]/g, '').trim();

  // If neighborhood is empty, try to match from official NEIGHBORHOODS list in address
  if (!cleanNeighborhood && cleanAddress) {
    const normalizedAddress = cleanAddress.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    for (const nb of NEIGHBORHOODS) {
      const normalizedNb = nb.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const regex = new RegExp('\\b' + normalizedNb + '\\b', 'i');
      if (regex.test(normalizedAddress)) {
        cleanNeighborhood = nb;
        break;
      }
    }
  }

  // Normalize strings for comparison
  const normalize = (str) => {
    if (!str) return '';
    return str.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]/g, "");
  };

  const normName = normalize(cleanName);
  const normCity = normalize(cleanCity);
  const normNeighborhood = normalize(cleanNeighborhood);

  // If neighborhood or city is already part of the name, return cleanName
  if (normNeighborhood && normName.includes(normNeighborhood)) {
    return cleanName;
  }
  if (normCity && normName.includes(normCity)) {
    return cleanName;
  }

  // Check if any significant word of neighborhood/city is in the name
  const isWordInName = (locStr) => {
    if (!locStr) return false;
    const words = locStr.toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .split(/[\s,.-]+/)
      .filter(w => w.length > 3 && !['avenida', 'rua', 'bloco', 'apartamento', 'casa', 'numero', 'joao', 'pessoa', 'shopping', 'praia'].includes(w));
    for (const w of words) {
      if (normName.includes(w)) return true;
    }
    return false;
  };

  if (isWordInName(cleanNeighborhood) || isWordInName(cleanCity)) {
    return cleanName;
  }

  // Choose the location qualifier to append
  const location = cleanNeighborhood || cleanCity;
  if (location) {
    return `${cleanName} - ${location}`;
  }

  return cleanName;
}

const cleanString = (str) => {
  if (typeof str !== 'string') return str;
  return str.replace(/[\uE000-\uF8FF]/g, '').trim();
};

const updatedData = data.map(item => {
  // Recover original name from googleMapsUrl if possible to undo the broken migration
  let originalName = item.name;
  if (item.googleMapsUrl) {
    const match = item.googleMapsUrl.match(/\/place\/([^/]+)/);
    if (match && match[1]) {
      originalName = decodeURIComponent(match[1].replace(/\+/g, ' '));
    }
  }

  // Determine neighborhood
  let neighborhood = item.neighborhood || '';
  if (!neighborhood && item.address) {
    const cleanAddr = cleanString(item.address);
    const normalizedAddress = cleanAddr.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    for (const nb of NEIGHBORHOODS) {
      const normalizedNb = nb.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
      const regex = new RegExp('\\b' + normalizedNb + '\\b', 'i');
      if (regex.test(normalizedAddress)) {
        neighborhood = nb;
        break;
      }
    }
  }

  const finalName = formatRestaurantNameWithLocation(originalName, item.address, item.city, neighborhood);
  
  const newItem = {
    ...item,
    name: finalName,
    address: cleanString(item.address),
    phone: cleanString(item.phone),
    website: cleanString(item.website),
    instagram: cleanString(item.instagram),
    facebook: cleanString(item.facebook),
    menuSourceUrl: cleanString(item.menuSourceUrl),
    menuUrl: cleanString(item.menuUrl)
  };

  for (const key of Object.keys(newItem)) {
    if (newItem[key] === undefined || newItem[key] === '') {
      delete newItem[key];
    }
  }

  return newItem;
});

fs.writeFileSync(JSON_PATH, JSON.stringify(updatedData, null, 2), 'utf-8');
console.log(`Successfully migrated ${updatedData.length} entries in scraped_restaurants_google.json!`);
