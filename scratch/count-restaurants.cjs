const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://gaawiewmlhorzbaixoqo.supabase.co';
const supabaseAnonKey = 'sb_publishable_1cZaKyo-HHldXBWLKtpKhw_nN7fMfQ3';

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  console.log('Counting restaurants...');
  try {
    const { count, error: countError } = await supabase
      .from('restaurants')
      .select('*', { count: 'exact', head: true });
    
    if (countError) {
      console.error('Error counting:', countError);
      return;
    }
    console.log('Total restaurants in db:', count);

    console.log('Testing paginated fetching...');
    const PAGE_SIZE = 999;
    let page = 0;
    let hasMore = true;
    let totalFetched = 0;

    while (hasMore) {
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      console.log(`Fetching page ${page} (range ${from} to ${to})...`);

      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        console.error('Error fetching page:', error);
        break;
      }

      console.log(`Page ${page} fetched ${data ? data.length : 0} items.`);
      if (data && data.length > 0) {
        totalFetched += data.length;
        page++;
      } else {
        hasMore = false;
      }

      if (!data || data.length < PAGE_SIZE) {
        hasMore = false;
      }

      if (page > 20) {
        console.error('Possible infinite loop! Page count exceeded 20.');
        break;
      }
    }
    console.log(`Done. Total fetched: ${totalFetched}`);
  } catch (e) {
    console.error('Exception:', e);
  }
}

test();
