const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://gaawiewmlhorzbaixoqo.supabase.co';
const supabaseAnonKey = 'sb_publishable_1cZaKyo-HHldXBWLKtpKhw_nN7fMfQ3';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function find() {
  console.log('Searching for At Pizza Manaíra in database...');
  
  // Search by coordinates in supabase
  const { data: coordsData, error: coordsError } = await supabase
    .from('restaurants')
    .select('id, name, address, other_url, external_url, latitude, longitude')
    .filter('latitude', 'eq', -7.1099467);
    
  if (coordsData && coordsData.length > 0) {
    console.log('Found by exact latitude:', coordsData);
    return;
  }

  // Search by name similarity
  const { data: nameData, error: nameError } = await supabase
    .from('restaurants')
    .select('id, name, address, other_url, external_url, latitude, longitude, visit_status')
    .ilike('name', '%Pizza%');
    
  console.log('Found with "Pizza" in name:', nameData.filter(r => r.name.toLowerCase().includes('at') || r.address.toLowerCase().includes('manaíra') || r.address.toLowerCase().includes('manaira')));
}

find();
