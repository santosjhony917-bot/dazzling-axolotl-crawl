const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://gaawiewmlhorzbaixoqo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_1cZaKyo-HHldXBWLKtpKhw_nN7fMfQ3';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const normalizeStr = (str) => (str || '')
  .toLowerCase()
  .normalize("NFD")
  .replace(/[\u0300-\u036f]/g, "")
  .replace(/[^a-z0-9]/g, '')
  .trim();

async function run() {
  const dryRun = process.argv.includes('--execute') ? false : true;
  console.log(`Starting duplicate cleanup. Mode: ${dryRun ? 'DRY RUN' : 'EXECUTE'}`);

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

  console.log(`Total restaurants in database: ${allRestaurants.length}`);

  // Group by normalized Name + City
  const groups = {};
  allRestaurants.forEach(r => {
    const key = `${normalizeStr(r.name)}_${normalizeStr(r.city)}`;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(r);
  });

  const toDeleteIds = new Set();
  const detailsToDelete = [];

  Object.entries(groups).forEach(([key, list]) => {
    if (list.length <= 1) return;

    // Sort:
    // 1. More reviews first
    // 2. Longer address first (longer addresses are typically more complete)
    const sorted = [...list].sort((a, b) => {
      const aRev = a.reviews_count || 0;
      const bRev = b.reviews_count || 0;
      if (bRev !== aRev) return bRev - aRev;

      const aAddrLen = (a.address || '').length;
      const bAddrLen = (b.address || '').length;
      return bAddrLen - aAddrLen;
    });

    const keepItem = sorted[0];
    const duplicates = sorted.slice(1);

    duplicates.forEach(other => {
      const keepReviews = keepItem.reviews_count || 0;
      const otherReviews = other.reviews_count || 0;

      // Rule 1: If the keep item has reviews and the duplicate has 0/null reviews, delete it.
      if (keepReviews > 0 && otherReviews === 0) {
        toDeleteIds.add(other.id);
        detailsToDelete.push({
          id: other.id,
          name: other.name,
          address: other.address,
          reviews: other.reviews_count,
          reason: `Zero reviews duplicate of "${keepItem.name}" (reviews=${keepReviews})`
        });
      }
      // Rule 2: If both have 0 reviews, but they are duplicates in the same neighborhood/city, keep one (the one with the longer address).
      else if (keepReviews === 0 && otherReviews === 0) {
        toDeleteIds.add(other.id);
        detailsToDelete.push({
          id: other.id,
          name: other.name,
          address: other.address,
          reviews: other.reviews_count,
          reason: `Duplicate of zero-reviews restaurant "${keepItem.name}" (keeping one with longer address)`
        });
      }
      // Rule 3: If both have reviews, but they have the exact same normalized address and name, delete the duplicate.
      else if (normalizeStr(keepItem.address) === normalizeStr(other.address)) {
        toDeleteIds.add(other.id);
        detailsToDelete.push({
          id: other.id,
          name: other.name,
          address: other.address,
          reviews: other.reviews_count,
          reason: `Exact duplicate (same address and reviews count)`
        });
      }
    });
  });

  console.log(`\nFound ${toDeleteIds.size} records to delete.`);
  
  if (toDeleteIds.size === 0) {
    console.log('No duplicates found matching the cleanup rules.');
    return;
  }

  // Print proposed deletions
  detailsToDelete.forEach((item, index) => {
    console.log(`${index + 1}. [DELETE] id=${item.id} name="${item.name}"`);
    console.log(`   Address: "${item.address}" | Reviews: ${item.reviews}`);
    console.log(`   Reason: ${item.reason}`);
  });

  if (dryRun) {
    console.log('\nDry run complete. No deletions were performed.');
    console.log('To execute the deletions, run this script with --execute:');
    console.log('node scratch/delete-duplicates.cjs --execute');
  } else {
    console.log('\nExecuting deletions in Supabase...');
    const idsArray = Array.from(toDeleteIds);
    
    // Supabase can delete in chunks of 50 to avoid any URL/payload limits
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
