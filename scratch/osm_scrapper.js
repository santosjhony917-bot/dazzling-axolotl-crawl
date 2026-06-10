import fs from 'fs';
import path from 'path';

const getRestaurantUniqueKey = (name, address) => {
  const cleanName = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');
  const cleanAddress = address.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');
  return `${cleanName}_${cleanAddress}`;
};

async function runOSMScraper() {
  console.log('🚀 Iniciando Varredura Rápida via OpenStreetMap Nodes...');
  
  // Buscando apenas nós (nodes), o que é infinitamente mais rápido e evita Timeouts (504)
  const query = `
    [out:json][timeout:30];
    area["name"="João Pessoa"]->.searchArea;
    (
      node["amenity"="restaurant"](area.searchArea);
      node["amenity"="fast_food"](area.searchArea);
      node["amenity"="cafe"](area.searchArea);
    );
    out body;
  `;

  const url = 'https://overpass-api.de/api/interpreter';

  try {
    console.log('📡 Conectando ao servidor do OpenStreetMap...');
    const response = await fetch(url, {
      method: 'POST',
      body: 'data=' + encodeURIComponent(query),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`Erro do servidor OSM: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const elements = data.elements || [];
    console.log(`✅ Recebidos ${elements.length} estabelecimentos brutos.`);

    const allRestaurants = new Map();

    elements.forEach((el) => {
      const tags = el.tags || {};
      const name = tags.name;

      if (!name) return; // Ignora locais sem nome

      const lowercaseName = name.toLowerCase();
      const excludeKeywords = ['posto', 'farmacia', 'drogaria', 'supermercado', 'mercado', 'banco', 'caixa', 'hospital'];
      if (excludeKeywords.some(kw => lowercaseName.includes(kw))) return;

      const lat = el.lat;
      const lng = el.lon;

      let category = 'Restaurante';
      if (tags.amenity === 'fast_food') category = 'Hamburgueria';
      else if (tags.amenity === 'cafe') category = 'Cafeteria';
      
      if (tags.cuisine) {
        const cuisine = tags.cuisine.toLowerCase();
        if (cuisine.includes('pizza')) category = 'Pizzaria';
        else if (cuisine.includes('burger') || cuisine.includes('hamburger')) category = 'Hamburgueria';
        else if (cuisine.includes('sushi') || cuisine.includes('japanese')) category = 'Japonesa';
        else if (cuisine.includes('italian') || cuisine.includes('pasta')) category = 'Italiana';
        else if (cuisine.includes('seafood') || cuisine.includes('fish')) category = 'Frutos do Mar';
        else if (cuisine.includes('steak') || cuisine.includes('barbecue') || cuisine.includes('meat')) category = 'Churrascaria';
        else if (cuisine.includes('regional') || cuisine.includes('brazilian')) category = 'Regional';
      }

      const street = tags['addr:street'] || 'João Pessoa';
      const number = tags['addr:housenumber'] || '';
      const suburb = tags['addr:suburb'] || 'Bairro';
      const address = number ? `${street}, ${number} - ${suburb}` : `${street} - ${suburb}`;

      const uniqueKey = getRestaurantUniqueKey(name, address);
      if (allRestaurants.has(uniqueKey)) return;

      const cleanNameKey = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');
      const instagram = tags.instagram 
        ? (tags.instagram.startsWith('http') ? tags.instagram : `https://instagram.com/${tags.instagram}`)
        : `https://instagram.com/${cleanNameKey}`;
      const facebook = tags.facebook
        ? (tags.facebook.startsWith('http') ? tags.facebook : `https://facebook.com/${tags.facebook}`)
        : `https://facebook.com/${cleanNameKey}`;

      const defaultOpen = { isOpen: true, slots: [{ start: '11:00', end: '23:00' }] };
      const openingHours = {
        monday: { isOpen: false, slots: [] },
        tuesday: { ...defaultOpen },
        wednesday: { ...defaultOpen },
        thursday: { ...defaultOpen },
        friday: { isOpen: true, slots: [{ start: '11:00', end: '23:59' }] },
        saturday: { isOpen: true, slots: [{ start: '11:00', end: '23:59' }] },
        sunday: { ...defaultOpen }
      };

      allRestaurants.set(uniqueKey, {
        name,
        category,
        rating: parseFloat((4.0 + Math.random() * 0.9).toFixed(1)),
        reviewsCount: Math.floor(Math.random() * 300) + 15,
        address,
        phone: tags.phone || tags['contact:phone'] || '',
        city: 'João Pessoa',
        state: 'PB',
        instagram,
        facebook,
        coverImage: `https://images.unsplash.com/photo-${getCategoryPhotoId(category)}?w=800`,
        galleryImages: [
          `https://images.unsplash.com/photo-${getCategoryPhotoId(category)}?w=600`
        ],
        openingHours,
        website: tags.website || tags['contact:website'] || '',
        googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + ', ' + address)}`,
        latitude: lat,
        longitude: lng
      });
    });

    const finalResultsList = Array.from(allRestaurants.values());
    console.log(`\n==================================================`);
    console.log(`🎯 Varredura OSM Nodes Concluída!`);
    console.log(`📊 Total de restaurantes únicos coletados: ${finalResultsList.length}`);

    // Salva no arquivo JSON final
    const destPath = path.resolve('scraped_restaurants_joao_pessoa.json');
    fs.writeFileSync(destPath, JSON.stringify(finalResultsList, null, 2), 'utf-8');
    console.log(`💾 Resultados salvos com sucesso em: ${destPath}`);

  } catch (err) {
    console.error('❌ Falha ao executar varredura OSM:', err.message);
  }
}

function getCategoryPhotoId(cat) {
  const photos = {
    'Churrascaria': '1544025162-d76694265947',
    'Pizzaria': '1513104890138-7c749659a591',
    'Hamburgueria': '1568901346375-23c9450c58cd',
    'Japonesa': '1579871494447-9811cf80d66c',
    'Italiana': '1551183053-bf91a1d81141',
    'Regional': '1504754524776-8f4f37790ca0',
    'Frutos do Mar': '1519708227418-c8fd9a32b7a2',
    'Cafeteria': '1501339847302-ac426a4a7cbb'
  };
  return photos[cat] || '1414235077428-338989a2e8c0';
}

runOSMScraper();
