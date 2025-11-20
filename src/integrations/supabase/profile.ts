import { supabase } from './client';
import { Profile, Restaurant } from '@/types/supabase';

export async function getProfile(userId: string): Promise<Profile | null> {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching profile:', error);
    return null;
  }

  return data;
}

export async function getRestaurantByUserId(userId: string, email?: string): Promise<Restaurant | null> {
  // Primeiro tenta buscar pelo user_id
  const { data, error } = await supabase
    .from('restaurants')
    .select('*')
    .eq('user_id', userId)
    .maybeSingle();

  if (data) return data;

  // Se não encontrar e tiver email, tenta buscar pelo email como fallback
  // Isso ajuda em casos onde o link do user_id pode ter sido perdido mas o email coincide
  if (email) {
    console.log('Tentando buscar restaurante por email:', email);
    const { data: dataByEmail } = await supabase
      .from('restaurants')
      .select('*')
      .eq('email', email)
      .maybeSingle();
      
    if (dataByEmail) {
      console.log('Restaurante encontrado por email:', dataByEmail.id);
      return dataByEmail;
    }
  }

  if (error && error.code !== 'PGRST116') {
    console.error('Error fetching restaurant by user ID:', error);
    return null;
  }

  return null;
}