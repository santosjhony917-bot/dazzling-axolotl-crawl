import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/types/supabase';

export async function fetchProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching profile:', error);
    throw error;
  }

  return data as Profile | null;
}