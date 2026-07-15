import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const runId = '7acd843c-0203-44d6-9341-14581be8205e';
const { data, error } = await supabase.rpc('city_run_metrics', { p_city_run_id: runId });
if (error) throw error;
console.log(JSON.stringify(data, null, 2));
