import { createClient } from '@supabase/supabase-js';
const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const { data, error } = await supabase
  .from('operation_jobs')
  .select('id,stage,status,locked_by,locked_until,source_platform,source_url,last_error,result_summary,updated_at')
  .eq('city','João Pessoa')
  .eq('state','PB')
  .or('status.eq.done,status.eq.blocked,status.eq.error,status.eq.locked');
if (error) throw error;
const useful = (data || []).filter(r => r.status === 'done');
console.log(JSON.stringify({ total: data?.length || 0, useful: useful.slice(0, 20).map(r => ({stage:r.stage, locked_by:r.locked_by, updated_at:r.updated_at, source_platform:r.source_platform, result_summary:r.result_summary})) }, null, 2));
