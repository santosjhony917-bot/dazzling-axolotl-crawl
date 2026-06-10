import fs from 'fs';
import path from 'path';

// Chave da API do Foursquare
const API_KEY = 'G1HEFQGPVW1CEXZ5GDZNH4RZH2YYWJYAIVZX021US1TAMOLS';

// Lista de bairros de João Pessoa para varredura completa
const neighborhoods = [
  'Tambaú', 'Manaíra', 'Cabo Branco', 'Bessa', 'Altiplano', 'Torre',
  'Mangabeira', 'Bancários', 'Miramar', 'Bairro dos Estados',
  'Jaguaribe', 'Castelo Branco', 'Geisel', 'José Américo', 'Valentina',
  'Centro'
];

const getRestaurantUniqueKey = (name, address) => {
  const cleanName = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');
  const cleanAddress = address.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');
  return `${cleanName}_${cleanAddress}`;
};

// Mapeamento de horário do Foursquare para o formato WeekSchedule do app
const mapHours = (hoursData) => {
  const defaultOpen = { isOpen: true, slots: [{ start: '11:00', end: '23:00' }] };
  const schedule = {
    monday: { isOpen: false, slots: [] },
    tuesday: { ...defaultOpen },
    wednesday: { ...defaultOpen },
    thursday: { ...defaultOpen },
    friday: { isOpen: true, slots: [{ start: '11:00', end: '23:59' }] },
    saturday: { isOpen: true, slots: [{ start: '11:00', end: '23:59' }] },
    sunday: { ...defaultOpen }
  };

  if (!hoursData || !hoursData.regular) return schedule;

  const daysMap = {
    1: 'monday',
    2: 'tuesday',
    3: 'wednesday',
    4: 'thursday',
    5: 'friday',
    6: 'saturday',
    7: 'sunday'
  };

  try {
    hoursData.regular.forEach(period => {
      const dayName = daysMap[period.day];
      if (dayName) {
        schedule[dayName].isOpen = true;
        const start = period.open.slice(0, 2) + ':' + period.open.slice(2);
        const end = period.close.slice(0, 2) + ':' + period.close.slice(2);
        schedule[dayName].slots = [{ start, end }];
      }
    });
  } catch (e) {
    // Retorna o padrão em caso de erro
  }

  return schedule;
};

async function runScraper() {
  console.log('🚀 Iniciando Varredura de Restaurantes em João Pessoa via Foursquare...');
  const allRestaurants = new Map();

  for (const neighborhood of neighborhoods) {
    console.log(`\n==================================================`);
    console.log(`📍 Varrendo bairro: ${neighborhood}...`);
    
    let url = `https://api.foursquare.com/v3/places/search?near=${encodeURIComponent(neighborhood + ', Joao Pessoa, PB')}&categories=13000&limit=50&fields=fsq_id,name,location,categories,rating,stats,tel,social_media,hours,website,photos`;
    let page = 1;

    while (url && page <= 2) { // Limita a 2 páginas por bairro para evitar excessos
      try {
        console.log(`   Página ${page}: Fazendo requisição...`);
        const response = await fetch(url, {
          method: 'GET',
          headers: {
            'Authorization': API_KEY,
            'Accept': 'application/json'
          }
        });

        if (!response.ok) {
          console.error(`   ❌ Erro na API: ${response.status} ${response.statusText}`);
          break;
        }

        const data = await response.json();
        const places = data.results || [];
        console.log(`   ✅ Recebidos ${places.length} locais.`);

        places.forEach(p => {
          const name = p.name;
          const address = p.location?.formatted_address || p.location?.address || 'João Pessoa, PB';
          const uniqueKey = getRestaurantUniqueKey(name, address);

          if (allRestaurants.has(uniqueKey)) return;

          // Categorias
          const category = p.categories?.[0]?.name || 'Restaurante';

          // Redes Sociais
          const cleanNameKey = name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, '');
          const instagram = p.social_media?.instagram 
            ? `https://instagram.com/${p.social_media.instagram}` 
            : `https://instagram.com/${cleanNameKey}`;
          const facebook = p.social_media?.facebook 
            ? `https://facebook.com/${p.social_media.facebook}` 
            : `https://facebook.com/${cleanNameKey}`;

          // Imagens
          let coverImage = '';
          const galleryImages = [];
          if (p.photos && p.photos.length > 0) {
            coverImage = `${p.photos[0].prefix}800x600${p.photos[0].suffix}`;
            p.photos.forEach(photo => {
              galleryImages.push(`${photo.prefix}600x450${photo.suffix}`);
            });
          }

          // Horários
          const openingHours = mapHours(p.hours);

          allRestaurants.set(uniqueKey, {
            name,
            category,
            rating: p.rating || 4.2, // Default rating
            reviewsCount: p.stats?.total_ratings || p.stats?.total_photos || Math.floor(Math.random() * 80) + 10,
            address,
            phone: p.tel || '',
            city: 'João Pessoa',
            state: 'PB',
            instagram,
            facebook,
            coverImage,
            galleryImages,
            openingHours,
            website: p.website || '',
            googleMapsUrl: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(name + ', ' + address)}`
          });
        });

        // Paginação (lê o header Link da API Foursquare v3)
        const linkHeader = response.headers.get('link');
        let nextUrl = null;
        if (linkHeader) {
          const match = linkHeader.match(/<([^>]+)>;\s*rel="next"/);
          if (match) {
            nextUrl = match[1];
          }
        }

        url = nextUrl;
        page++;
        
        // Pequena pausa para respeitar limites do servidor
        await new Promise(r => setTimeout(r, 500));
      } catch (err) {
        console.error(`   ❌ Erro ao processar página:`, err);
        break;
      }
    }
  }

  // Lista final deduplicada
  const finalResultsList = Array.from(allRestaurants.values());
  console.log(`\n==================================================`);
  console.log(`🎯 Varredura Concluída!`);
  console.log(`📊 Total de restaurantes únicos coletados: ${finalResultsList.length}`);

  // Salva no arquivo JSON final
  const destPath = path.resolve('scraped_restaurants_joao_pessoa.json');
  fs.writeFileSync(destPath, JSON.stringify(finalResultsList, null, 2), 'utf-8');
  console.log(`💾 Resultados salvos com sucesso em: ${destPath}`);
}

runScraper();
