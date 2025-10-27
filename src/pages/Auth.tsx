import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Auth as SupabaseAuth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/context/AuthContext';
import { Loader2, MapPin, ArrowLeft, ArrowRight } from 'lucide-react';
import { createPageUrl } from '@/utils/url';
import { showError } from '@/utils/toast';
import { Button } from '@/components/ui/button';

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
  
  // Customização do botão de login/signup para incluir a seta
  const CustomButton = ({ defaultLabel, loadingLabel, isSubmitting }: { defaultLabel: string, loadingLabel: string, isSubmitting: boolean }) => (
    <Button
      type="submit"
      disabled={isSubmitting}
      variant="highlight"
      className="flex w-full items-center justify-center rounded-xl h-12 gap-1 text-base font-bold shadow-highlight-glow transition-all hover:shadow-soft-xl"
    >
      <span className="truncate">
        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : defaultLabel}
      </span>
      {!isSubmitting && <ArrowRight className="w-5 h-5" />}
    </Button>
  );

  return (
    <div className="min-h-screen flex flex-col items-center bg-background-light p-4">
      
      {/* Header de Navegação */}
      <header className="flex items-center bg-white p-4 pb-2 justify-between sticky top-0 z-20 shadow-soft-md w-full max-w-md absolute top-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(createPageUrl('welcome'))}
          className="text-primary hover:bg-primary/5"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h2 className="text-primary text-xl font-bold">Login</h2>
        <div className="w-10"></div>
      </header>

      <main className="flex-1 flex flex-col justify-center w-full max-w-md pt-20">
        {/* Bloco de Conteúdo Superior */}
        <div className="flex flex-col items-center justify-center pb-6 w-full max-w-sm mx-auto text-center">
          <div className="flex items-center justify-center size-16 bg-primary/10 rounded-xl mx-auto mb-4">
            <MapPin className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-primary tracking-tight text-3xl font-bold leading-tight">
            Acesso rápido
          </h1>
          <p className="text-text-secondary text-base mt-1">
            Seu acesso aos melhores pratos!
          </p>
        </div>

        {/* Card Principal */}
        <div className="bg-white rounded-2xl shadow-soft-xl p-6">
          
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
                    defaultButtonBackground: '#E47948', 
                    defaultButtonBackgroundHover: '#E47948CC', 
                    defaultButtonText: '#ffffff',
                    
                    // Inputs
                    inputBackground: '#ffffff',
                    inputBorder: '#e5e7eb',
                    inputBorderHover: '#E47948', 
                    inputBorderFocus: '#E47948', 
                    inputLabelText: '#022D68', 
                    inputText: '#1f2937',
                    
                    // Links (Esqueceu a senha, etc.)
                    anchorTextColor: '#E47948', // Usando Highlight para links
                    anchorTextHoverColor: '#022D68', 
                  },
                  radii: {
                    borderRadiusButton: '0.75rem', // rounded-xl
                    inputBorderRadius: '0.75rem', // rounded-xl
                  },
                },
              },
            }}
            theme="light"
            providers={['google', 'apple']} // Habilitando provedores sociais
            view={mode}
            redirectTo={window.location.origin + createPageUrl('auth')} 
            localization={{
              variables: {
                sign_in: {
                  email_label: 'E-mail',
                  password_label: 'Senha',
                  email_input_placeholder: 'E-mail',
                  password_input_placeholder: '••••••••',
                  button_label: 'Entrar',
                  loading_button_label: 'Entrando...',
                  link_text: 'Esqueceu sua senha?',
                  social_provider_text: 'ou continue com',
                  // sign_up_link_text removido
                },
                sign_up: {
                  email_label: 'E-mail',
                  password_label: 'Crie uma senha',
                  email_input_placeholder: 'E-mail',
                  password_input_placeholder: '••••••••',
                  button_label: 'Cadastrar-se',
                  loading_button_label: 'Cadastrando...',
                  link_text: 'Já tem uma conta? Entrar',
                  social_provider_text: 'ou continue com',
                },
                forgotten_password: {
                  link_text: 'Voltar para o login',
                  email_label: 'E-mail',
                  email_input_placeholder: 'E-mail',
                  button_label: 'Enviar instruções de recuperação',
                  loading_button_label: 'Enviando...',
                },
              },
            }}
          />
          
          {/* Links Legais no Rodapé do Card */}
          <div className="flex justify-center gap-6 pt-6 border-t border-gray-100 mt-6">
            <Link to={createPageUrl('legal')} className="text-gray-500 text-sm font-medium hover:underline">Termos</Link>
            <Link to={createPageUrl('legal')} className="text-gray-500 text-sm font-medium hover:underline">Privacidade (LGPD)</Link>
          </div>
        </div>
      </main>
    </div>
  );
}