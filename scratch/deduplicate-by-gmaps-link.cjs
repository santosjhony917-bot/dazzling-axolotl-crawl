const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://gaawiewmlhorzbaixoqo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_1cZaKyo-HHldXBWLKtpKhw_nN7fMfQ3';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const extractGmapsUrl = (visitNotes) => {
  if (!visitNotes) return '';
  const match = visitNotes.match(/Google Maps:\s*(https?:\/\/[^\s\n\r]+)/);
  if (match) {
    // Split by ? to clean up any tracking query parameters
    return match[1].split('?')[0].trim();
  }
  return '';
};

const getCompletenessScore = (r) => {
  let score = 0;
  
  // 1. Visit status (Keep 'Visitado' or 'Interessado' over 'Pendente')
  if (r.visit_status === 'Visitado') score += 10000;
  if (r.visit_status === 'Interessado') score += 5000;
  
  // 2. Reviews and Rating
  const reviews = r.reviews_count || 0;
  score += reviews * 10;
  if (r.rating) score += r.rating * 5;
  
  // 3. Socials & Contact
  if (r.phone && r.phone.length > 5) score += 100;
  if (r.image_url) score += 50;
  if (r.cover_image_url) score += 50;
  if (r.followers_override) score += 50;
  
  // 4. Address completeness
  const address = r.address || '';
  score += address.length; // More characters is generally better
  if (/\d/.test(address)) score += 30; // Has numbers (e.g. street number)
  
  // 5. Relations
  const menuCats = r.menu_categories || [];
  score += menuCats.length * 100;
  
  let menuItemsCount = 0;
  menuCats.forEach(cat => {
    menuItemsCount += (cat.menu_items || []).length;
  });
  score += menuItemsCount * 20;

  const galleryImages = r.restaurant_gallery || [];
  score += galleryImages.length * 50;

  return score;
};

async function run() {
  const dryRun = process.argv.includes('--execute') ? false : true;
  console.log(`Deduplicating by Google Maps Link. Mode: ${dryRun ? 'DRY RUN' : 'EXECUTE'}`);

  console.log('Fetching all restaurants with relations...');
  const PAGE_SIZE = 500; // Smaller page size because of relations payload
  const allRestaurants = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error } = await supabase
      .from('restaurants')
      .select(`
        id, name, address, city, rating, reviews_count, visit_status, is_deleted,
        phone, image_url, cover_image_url, followers_override, visit_notes,
        menu_categories (
          id, name,
          menu_items (id, name)
        ),
        restaurant_gallery (id)
      `)
      .range(from, to);

    if (error) {
      console.error('Error fetching page:', error);
      return;
    }

    if (data && data.length > 0) {
      allRestaurants.push(...data);
      page++;
    } else {
      hasMore = false;
    }

    if (!data || data.length < PAGE_SIZE) {
      hasMore = false;
    }
  }

  console.log(`Total restaurants in database: ${allRestaurants.length}`);

  // Group by extracted Google Maps URL
  const groups = {};
  let emptyUrlCount = 0;

  allRestaurants.forEach(r => {
    const url = extractGmapsUrl(r.visit_notes);
    if (!url) {
      emptyUrlCount++;
      return;
    }
    if (!groups[url]) {
      groups[url] = [];
    }
    groups[url].push(r);
  });

  console.log(`Restaurants with no Google Maps link: ${emptyUrlCount}`);
  
  const duplicateGroups = Object.entries(groups).filter(([url, list]) => list.length > 1);
  console.log(`Found ${duplicateGroups.length} duplicate groups by Google Maps URL.`);

  const toDeleteIds = new Set();
  const detailsToDelete = [];

  duplicateGroups.forEach(([url, list]) => {
    // Score each restaurant
    const scoredList = list.map(r => ({
      restaurant: r,
      score: getCompletenessScore(r)
    }));

    // Sort by score descending
    scoredList.sort((a, b) => b.score - a.score);

    const keep = scoredList[0];
    const duplicates = scoredList.slice(1);

    console.log(`\nURL Group: ${url}`);
    console.log(`  KEEP: id=${keep.restaurant.id} name="${keep.restaurant.name}" score=${keep.score} reviews=${keep.restaurant.reviews_count || 0} addr="${keep.restaurant.address}"`);

    duplicates.forEach(item => {
      toDeleteIds.add(item.restaurant.id);
      detailsToDelete.push({
        id: item.restaurant.id,
        name: item.restaurant.name,
        address: item.restaurant.address,
        reviews: item.restaurant.reviews_count || 0,
        score: item.score,
        keepName: keep.restaurant.name,
        keepId: keep.restaurant.id,
        url
      });
      console.log(`  DELETE: id=${item.restaurant.id} name="${item.restaurant.name}" score=${item.score} reviews=${item.restaurant.reviews_count || 0} addr="${item.restaurant.address}"`);
    });
  });

  console.log(`\nTotal duplicate records identified for deletion: ${toDeleteIds.size}`);

  if (toDeleteIds.size === 0) {
    console.log('No duplicates found.');
    return;
  }

  if (dryRun) {
    console.log('\nDry run complete. No deletions were performed.');
    console.log('To execute the deletions, run this script with --execute:');
    console.log('node scratch/deduplicate-by-gmaps-link.cjs --execute');
  } else {
    console.log('\nExecuting deletions in Supabase...');
    const idsArray = Array.from(toDeleteIds);
    const CHUNK_SIZE = 50;

    for (let i = 0; i < idsArray.length; i += CHUNK_SIZE) {
      const chunk = idsArray.slice(i, i + CHUNK_SIZE);
      console.log(`Deleting chunk ${i / CHUNK_SIZE + 1} of ${Math.ceil(idsArray.length / CHUNK_SIZE)}...`);
      
      const { error } = await supabase
        .from('restaurants')
        .delete()
        .in('id', chunk);

      if (error) {
        console.error(`Error deleting chunk:`, error);
      } else {
        console.log(`Successfully deleted ${chunk.length} records.`);
      }
    }
    console.log('\nCleanup finished successfully!');
  }
}

run();
