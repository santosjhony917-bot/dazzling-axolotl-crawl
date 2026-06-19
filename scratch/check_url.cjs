const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://gaawiewmlhorzbaixoqo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_1cZaKyo-HHldXBWLKtpKhw_nN7fMfQ3';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function checkUrls() {
  console.log("Searching for duplicate URLs in restaurants table...");

  const urls = [
    'https://hamburgueriacabrones.com.br/cabrones_hamburgueria',
    'https://pedido.anota.ai/loja/atpizza',
    'https://pedido.anota.ai/loja/atpizza/'
  ];

  for (const url of urls) {
    const { data: resOther, error: errOther } = await supabase
      .from('restaurants')
      .select('id, name, other_url, external_url')
      .eq('other_url', url);

    const { data: resExt, error: errExt } = await supabase
      .from('restaurants')
      .select('id, name, other_url, external_url')
      .eq('external_url', url);

    console.log(`\nURL: ${url}`);
    console.log(`Matched other_url:`, resOther || []);
    console.log(`Matched external_url:`, resExt || []);
  }
}

checkUrls();
