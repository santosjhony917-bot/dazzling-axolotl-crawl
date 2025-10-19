import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';

const AuthPage = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate('/find-restaurants');
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 p-4">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-2xl shadow-lg">
         <header className="text-center">
            <h1 className="text-3xl font-bold text-gray-900">Bem-vindo!</h1>
            <p className="text-gray-600 mt-2">Faça login ou crie sua conta para continuar</p>
        </header>
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          providers={['google', 'apple']}
          theme="light"
          localization={{
            variables: {
              sign_in: {
                email_label: 'Endereço de e-mail',
                password_label: 'Sua senha',
                email_input_placeholder: 'Seu endereço de e-mail',
                password_input_placeholder: 'Sua senha',
                button_label: 'Entrar',
                social_provider_text: 'Entrar com {{provider}}',
                link_text: 'Já tem uma conta? Entre',
              },
              sign_up: {
                email_label: 'Endereço de e-mail',
                password_label: 'Crie uma senha',
                email_input_placeholder: 'Seu endereço de e-mail',
                password_input_placeholder: 'Crie uma senha',
                button_label: 'Criar conta',
                social_provider_text: 'Entrar com {{provider}}',
                link_text: 'Não tem uma conta? Crie uma',
              },
              forgotten_password: {
                email_label: 'Endereço de e-mail',
                password_label: 'Sua senha',
                email_input_placeholder: 'Seu endereço de e-mail',
                button_label: 'Enviar instruções',
                link_text: 'Esqueceu sua senha?',
              },
            },
          }}
        />
      </div>
    </div>
  );
};

export default AuthPage;