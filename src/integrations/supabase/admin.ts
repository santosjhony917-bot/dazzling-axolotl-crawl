import { supabase } from '@/integrations/supabase/client';
import { Tables } from '@/types/supabase';

export async function checkIsAdmin(): Promise<boolean> {
  const { data, error } = await supabase.rpc('is_admin');

  if (error) {
    console.error('Error checking admin status:', error);
    return false;
  }

  return data ?? false;
}

export async function getBanners(): Promise<Tables<'banners'>[]> {
  const { data, error } = await supabase
    .from('banners')
    .select('*')
    .order('order_index', { ascending: true });

  if (error) {
    console.error('Error fetching banners:', error);
    return [];
  }

  return data || [];
}