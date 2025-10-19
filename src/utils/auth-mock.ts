import { base44 } from "@/api/base44Client";
import { supabase } from "@/integrations/supabase/client";
import { AppRole } from "@/hooks/useUserRole";

/**
 * Simula o login de um usuário e define seu role no mock de autenticação.
 */
export async function mockLoginWithRole(role: AppRole) {
  const email = `mock-${role}@filterfood.com`;
  const password = 'password';

  // 1. Limpa qualquer role anterior no mock
  await base44.auth.clearRole();

  // 2. Tenta obter o usuário. Se não existir, cadastra.
  const { data: { user: existingUser } } = await supabase.auth.getUser();
  
  if (!existingUser || existingUser.email !== email) {
    console.log(`Mock Auth: Checking if user ${email} exists...`);
    
    // Tenta cadastrar. Se já existir, o Supabase retornará um erro que podemos ignorar
    // ou que será tratado pela tentativa de login subsequente.
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signUpError && !signUpError.message.includes('already exists')) {
      console.error("Mock Auth Signup Error:", signUpError.message);
      throw signUpError;
    }
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