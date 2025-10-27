import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Auth as SupabaseAuth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';
import { createPageUrl } from '@/utils/url';
import { showError } from '@/utils/toast';

export default function Auth() {
  const navigate = useNavigate();
  const { session, isLoading: isAuthLoading, refetchProfile } = useAuthContext();
  // Mantemos o estado 'mode' para definir a view inicial, mas o Auth UI gerencia as transições internas.
  const [mode, setMode] = useState<'sign_in' | 'sign_up'>('sign_in'); 

  // Redireciona se já estiver logado
  useEffect(() => {
    if (session) {
      navigate(createPageUrl('home'));
    }
  }, [session, navigate]);

  // Lida com a mudança de estado de autenticação (para erros e sucesso)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        // Força o refetch do perfil para garantir que o contexto esteja atualizado
        refetchProfile(); 
        navigate(createPageUrl('home'));
      }
      
      if (event === 'PASSWORD_RECOVERY') {
        console.log("Password recovery initiated.");
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, refetchProfile]);

  if (isAuthLoading || session) {
    return (
      <div className="flex justify-center items-center h-screen bg-background-light">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center bg-background-light p-4">
      <main className="flex-1 flex flex-col justify-center w-full max-w-md">
        {/* Card Principal */}
        <div className="bg-white rounded-2xl shadow-soft-xl p-6">
          <div className="text-center mb-6">
            <h1 className="text-primary tracking-tight text-3xl font-bold leading-tight">
              {/* Usamos o estado 'mode' para definir o título inicial, mas o Auth UI pode mudar a view */}
              {mode === 'sign_in' ? 'Acesse sua conta' : 'Crie sua conta'}
            </h1>
            <p className="text-gray-500 mt-1">
              {mode === 'sign_in' ? 'Bem-vindo de volta!' : 'Junte-se à comunidade FilterFood.'}
            </p>
          </div>

          <SupabaseAuth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: '#022D68', // Primary
                    brandAccent: '#FF6B6B', // Highlight
                    defaultButtonBackground: '#f5f7f8',
                    defaultButtonBackgroundHover: '#e0e3e6',
                    inputBackground: '#ffffff',
                    inputBorder: '#e5e7eb',
                    inputBorderHover: '#FF6B6B',
                    inputBorderFocus: '#FF6B6B',
                    inputLabelText: '#374151',
                    inputText: '#1f2937',
                  },
                  radii: {
                    borderRadiusButton: '0.75rem', // rounded-xl
                    inputBorderRadius: '0.75rem', // rounded-xl
                  },
                },
              },
            }}
            theme="light"
            providers={[]}
            view={mode}
            // Redireciona para a mesma página para que o useEffect lide com o login
            redirectTo={window.location.origin + createPageUrl('auth')} 
            localization={{
              variables: {
                sign_in: {
                  email_label: 'Seu e-mail',
                  password_label: 'Sua senha',
                  email_input_placeholder: 'exemplo@email.com',
                  password_input_placeholder: '••••••••',
                  button_label: 'Entrar',
                  loading_button_label: 'Entrando...',
                  link_text: 'Já tem uma conta? Entre',
                },
                sign_up: {
                  email_label: 'Seu e-mail',
                  password_label: 'Crie uma senha',
                  email_input_placeholder: 'exemplo@email.com',
                  password_input_placeholder: '••••••••',
                  button_label: 'Criar Conta',
                  loading_button_label: 'Criando conta...',
                  link_text: 'Não tem uma conta? Crie uma',
                },
                forgotten_password: {
                  link_text: 'Esqueceu sua senha?',
                  email_label: 'Seu e-mail',
                  email_input_placeholder: 'exemplo@email.com',
                  button_label: 'Enviar instruções de recuperação',
                  loading_button_label: 'Enviando...',
                },
                update_password: {
                  password_label: 'Nova senha',
                  password_input_placeholder: '••••••••',
                  button_label: 'Atualizar senha',
                  loading_button_label: 'Atualizando...',
                },
              },
            }}
            // onViewChange removido para corrigir o erro de tipagem.
          />
        </div>
      </main>
    </div>
  );
}