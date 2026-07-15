import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data, error } = await supabase
  .from('operation_jobs')
  .select('id,stage,status,source_platform,source_url,last_error,result_summary,payload')
  .eq('city','João Pessoa')
  .eq('state','PB')
  .in('status',['blocked','rejected','error']);
if (error) throw error;
const counts = {};
for (const row of data || []) {
  const key = row.source_platform || 'null';
  counts[key] = (counts[key] || 0) + 1;
}
console.log(JSON.stringify({ total: data?.length || 0, counts }, null, 2));
