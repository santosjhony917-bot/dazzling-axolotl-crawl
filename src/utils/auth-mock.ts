import { base44 } from "@/api/base44Client";
import { supabase } from "@/integrations/supabase/client";
import { AppRole } from "@/hooks/useUserRole";

/**
 * Simula o login de um usuário e define seu role no mock de autenticação.
 */
export async function mockLoginWithRole(role: AppRole) {
  const email = `mock-${role}@filterfood.com`;
  const password = 'password';

  // 1. Garante um estado limpo
  await supabase.auth.signOut();
  await base44.auth.clearRole();

  // 2. Tenta cadastrar o usuário. Se já existir, o erro é ignorado.
  const { error: signUpError } = await supabase.auth.signUp({
    email,
    password,
  });

  if (signUpError && !signUpError.message.includes('already exists')) {
    console.error("Mock Auth Signup Error:", signUpError.message);
    throw signUpError;
  }

  // 3. Tenta fazer login
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (signInError) {
    console.error("Mock Auth Signin Error:", signInError.message);
    throw signInError;
  }
  
  // 4. Define o role no banco de dados (Supabase RPC)
  const { error: roleError } = await supabase.rpc('set_user_role', { new_role: role });
  
  if (roleError) {
    console.error("Mock Auth Role Assignment Error:", roleError.message);
    throw roleError;
  }

  // 5. Define o role no mock da API (para simular o backend retornando o role)
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