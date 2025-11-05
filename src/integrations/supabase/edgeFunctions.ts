import { supabase } from './client';

interface ClaimRestaurantPayload {
  accessCode: string;
  email: string;
  password?: string; // Password is optional for existing users, but required for new ones
}

interface ClaimRestaurantResponse {
  email: string;
  password?: string; // Password might be returned for new user creation
  message: string;
}

export const claimRestaurant = async (payload: ClaimRestaurantPayload): Promise<ClaimRestaurantResponse> => {
  const { data, error } = await supabase.functions.invoke('claim-restaurant', {
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  });

  if (error) {
    console.error('Error invoking claim-restaurant edge function:', error);
    throw new Error(error.message || 'Failed to claim restaurant via edge function.');
  }

  if (data.error) {
    throw new Error(data.error);
  }

  return data;
};

export const bulkCreateRestaurants = async (csvData: string): Promise<{ successCount: number; message: string }> => {
  const { data, error } = await supabase.functions.invoke('bulk-create-restaurants', {
    body: { csvData },
  });

  if (error) {
    console.error('Error invoking bulk-create-restaurants edge function:', error);
    throw new Error(error.message || 'Falha ao processar a criação de restaurantes em massa.');
  }

  if (data.error) {
    throw new Error(data.error);
  }

  return data;
};

interface RegisterRestaurantPayload {
  name: string;
  email: string;
  password?: string;
  phone?: string;
  category?: string;
  address?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  cep?: string;
  latitude?: number;
  longitude?: number;
}

interface RegisterRestaurantResponse {
  email: string;
  password?: string;
  message: string;
}

export const registerRestaurant = async (payload: RegisterRestaurantPayload): Promise<RegisterRestaurantResponse> => {
  const { data, error } = await supabase.functions.invoke('register-restaurant', {
    body: JSON.stringify(payload),
    headers: { 'Content-Type': 'application/json' },
  });

  if (error) {
    console.error('Error invoking register-restaurant edge function:', error);
    throw new Error(error.message || 'Failed to register restaurant via edge function.');
  }

  if (data.error) {
    throw new Error(data.error);
  }

  return data;
};