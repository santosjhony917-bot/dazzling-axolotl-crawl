const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gaawiewmlhorzbaixoqo.supabase.co';
const supabaseAnonKey = 'sb_publishable_1cZaKyo-HHldXBWLKtpKhw_nN7fMfQ3';
const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function checkLeads() {
  const { data, error } = await supabase
    .from('commercial_leads')
    .select(`
          *,
          restaurant:restaurants(name, neighborhood, city, whatsapp_url)
    `);
    
  console.log("Error:", error);
  console.log("Data length:", data ? data.length : 0);
  if (data && data.length > 0) {
    console.log("First item:", data[0]);
  }
}
checkLeads();
