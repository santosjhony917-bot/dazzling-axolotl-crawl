const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://gaawiewmlhorzbaixoqo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_1cZaKyo-HHldXBWLKtpKhw_nN7fMfQ3';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  console.log('Fetching all...');
  
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

  const terms = ['ale pizza', 'werlang', 'biroska', 'house burguer', 'barca', '203 house'];
  
  allRestaurants.forEach(r => {
    const nameNorm = (r.name || '').toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    const matched = terms.some(term => nameNorm.includes(term));
    if (matched) {
      console.log(`id=${r.id}, name="${r.name}", address="${r.address}", city="${r.city}", rating=${r.rating}, reviews=${r.reviews_count}, status=${r.visit_status}`);
    }
  });
}

run();
