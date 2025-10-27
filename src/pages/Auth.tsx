import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Auth as SupabaseAuth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { createPageUrl } from '@/utils/url';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { motion } from 'framer-motion';

export default function AuthPage() {
  const navigate = useNavigate();
  const routerLocation = useLocation(); 
  
  const params = new URLSearchParams(routerLocation.search);
  // Mapeia 'signup' para 'sign_up' e 'login' para 'sign_in'
  const mode = params.get('mode') === 'signup' ? 'sign_up' : 'sign_in';

  const handleBack = () => {
    navigate(createPageUrl('welcome'));
  };
  
  // Redireciona após a autenticação ser bem-sucedida
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN' || event === 'INITIAL_SESSION') {
        if (session) {
          // Redireciona para a home do cliente
          navigate(createPageUrl('home'), { replace: true });
        }
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="w-full max-w-md"
      >
        {/* Botão Voltar */}
        <Button 
          variant="ghost" 
          onClick={handleBack} 
          className="text-primary hover:bg-gray-100 mb-6"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Voltar
        </Button>
        
        {/* Card Principal */}
        <div className="bg-white rounded-2xl shadow-soft-xl p-6">
          <div className="text-center mb-6">
            <h1 className="text-primary tracking-tight text-3xl font-bold leading-tight">
              {mode === 'sign_in' ? 'Acesse sua conta' : 'Crie sua conta'}
            </h1>
            <p className="text-text-secondary text-base mt-1">
              {mode === 'sign_in' ? 'Bem-vindo de volta!' : 'Comece a explorar restaurantes.'}
            </p>
          </div>
          
          <SupabaseAuth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    // Usando as cores do tema Tailwind
                    brand: '#E47948', // highlight
                    brandAccent: '#D46938', 
                    defaultButtonBackground: '#f3f4f6', // bg-gray-100
                    defaultButtonBackgroundHover: '#e5e7eb', // bg-gray-200
                    defaultButtonBorder: '#d1d5db', // border-gray-300
                    inputBackground: '#ffffff',
                    inputBorder: '#d1d5db',
                    inputBorderHover: '#9ca3af',
                    inputBorderFocus: '#E47948',
                    inputLabelText: '#022D68', // primary
                    inputText: '#1f2937',
                  },
                  radii: {
                    borderRadiusButton: '0.75rem', // rounded-xl
                    buttonBorderRadius: '0.75rem',
                    inputBorderRadius: '0.75rem',
                  },
                },
              },
            }}
            // Incluindo Google e Apple
            providers={['google', 'apple']} 
            theme="light"
            view={mode} 
            redirectTo={window.location.origin + createPageUrl('home')}
            localization={{
              variables: {
                sign_in: {
                  email_label: 'Email',
                  password_label: 'Senha',
                  button_label: 'Entrar',
                  social_provider_text: 'Continuar com {{provider}}',
                  link_text: 'Não tem uma conta? Cadastrar',
                },
                sign_up: {
                  email_label: 'Email',
                  password_label: 'Crie uma senha',
                  button_label: 'Cadastrar',
                  social_provider_text: 'Continuar com {{provider}}',
                  link_text: 'Já tem uma conta? Entrar',
                },
                forgotten_password: {
                  link_text: 'Esqueceu sua senha?',
                },
              },
            }}
          />
          
          {/* Link para a área do restaurante */}
          <div className="text-center pt-4">
            <Button
              variant="link"
              onClick={() => navigate(createPageUrl('restaurant-area-hub'))}
              className="text-sm text-primary hover:underline"
            >
              Acesso para Restaurantes
            </Button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}