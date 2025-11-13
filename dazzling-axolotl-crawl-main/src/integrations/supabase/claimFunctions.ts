import { supabase } from './client';

const SUPABASE_PROJECT_ID = 'ystffcohclbtykangfnt'; 
const EDGE_FUNCTION_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/claim-restaurant`;

interface ClaimRestaurantPayload {
  accessCode: string;
  email: string;
  password: string;
}

interface ClaimRestaurantResponse {
  restaurantId: string;
  message: string;
  email: string;
  password: string;
}

export async function claimRestaurant(payload: ClaimRestaurantPayload): Promise<ClaimRestaurantResponse> {
  
  const response = await fetch(EDGE_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "Failed to claim restaurant via Edge Function.");
  }

  return data as ClaimRestaurantResponse;
}