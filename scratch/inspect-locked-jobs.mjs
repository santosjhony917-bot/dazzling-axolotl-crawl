import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data, error } = await supabase
  .from('operation_jobs')
  .select('id,stage,status,locked_by,locked_until,last_error,result_summary,payload,source_platform,source_url,updated_at,attempts,max_attempts')
  .eq('city','João Pessoa')
  .eq('state','PB')
  .eq('status','locked');
if (error) throw error;
console.log(JSON.stringify({ count: data?.length || 0, locks: data || [] }, null, 2));
