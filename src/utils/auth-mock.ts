import { base44 } from "@/api/base44Client";
import { supabase } from "@/integrations/supabase/client";
import { AppRole } from "@/hooks/useUserRole";

/**
 * Simula o login de um usuário e define seu role no mock de autenticação.
 * Nota: No ambiente real, o role seria determinado pelo backend após o login.
 */
export async function mockLoginWithRole(role: AppRole) {
  // 1. Limpa qualquer role anterior no mock
  await base44.auth.clearRole();

  // 2. Simula o login no Supabase (necessário para o useUserRole funcionar)
  // Usamos um email/senha mockados para simular um usuário autenticado
  const { error: signInError } = await supabase.auth.signInWithPassword({
    email: `mock-${role}@filterfood.com`,
    password: 'password',
  });

  if (signInError) {
    // Se o usuário mock não existir, criamos ele (apenas para garantir que o Supabase tenha um usuário)
    if (signInError.message.includes('Invalid login credentials')) {
      const { error: signUpError } = await supabase.auth.signUp({
        email: `mock-${role}@filterfood.com`,
        password: 'password',
      });
      if (signUpError) throw signUpError;
      
      // Tenta logar novamente após o cadastro
      const { error: finalSignInError } = await supabase.auth.signInWithPassword({
        email: `mock-${role}@filterfood.com`,
        password: 'password',
      });
      if (finalSignInError) throw finalSignInError;
    } else {
      throw signInError;
    }
  }

  // 3. Define o role no mock da API (para simular o backend retornando o role)
  await base44.auth.updateMe({ user_role: role });
}

/**
 * Simula o logout.
 */
export async function mockLogout() {
  await base44.auth.clearRole();
  await supabase.auth.signOut();
}