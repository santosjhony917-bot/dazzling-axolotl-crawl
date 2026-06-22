const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://gaawiewmlhorzbaixoqo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_1cZaKyo-HHldXBWLKtpKhw_nN7fMfQ3';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function run() {
  const { data, error } = await supabase
    .from('restaurants')
    .select('id, name, city, state');

  if (error) {
    console.error('Error:', error);
    return;
  }

  const citiesMap = {};
  data.forEach(r => {
    const key = `${r.city} | ${r.state}`;
    if (!citiesMap[key]) {
      citiesMap[key] = { count: 0, examples: [] };
    }
    citiesMap[key].count++;
    if (citiesMap[key].examples.length < 3) {
      citiesMap[key].examples.push({ id: r.id, name: r.name });
    }
  });

  console.log('--- Unique City/State combinations ---');
  console.log(JSON.stringify(citiesMap, null, 2));
}

run();
