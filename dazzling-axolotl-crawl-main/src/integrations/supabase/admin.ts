import { supabase } from '@/integrations/supabase/client';

export async function checkIsAdmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_admin');

  if (error) {
    console.error('Error checking admin status:', error);
    return false;
  }

  return data ?? false;
}