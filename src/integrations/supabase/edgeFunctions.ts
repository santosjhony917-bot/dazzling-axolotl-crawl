import { supabase } from './client';

// Substitua pelo seu Project ID real
const SUPABASE_PROJECT_ID = 'ystffcohclbtykangfnt'; 
const EDGE_FUNCTION_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/register-restaurant`;

interface LocationPayload {
  cep: string;
  street: string;
  number: string;
  complement: string;
  neighborhood: string;
  city: string;
  state: string;
  phone: string;
}

interface RegisterRestaurantPayload {
  restaurantName: string;
  location: LocationPayload; // Alterado para um único objeto
  email: string;
  password: string;
}

interface RegisterRestaurantResponse {
  restaurantId: string;
  message: string;
  email: string;
  password: string;
}

export async function registerRestaurant(payload: RegisterRestaurantPayload): Promise<RegisterRestaurantResponse> {
  
  const response = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to register restaurant via Edge Function.");
  }

  return data as RegisterRestaurantResponse;
}