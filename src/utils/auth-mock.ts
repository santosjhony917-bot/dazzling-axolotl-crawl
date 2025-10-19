import { supabase } from "@/integrations/supabase/client";
import { AppRole } from "@/hooks/useUserRole";
import { showSuccess } from "./toast";

// URL da Edge Function (usando o ID do projeto Supabase)
const MOCK_AUTH_URL = "https://ystffcohclbtykangfnt.supabase.co/functions/v1/mock-auth";

/**
 * Simula o login de um usuário e define seu role no mock de autenticação,
 * garantindo que o email esteja confirmado via Edge Function (Service Role).
 */
export async function mockLoginWithRole(role: AppRole) {
  const email = `mock-${role}@filterfood.com`;
  const password = 'password';

  // 1. Garante um estado limpo
  await supabase.auth.signOut();

  // 2. Chama a Edge Function para criar/confirmar o usuário e definir a role
  const response = await fetch(MOCK_AUTH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password, role }),
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(data.error || "Falha na preparação do usuário mock via Edge Function.");
  }

  // 3. Realiza o login no cliente (agora que o email está confirmado)
  const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });

  if (signInError) {
    throw signInError;
  }

  // 4. Define o role no mock da API (para simular o backend retornando o role)
  // Corrigido: O mock da API aceita 'customer' | 'restaurant'. Mapeamos roles de restaurante para 'restaurant'.
  console.log(`Mock Auth: Successfully logged in as ${role}.`);
}

/**
 * Simula o logout.
 */
export async function mockLogout() {
  await supabase.auth.signOut();
}