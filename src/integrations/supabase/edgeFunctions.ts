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
  email: string; // Novo campo
  password: string; // Novo campo
}

interface RegisterRestaurantResponse {
  restaurantId: string;
  message: string;
}

export async function registerRestaurant(payload: RegisterRestaurantPayload): Promise<RegisterRestaurantResponse> {
  // Não precisamos mais do token de sessão, pois a Edge Function usa a Service Role Key
  // para criar o usuário e o restaurante.
  
  const response = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      // Não enviamos mais o Authorization header, pois a autenticação é feita pelo payload
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to register restaurant via Edge Function.");
  }

  return data as RegisterRestaurantResponse;
}