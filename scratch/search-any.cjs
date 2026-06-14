const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://gaawiewmlhorzbaixoqo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_1cZaKyo-HHldXBWLKtpKhw_nN7fMfQ3';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function test() {
  const names = ["Miller's food", "Douglas burger", "Mister Grill Hamburgueria e petisco", "EXTRA BURGER", "Heros Burguer"];
  
  for (const name of names) {
    const { data, error } = await supabase
      .from('restaurants')
      .select('id, name, visit_status, is_deleted')
      .ilike('name', `%${name}%`);
      
    if (error) {
      console.error(`Error searching for ${name}:`, error.message);
    } else {
      console.log(`Search for "${name}": found ${data.length} records.`);
      data.forEach(r => console.log(`  - ID: ${r.id}, Name: ${r.name}, Status: ${r.visit_status}, Deleted: ${r.is_deleted}`));
    }
  }
}

test();
