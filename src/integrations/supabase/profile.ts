import { supabase } from './client';
import { Profile, Restaurant } from '@/types/supabase';

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(error.message);
  }
  
  // Mocking is_admin status based on email for now, as metadata is not directly exposed here
  // In a real app, this would come from RLS or a custom claim.
  const isAdmin = data?.id === 'joaoedasilva018@gmail.com'; // Placeholder logic

  return data ? { ...data, is_admin: isAdmin } as Profile : null;
}

export async function updateProfile(userId: string, updates: Partial<Profile>): Promise<Profile> {
  const { data, error } = await supabase
    .from('profiles')
    .update(updates)
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    throw new Error(error.message);
  }
  return data as Profile;
}

export async function getRestaurantByUserId(userId: string): Promise<Restaurant | null> {
  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .eq('user_id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw new Error(error.message);
  }
  return data as Restaurant | null;
}