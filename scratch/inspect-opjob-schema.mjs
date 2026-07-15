import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data, error } = await supabase.from('operation_jobs').select('*').eq('city','João Pessoa').eq('state','PB').limit(1);
if (error) throw error;
console.log(JSON.stringify({ keys: data?.[0] ? Object.keys(data[0]).sort() : [], row: data?.[0] || null }, null, 2));
