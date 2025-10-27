import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/types/supabase';

export async function updateProfile(profileData: Partial<Profile>): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .update(profileData)
    .eq('id', profileData.id)
    .select()
    .single();

  if (error) {
    console.error('Error updating profile:', error);
    return null;
  }

  return data;
}