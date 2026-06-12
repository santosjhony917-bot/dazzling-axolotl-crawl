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

  // Group by normalized Name + City
  const groups = {};
  allRestaurants.forEach(r => {
    const key = `${normalizeStr(r.name)}_${normalizeStr(r.city)}`;
    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(r);
  });

  const duplicateGroups = Object.entries(groups).filter(([key, list]) => list.length > 1);
  console.log(`Found ${duplicateGroups.length} candidate duplicate groups by Name + City.`);

  const toDelete = [];
  const keep = [];
  const manualCheck = [];

  duplicateGroups.forEach(([key, list]) => {
    // Sort so the one with most reviews is first
    const sorted = [...list].sort((a, b) => {
      const aRev = a.reviews_count || 0;
      const bRev = b.reviews_count || 0;
      if (bRev !== aRev) return bRev - aRev;
      
      const aRat = a.rating || 0;
      const bRat = b.rating || 0;
      return bRat - aRat;
    });

    const best = sorted[0];
    const others = sorted.slice(1);

    // We only treat them as duplicates to clean up automatically if:
    // 1. The "best" one has > 0 reviews (meaning it's the rich scraped record)
    // 2. The others have 0 reviews or null reviews
    // 3. The addresses match, OR one address is vague (e.g. doesn't have numbers/streets, or is a substring/placeholder)
    const bestReviews = best.reviews_count || 0;

    if (bestReviews > 0) {
      others.forEach(other => {
        const otherReviews = other.reviews_count || 0;
        if (otherReviews === 0) {
          // Check address similarity
          const addr1 = normalizeStr(best.address);
          const addr2 = normalizeStr(other.address);
          
          // If address is identical, or one is substring of other, or other is very short (placeholder)
          const isVague = other.address.length < 35 || addr2.includes(normalizeStr(other.city)) && addr2.length < 30;
          const isSimilar = addr1.includes(addr2) || addr2.includes(addr1) || isVague;

          if (isSimilar) {
            toDelete.push({
              id: other.id,
              name: other.name,
              address: other.address,
              reviews: otherReviews,
              rating: other.rating,
              reason: `Duplicate of "${best.name}" (id=${best.id}, reviews=${best.reviews_count}, address="${best.address}")`
            });
          } else {
            manualCheck.push({
              best,
              other,
              reason: 'Different address and not obviously vague'
            });
          }
        } else {
          manualCheck.push({
            best,
            other,
            reason: 'Both have reviews'
          });
        }
      });
    } else {
      // Both have 0 reviews
      // If address is exactly same, delete one of them
      const addr1 = normalizeStr(best.address);
      others.forEach(other => {
        const addr2 = normalizeStr(other.address);
        if (addr1 === addr2) {
          toDelete.push({
            id: other.id,
            name: other.name,
            address: other.address,
            reviews: other.reviews_count,
            rating: other.rating,
            reason: `Exact duplicate of 0-review restaurant "${best.name}"`
          });
        } else {
          manualCheck.push({
            best,
            other,
            reason: 'Both have 0 reviews but different addresses'
          });
        }
      });
    }
  });

  console.log('\n================ PROPOSED DELETIONS ================');
  toDelete.forEach((item, index) => {
    console.log(`${index + 1}. [DELETE] id=${item.id} name="${item.name}"`);
    console.log(`   Address: "${item.address}" | Reviews: ${item.reviews} | Rating: ${item.rating}`);
    console.log(`   Reason: ${item.reason}`);
  });

  console.log('\n================ MANUAL CHECK / WARNINGS ================');
  manualCheck.forEach((item, index) => {
    console.log(`${index + 1}. [WARN] ${item.reason}`);
    console.log(`   Keep: "${item.best.name}" (reviews=${item.best.reviews_count}, addr="${item.best.address}")`);
    console.log(`   Other: "${item.other.name}" (reviews=${item.other.reviews_count}, addr="${item.other.address}")`);
  });

  console.log(`\nSummary: Proposed deletions: ${toDelete.length} | Warnings to check: ${manualCheck.length}`);
}

run();
