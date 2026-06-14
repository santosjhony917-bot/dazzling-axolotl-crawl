import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gaawiewmlhorzbaixoqo.supabase.co';
const supabaseAnonKey = 'sb_publishable_1cZaKyo-HHldXBWLKtpKhw_nN7fMfQ3';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function dump() {
  try {
    const { data: items, error } = await supabase
      .from('menu_items')
      .select(`
        id,
        name,
        description,
        price,
        menu_categories (
          name
        )
      `)
      .limit(50);

    if (error) throw error;

    console.log(JSON.stringify(items, null, 2));
  } catch (err) {
    console.error("Error:", err);
  }
}

dump();
