const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://gaawiewmlhorzbaixoqo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_1cZaKyo-HHldXBWLKtpKhw_nN7fMfQ3';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .ilike('name', '%Ale Pizza%');

  if (error) {
    console.error(error);
    return;
  }

  console.log(`Found ${data.length} matches for "Ale Pizza":`);
  data.forEach(r => {
    console.log(`id=${r.id}, name="${r.name}", address="${r.address}", city="${r.city}", rating=${r.rating}, reviews=${r.reviews_count}`);
  });
}

run();
