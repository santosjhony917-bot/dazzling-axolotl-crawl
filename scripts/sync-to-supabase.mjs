import { readFileSync, existsSync } from 'fs';
import { resolve, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createClient } from '@supabase/supabase-js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const SUPABASE_URL = 'https://gaawiewmlhorzbaixoqo.supabase.co';

function getSupabaseClient() {
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (serviceRoleKey) {
    return createClient(SUPABASE_URL, serviceRoleKey);
  }
  const anonKey = 'sb_publishable_1cZaKyo-HHldXBWLKtpKhw_nN7fMfQ3';
  return createClient(SUPABASE_URL, anonKey);
}

const supabase = getSupabaseClient();
const isServiceRole = !!process.env.SUPABASE_SERVICE_ROLE_KEY;

function uuidFrom(str) {
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (uuidRegex.test(str)) return str;

  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }

  const hex = Math.abs(hash).toString(16).padStart(8, '0') +
              Math.abs(hash * 31).toString(16).padStart(8, '0') +
              Math.abs(hash * 17).toString(16).padStart(8, '0') +
              Math.abs(hash * 13).toString(16).padStart(8, '0');

  const parts = [
    hex.substring(0, 8),
    hex.substring(8, 12),
    '4' + hex.substring(12, 15),
    ((parseInt(hex.substring(15, 17), 16) & 0x3f) | 0x80).toString(16).padStart(2, '0') + hex.substring(17, 19),
    hex.substring(19, 31)
  ];
  return parts.join('-');
}

function parsePrice(raw) {
  if (!raw) return 0;
  const cleaned = String(raw).replace(/[^\d,.-]/g, '').replace(',', '.');
  return parseFloat(cleaned) || 0;
}

const inputFile = resolve(ROOT, 'scripts', 'output', 'mock-completed-restaurants.json');
if (!existsSync(inputFile)) {
  console.error('Arquivo não encontrado. Execute primeiro: node scripts/import-scraped-data.mjs');
  process.exit(1);
}

const restaurants = JSON.parse(readFileSync(inputFile, 'utf8'));
const entries = Object.values(restaurants);

console.log(`\nIniciando sincronização de ${entries.length} restaurantes com Supabase...\n`);

if (!isServiceRole) {
  console.log('⚠ Usando anon key (requer autenticação de admin no Supabase).');
  console.log('  Para usar service_role, defina:');
  console.log('  $env:SUPABASE_SERVICE_ROLE_KEY="sua-chave"');
  console.log('  Ou faça upload manual pelo painel admin.\n');
}

let success = 0;
let failed = 0;

for (let i = 0; i < entries.length; i++) {
  const r = entries[i];
  const uuidId = uuidFrom(r.id);

  process.stdout.write(`[${i + 1}/${entries.length}] ${r.name}... `);

  try {
    const restaurantData = {
      id: uuidId,
      name: r.name,
      plan: r.plan || 'free',
      phone: (r.phone || '').replace(/[^\d+]/g, ''),
      address: r.address || '',
      number: r.number || '',
      neighborhood: r.neighborhood || '',
      city: r.city || '',
      state: r.state || '',
      description: r.description || '',
      category: r.category || '',
      image_url: r.image_url || 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=100',
      cover_image_url: r.cover_image_url || r.coverImage || 'https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800',
      visit_status: 'Visitado',
      visit_notes: `Fonte Cardápio: ${r.menuSourceUrl || 'Não informado'}`,
      claim_code: 'CLAIM-' + uuidId.substring(0, 5).toUpperCase(),
      opening_hours: r.opening_hours || null,
      social_networks: r.social_networks || []
    };

    // Extract lat/lng if available
    if (r.latitude) restaurantData.latitude = r.latitude;
    if (r.longitude) restaurantData.longitude = r.longitude;
    if (r.googleMapsUrl) {
      const matchLat = r.googleMapsUrl.match(/!3d(-?\d+\.\d+)/);
      const matchLng = r.googleMapsUrl.match(/!4d(-?\d+\.\d+)/);
      if (matchLat && matchLng) {
        restaurantData.latitude = parseFloat(matchLat[1]);
        restaurantData.longitude = parseFloat(matchLng[1]);
      }
    }

    const { error: restError } = await supabase
      .from('restaurants')
      .upsert(restaurantData, { onConflict: 'id' });

    if (restError) throw restError;

    if (r.menu_categories && r.menu_categories.length > 0) {
      const { error: delCatError } = await supabase
        .from('menu_categories')
        .delete()
        .eq('restaurant_id', uuidId);
      if (delCatError) console.warn('  ⚠ Erro ao limpar categorias:', delCatError.message);

      for (let cIdx = 0; cIdx < r.menu_categories.length; cIdx++) {
        const cat = r.menu_categories[cIdx];
        const catUuid = uuidFrom(`cat-${uuidId}-${cat.name}-${cIdx}`);

        const { error: catError } = await supabase
          .from('menu_categories')
          .insert({
            id: catUuid,
            restaurant_id: uuidId,
            name: cat.name || 'Outros',
            order_index: cIdx,
            is_active: true
          });

        if (catError) throw catError;

        if (cat.items && cat.items.length > 0) {
          const itemsToInsert = cat.items.map((item, iIdx) => ({
            id: uuidFrom(`item-${catUuid}-${item.name}-${iIdx}`),
            category_id: catUuid,
            name: item.name || 'Item sem nome',
            description: item.description || '',
            price: typeof item.price === 'number' ? item.price : parsePrice(item.price),
            image_url: item.image_url || '',
            order_index: iIdx,
            is_active: true
          }));

          const { error: itemsError } = await supabase
            .from('menu_items')
            .insert(itemsToInsert);

          if (itemsError) throw itemsError;
        }
      }
    }

    // Gallery
    if (r.gallery_images && r.gallery_images.length > 0) {
      await supabase.from('restaurant_gallery').delete().eq('restaurant_id', uuidId);
      const galleryToInsert = r.gallery_images
        .map((img, idx) => ({
          restaurant_id: uuidId,
          image_url: typeof img === 'string' ? img : img.image_url || img.url || '',
          caption: img.caption || 'Foto do Local',
          order_index: idx
        }))
        .filter(g => g.image_url);
      if (galleryToInsert.length > 0) {
        await supabase.from('restaurant_gallery').insert(galleryToInsert);
      }
    }

    console.log('✅');
    success++;
  } catch (err) {
    console.log(`❌ ${err.message}`);
    failed++;
  }
}

console.log(`\nSincronização concluída!`);
console.log(`  ✅ Sucesso: ${success}`);
console.log(`  ❌ Falhas: ${failed}`);
