import { readFileSync, writeFileSync, mkdirSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

function normalizeName(name) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]/g, '')
    .trim();
}

function parsePrice(raw) {
  if (!raw) return 0;
  const cleaned = String(raw).replace(/[R$\s.]/g, '').replace(',', '.').trim();
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function cleanText(text) {
  if (!text) return '';
  return text.normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim();
}

function buildItem(item, cIdx, iIdx) {
  const rawPrice = String(item.price || '');
  let price = parsePrice(rawPrice);

  let name = cleanText(item.name || '');
  if (!price && rawPrice) {
    const match = name.match(/R?\$?\s*([\d.,]+)/);
    if (match) {
      price = parsePrice(match[1]);
    }
    name = name.replace(/R?\$?\s*[\d.,]+\s*$/, '').trim();
  }

  return {
    id: `mi-${Date.now()}-${cIdx}-${iIdx}`,
    name: name || 'Item sem nome',
    price,
    description: cleanText(item.description || ''),
    image_url: item.image_url || ''
  };
}

function buildCategory(cat, cIdx) {
  return {
    id: `mc-${Date.now()}-${cIdx}`,
    name: cleanText(cat.name) || 'Outros',
    items: (cat.items || []).map((item, iIdx) => buildItem(item, cIdx, iIdx))
  };
}

const restaurantsFile = resolve(ROOT, 'scraped_restaurants_google.json');
const menusFile = resolve(ROOT, 'scraped_menus.json');
const outputDir = resolve(ROOT, 'scripts', 'output');
mkdirSync(outputDir, { recursive: true });

const restaurants = JSON.parse(readFileSync(restaurantsFile, 'utf8'));
const menus = JSON.parse(readFileSync(menusFile, 'utf8'));

console.log(`\nCarregados ${restaurants.length} restaurantes e ${menus.length} cardápios avulsos.\n`);

const normalizedMenus = {};
for (const menu of menus) {
  normalizedMenus[normalizeName(menu.restaurantName)] = menu;
}

const completedMap = {};
let matchByName = 0;
let matchById = 0;
let noMenuData = 0;

for (const r of restaurants) {
  const restaurantId = r.id;
  const cleanName = normalizeName(r.name);

  let mergedCategories = [];

  // Prefer menu_categories from scraped_restaurants_google.json first
  if (r.menu_categories && r.menu_categories.length > 0) {
    mergedCategories = r.menu_categories.map((cat, cIdx) => buildCategory(cat, cIdx));
  }

  // Try to find matching menu from scraped_menus.json by name
  if (normalizedMenus[cleanName]) {
    const menuData = normalizedMenus[cleanName];
    if (menuData.categories && menuData.categories.length > 0) {
      mergedCategories = menuData.categories.map((cat, cIdx) => buildCategory(cat, cIdx));
    }
    matchByName++;
  } else if (normalizedMenus[r.id]) {
    const menuData = normalizedMenus[r.id];
    if (menuData.categories && menuData.categories.length > 0) {
      mergedCategories = menuData.categories.map((cat, cIdx) => buildCategory(cat, cIdx));
    }
    matchById++;
  }

  if (!mergedCategories || mergedCategories.length === 0) {
    noMenuData++;
  }

  const phone = (r.phone || '').replace(/[^\d+()\s-]/g, '').trim();
  const address = (r.address || '').replace(/^[^\w\s]+/, '').trim();

  completedMap[restaurantId] = {
    id: restaurantId,
    name: r.name,
    plan: 'free',
    phone,
    address,
    number: '',
    neighborhood: '',
    city: r.city || 'João Pessoa',
    state: r.state || 'PB',
    description: r.category ? `Especialidade em ${r.category}` : '',
    category: r.category || 'Restaurante',
    image_url: r.logo || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=100',
    cover_image_url: r.coverImage || r.cover_image_url || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800',
    menu_categories: mergedCategories,
    gallery_images: (r.galleryImages || r.gallery_images || []).length > 0
      ? (r.galleryImages || r.gallery_images || []).map((url, idx) => ({
          id: `mg-${idx}`,
          image_url: typeof url === 'string' ? url : url.image_url || url.url || '',
          caption: url.caption || 'Foto do Local',
          order_index: idx
        })).filter(g => g.image_url)
      : [{ id: 'mg-1', image_url: 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=600', caption: 'Fachada', order_index: 0 }],
    social_networks: [
      { platform: 'instagram', url: r.instagram || '' },
      { platform: 'facebook', url: r.facebook || '' }
    ].filter(s => s.url),
    opening_hours: r.openingHours || r.opening_hours || null,
    visit_status: 'Visitado',
    menuSourceUrl: r.menuSourceUrl || r.menuUrl || '',
    googleMapsUrl: r.googleMapsUrl || '',
    website: r.website || ''
  };
}

const outputFile = resolve(outputDir, 'mock-completed-restaurants.json');
writeFileSync(outputFile, JSON.stringify(completedMap, null, 2));
console.log(`Arquivo gerado: ${outputFile}`);

const adminMenusOutput = resolve(outputDir, 'admin-scraped-menus.json');
const adminMenusArray = menus.map(m => ({
  restaurantId: m.restaurantId || m.id,
  restaurantName: m.restaurantName,
  restaurantCategory: m.restaurantCategory || '',
  menuSourceUrl: m.menuSourceUrl || '',
  categories: (m.categories || []).map((cat, cIdx) => ({
    name: cleanText(cat.name) || 'Outros',
    items: (cat.items || []).map((item, iIdx) => {
      const rawPrice = String(item.price || '');
      let price = parsePrice(rawPrice);
      let name = cleanText(item.name || '');
      if (!price && rawPrice) {
        const match = name.match(/R?\$?\s*([\d.,]+)/);
        if (match) price = parsePrice(match[1]);
        name = name.replace(/R?\$?\s*[\d.,]+\s*$/, '').trim();
      }
      return {
        name: name || 'Item sem nome',
        price: price > 0 ? `R$ ${price.toFixed(2).replace('.', ',')}` : '',
        description: cleanText(item.description || ''),
        image_url: item.image_url || ''
      };
    })
  }))
}));
writeFileSync(adminMenusOutput, JSON.stringify(adminMenusArray, null, 2));
console.log(`Arquivo gerado: ${adminMenusOutput}`);

console.log(`\nResumo da importação:`);
console.log(`  Restaurantes processados: ${restaurants.length}`);
console.log(`  Cardápios mesclados via nome: ${matchByName}`);
console.log(`  Cardápios mesclados via ID: ${matchById}`);
console.log(`  Restaurantes sem cardápio: ${noMenuData}`);
console.log(`  Total com cardápio: ${restaurants.length - noMenuData}`);
console.log(`  Itens de menu (scraped_menus.json): ${adminMenusArray.length}`);
console.log(`\nPara importar no sistema:`);
console.log(`  1. Acesse o painel admin → "Cardápios Coletados"`);
console.log(`  2. Faça upload do arquivo: ${adminMenusOutput}`);
console.log(`  3. Clique em "Sincronizar no Catálogo"`);
console.log(`  4. Ou importe o arquivo principal via GoogleMapsCollector`);
console.log(`\nOu execute o script de sincronização direta com Supabase:`);
console.log(`  node scripts/sync-to-supabase.mjs\n`);
