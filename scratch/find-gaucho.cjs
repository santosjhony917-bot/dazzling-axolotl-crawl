const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://gaawiewmlhorzbaixoqo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_1cZaKyo-HHldXBWLKtpKhw_nN7fMfQ3';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .ilike('name', '%Gaúcho%');

  if (error) {
    console.error('Error:', error);
  } else {
    console.log('Results:', data.map(r => ({
      id: r.id,
      name: r.name,
      opening_hours: r.opening_hours,
      visit_notes: r.visit_notes
    })));
  }
}

run();
