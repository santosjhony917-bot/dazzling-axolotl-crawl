import { supabase } from './client';

// Substitua pelo seu Project ID real
const SUPABASE_PROJECT_ID = 'ystffcohclbtykangfnt'; 
const EDGE_FUNCTION_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/register-restaurant`;

interface RegisterRestaurantPayload {
  restaurantName: string;
  locations: Array<{
    cep: string;
    street: string;
    number: string; // <-- Adicionado
    complement: string;
    neighborhood: string;
    city: string;
    state: string;
    phone: string;
  }>;
  email: string;
  password: string;
}

interface RegisterRestaurantResponse {
  restaurantId: string;
  message: string;
  email: string; // Adicionado
  password: string; // Adicionado
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