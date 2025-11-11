import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseServiceRoleKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceRoleKey) {
  console.error('Missing Supabase URL or Service Role Key environment variables.');
}

export const adminSupabase = createClient(supabaseUrl, supabaseServiceRoleKey, {
  auth: {
    persistSession: false, // Admin operations usually don't need session persistence
  },
});