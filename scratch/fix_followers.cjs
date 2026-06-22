const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = 'https://gaawiewmlhorzbaixoqo.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_1cZaKyo-HHldXBWLKtpKhw_nN7fMfQ3';
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

async function fixFollowers() {
  const { data, error } = await supabase.from('restaurants').select('id, followers_override, social_networks').not('followers_override', 'is', null);
  if (error) { console.error('Error fetching', error); return; }
  console.log('Found', data.length, 'restaurants with followers_override');
  let fixedCount = 0;
  for (const r of data) {
    let trueFollowers = null;
    if (Array.isArray(r.social_networks)) {
      const insta = r.social_networks.find(s => s && s.platform === 'instagram');
      if (insta && typeof insta.followers === 'number') {
        trueFollowers = insta.followers;
      }
    }
    
    if (trueFollowers === null) {
        // Fallback to multiplying by 10 if it seems to have been divided by 10 (or user said 10%)
        trueFollowers = r.followers_override * 10;
    }
    
    await supabase.from('restaurants').update({ followers_override: trueFollowers }).eq('id', r.id);
    fixedCount++;
  }
  console.log('Fixed', fixedCount, 'restaurants.');
}
fixFollowers();
