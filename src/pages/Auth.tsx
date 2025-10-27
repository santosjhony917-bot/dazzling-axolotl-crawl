import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Auth as SupabaseAuth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/context/AuthContext';
import { Loader2, Utensils } from 'lucide-react';
import { createPageUrl } from '@/utils/url';
import { showError } from '@/utils/toast';
import { Button } from '@/components/ui/button'; // Importando Button

export default function Auth() {
  const navigate = useNavigate();
  const { session, isLoading: isAuthLoading, refetchProfile } = useAuthContext();
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
                    // Cores do nosso tema
                    brand: '#E47948', // Botão principal (Highlight)
                    brandAccent: '#022D68', // Cor de destaque (Primary)
                    
                    // Botão Principal (Entrar/Criar Conta)
                    defaultButtonBackground: '#E47948', // Usando Highlight para o botão principal
                    defaultButtonBackgroundHover: '#E47948CC', 
                    defaultButtonText: '#ffffff',
                    
                    // Inputs
                    inputBackground: '#ffffff',
                    inputBorder: '#e5e7eb',
                    inputBorderHover: '#E47948', // Highlight
                    inputBorderFocus: '#E47948', // Highlight
                    inputLabelText: '#022D68', // Primary
                    inputText: '#1f2937',
                    
                    // Links (Esqueceu a senha, etc.)
                    anchorTextColor: '#022D68', // Primary
                    anchorTextHoverColor: '#E47948', // Highlight
                  },
                  radii: {
                    borderRadiusButton: '0.75rem', // rounded-xl
                    inputBorderRadius: '0.75rem', // rounded-xl
                  },
                  // Adicionando sombra ao botão principal (se suportado pelo ThemeSupa)
                  // Nota: ThemeSupa não suporta classes Tailwind, mas podemos tentar simular com box shadow
                  // Se não funcionar, o estilo será aplicado via CSS global ou classes customizadas.
                  // Por enquanto, confiamos nas cores.
                },
              },
            }}
            theme="light"
            providers={[]}
            view={mode}
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
                  link_text: 'Esqueceu sua senha?', // Movendo o link de esqueci a senha para o Auth UI
                },
                sign_up: {
                  email_label: 'Seu e-mail',
                  password_label: 'Crie uma senha',
                  email_input_placeholder: 'exemplo@email.com',
                  password_input_placeholder: '••••••••',
                  button_label: 'Criar Conta',
                  loading_button_label: 'Criando conta...',
                  link_text: 'Já tem uma conta? Entre',
                },
                forgotten_password: {
                  link_text: 'Voltar para o login',
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
          />
          
          {/* Botão de Login de Restaurante */}
          <div className="pt-6 border-t border-gray-100 mt-6">
            <Link to={createPageUrl('restaurant-login')}>
              <Button
                variant="outline"
                className="w-full h-10 text-sm bg-gray-100 text-primary hover:bg-gray-200 rounded-xl shadow-soft-sm border-gray-200"
              >
                <Utensils className="w-4 h-4 mr-2" />
                Login de Restaurante
              </Button>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}