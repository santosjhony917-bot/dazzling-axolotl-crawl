import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data, error } = await supabase
  .from('menu_import_runs')
  .select('id,restaurant_id,status,extraction_level,confidence,item_count,priced_item_count,unresolved_item_count,issues,evidence,source_url,platform,created_at,committed_at,restaurants!inner(city,state,is_deleted,name)')
  .eq('restaurants.city','João Pessoa')
  .eq('restaurants.state','PB');
if (error) throw error;
const runs = data || [];
const counts = runs.reduce((acc,r)=>{acc[r.status]=(acc[r.status]||0)+1;return acc;},{});
console.log(JSON.stringify({ total:runs.length, counts, sample:runs.slice(0,3) }, null, 2));
