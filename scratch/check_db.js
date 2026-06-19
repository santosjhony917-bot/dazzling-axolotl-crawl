import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gaawiewmlhorzbaixoqo.supabase.co';
const supabaseAnonKey = 'sb_publishable_1cZaKyo-HHldXBWLKtpKhw_nN7fMfQ3';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function check() {
  console.log("Checking Supabase tables...");
  
  const tables = ['regioes', 'registro_estrategias_ia', 'campanhas_lotes', 'estabelecimentos', 'historico_janelas_24h'];
  
  for (const table of tables) {
    const { data, error } = await supabase.from(table).select('count', { count: 'exact', head: true });
    if (error) {
      console.log(`❌ Table "${table}" error:`, error.message);
    } else {
      console.log(`✅ Table "${table}" exists. Row count:`, data || 0);
    }
  }
}

check();
