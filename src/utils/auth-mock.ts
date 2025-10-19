import { base44 } from "@/api/base44Client";
import { supabase } from "@/integrations/supabase/client";
import { AppRole } from "@/hooks/useUserRole";

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
  await base44.auth.clearRole();

  // 2. Chama a Edge Function para criar/logar o usuário com email confirmado e definir a role
  const response = await fetch(MOCK_AUTH_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${supabase.auth.session()?.access_token || supabase.supabaseKey}`,
    },
    body: JSON.stringify({ email, password, role }),
  });

  const data = await response.json();

  if (!response.ok || data.error) {
    throw new Error(data.error || "Falha na autenticação mock via Edge Function.");
  }

  // 3. Usa o token retornado para logar o usuário no cliente
  const { error: setSessionError } = await supabase.auth.setSession({
    access_token: data.token,
    refresh_token: data.token, // Usando o access_token como refresh_token para simplificar o mock
  });

  if (setSessionError) {
    throw setSessionError;
  }

  // 4. Define o role no mock da API (para simular o backend retornando o role)
  await base44.auth.updateMe({ user_role: role });
  console.log(`Mock Auth: Successfully logged in as ${role}.`);
}

/**
 * Simula o logout.
 */
export async function mockLogout() {
  await base44.auth.clearRole();
  await supabase.auth.signOut();
}