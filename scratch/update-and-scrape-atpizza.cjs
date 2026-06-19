const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://gaawiewmlhorzbaixoqo.supabase.co';
const supabaseAnonKey = 'sb_publishable_1cZaKyo-HHldXBWLKtpKhw_nN7fMfQ3';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function update() {
  const restaurantId = '19999f5d-3199-4a4c-831b-333952d14ccd';
  console.log(`Updating URLs for restaurant ID: ${restaurantId}...`);
  
  const { data, error } = await supabase
    .from('restaurants')
    .update({
      other_url: 'https://pedido.anota.ai/loja/atpizza',
      external_url: 'https://pedido.anota.ai/loja/atpizza'
    })
    .eq('id', restaurantId)
    .select();

  if (error) {
    console.error('Error updating:', error);
    return;
  }

  console.log('Update successful! Result:', data);
}

update();
