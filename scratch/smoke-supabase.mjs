import { createClient } from '@supabase/supabase-js';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

const { data, error } = await supabase
  .from('restaurants')
  .select('id')
  .eq('city', 'João Pessoa')
  .eq('state', 'PB')
  .limit(1);

console.log(JSON.stringify({ ok: !error, error: error?.message || null, rows: data || [] }, null, 2));
