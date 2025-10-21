import { supabase } from './client';

// Substitua pelo seu Project ID real
const SUPABASE_PROJECT_ID = 'ystffcohclbtykangfnt'; 
const EDGE_FUNCTION_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/register-restaurant`;

interface RegisterRestaurantPayload {
  restaurantName: string;
  locations: Array<{
    cep: string;
    street: string;
    number: string;
    complement: string;
    neighborhood: string;
    city: string;
    state: string;
    phone: string;
  }>;
}

interface RegisterRestaurantResponse {
  restaurantId: string;
  message: string;
}

export async function registerRestaurant(payload: RegisterRestaurantPayload): Promise<RegisterRestaurantResponse> {
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    throw new Error("User must be authenticated to register a restaurant.");
  }

  const response = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${session.access_token}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to register restaurant via Edge Function.");
  }

  return data as RegisterRestaurantResponse;
}