import { supabase } from './client';

const SUPABASE_PROJECT_ID = 'gaawiewmlhorzbaixoqo'; 
const ADMIN_FUNCTION_URL = `https://${SUPABASE_PROJECT_ID}.supabase.co/functions/v1/manage-admin-role`;

interface AdminUser {
    id: string;
    email: string;
    role: string;
}

/**
 * Fetches the list of active administrators.
 */
export async function listAdmins(): Promise<AdminUser[]> {
  const response = await fetch(ADMIN_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action: 'list' }),
  });

  const data = await response.json();

  if (!response.ok) {
    console.error("Edge Function Error (listAdmins):", data);
    throw new Error(data.error || "Failed to list administrators.");
  }

  return data.admins as AdminUser[];
}

/**
 * Promotes an existing user to administrator role by email.
 */
export async function addAdmin(email: string): Promise<void> {
  const response = await fetch(ADMIN_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action: 'add', email }),
  });

  const data = await response.json();
  
  // Log the response data for debugging
  console.log("Edge Function Response (addAdmin):", { ok: response.ok, status: response.status, data });

  if (!response.ok) {
    // Lança o erro com a mensagem detalhada da Edge Function
    throw new Error(data.error || `Falha ao promover usuário ${email} para admin.`);
  }
}

/**
 * Removes the administrator role from a user by ID.
 */
export async function removeAdmin(userId: string): Promise<void> {
  const response = await fetch(ADMIN_FUNCTION_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ action: 'remove', userId }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || `Failed to remove admin role from user ID ${userId}.`);
  }
}