import { base44 } from "@/api/base44Client";
import { supabase } from "@/integrations/supabase/client";
import { AppRole } from "@/hooks/useUserRole";

/**
 * Simula o login de um usuário e define seu role no mock de autenticação.
 * Nota: No ambiente real, o role seria determinado pelo backend após o login.
 */
export async function mockLoginWithRole(role: AppRole) {
  const email = `mock-${role}@filterfood.com`;
  const password = 'password';

  // 1. Limpa qualquer role anterior no mock
  await base44.auth.clearRole();

  // 2. Tenta fazer login
  let { error: signInError } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  // 3. Se o login falhar com credenciais inválidas (usuário não existe), tenta cadastrar
  if (signInError && signInError.message.includes('Invalid login credentials')) {
    console.log(`Mock Auth: User ${email} not found. Attempting to sign up.`);
    
    const { error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    });
    
    if (signUpError) {
      // Se o erro for que o usuário já existe, ignoramos o erro de cadastro e tentamos logar novamente
      if (signUpError.message.includes('already exists')) {
        console.log(`Mock Auth: User ${email} already exists. Retrying sign in.`);
        ({ error: signInError } = await supabase.auth.signInWithPassword({ email, password }));
      } else {
        throw signUpError;
      }
    } else {
      // Cadastro bem-sucedido, tenta logar
      console.log(`Mock Auth: User ${email} signed up successfully. Signing in.`);
      ({ error: signInError } = await supabase.auth.signInWithPassword({ email, password }));
    }
  }

  if (signInError) {
    throw signInError;
  }

  // 4. Define o role no mock da API (para simular o backend retornando o role)
  await base44.auth.updateMe({ user_role: role });
}

/**
 * Simula o logout.
 */
export async function mockLogout() {
  await base44.auth.clearRole();
  await supabase.auth.signOut();
}