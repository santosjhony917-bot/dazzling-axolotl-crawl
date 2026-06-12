const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://gaawiewmlhorzbaixoqo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_1cZaKyo-HHldXBWLKtpKhw_nN7fMfQ3';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const getRestaurantUniqueKey = (name, address) => {
  const clean = (str) => (str || '')
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, '')
    .trim();
  return `${clean(name)}_${clean(address)}`;
};

async function run() {
  console.log('Fetching all restaurants...');
  
  const PAGE_SIZE = 999;
  const allRestaurants = [];
  let page = 0;
  let hasMore = true;

  while (hasMore) {
    const from = page * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;

    const { data, error } = await supabase
      .from('restaurants')
      .select('id, name, address, city, rating, reviews_count, visit_status, is_deleted')
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

  console.log(`Total restaurants found: ${allRestaurants.length}`);

  // Group by unique key
  const groups = {};
  allRestaurants.forEach(r => {
    const key = getRestaurantUniqueKey(r.name, r.address);
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(r);
  });

  const duplicates = Object.entries(groups).filter(([key, list]) => list.length > 1);
  console.log(`\nFound ${duplicates.length} duplicate groups.`);

  const toDelete = [];
  const keep = [];

  duplicates.forEach(([key, list]) => {
    console.log(`\nGroup: ${key}`);
    
    // Let's sort the list so that we can prioritize keeping the one with reviews
    // We want to keep the best one: highest reviews count or highest rating
    const sorted = [...list].sort((a, b) => {
      const aRev = a.reviews_count || 0;
      const bRev = b.reviews_count || 0;
      if (bRev !== aRev) return bRev - aRev; // Descending reviews
      
      const aRat = a.rating || 0;
      const bRat = b.rating || 0;
      return bRat - aRat; // Descending rating
    });

    const best = sorted[0];
    const others = sorted.slice(1);

    console.log(`  KEEP: id=${best.id}, name="${best.name}", reviews=${best.reviews_count}, rating=${best.rating}, status=${best.visit_status}`);
    
    others.forEach(other => {
      const otherReviews = other.reviews_count || 0;
      if (otherReviews === 0) {
        console.log(`  DELETE (0 reviews): id=${other.id}, name="${other.name}", reviews=${other.reviews_count}, rating=${other.rating}, status=${other.visit_status}`);
        toDelete.push(other.id);
      } else {
        console.log(`  WARNING duplicate has reviews too: id=${other.id}, name="${other.name}", reviews=${other.reviews_count}, rating=${other.rating}, status=${other.visit_status}`);
      }
    });
  });

  console.log(`\nTotal duplicate records identified for deletion: ${toDelete.length}`);
}

run();
