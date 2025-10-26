import React from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { useSearchParams } from 'react-router-dom';
import { createPageUrl } from '@/utils/url';

const AuthPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') === 'register' ? 'sign_up' : 'sign_in';

  return (
    <div className="flex items-center justify-center min-h-screen bg-[#f5f7f8] p-4">
      <div className="w-full max-w-sm bg-white p-6 rounded-xl shadow-lg">
        <h1 className="text-2xl font-bold text-center text-[#022D68] mb-6">Bem-vindo ao Filter Food</h1>
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          theme="light"
          view={initialTab}
          providers={['google']}
          redirectTo={window.location.origin + createPageUrl('home')}
          localization={{
            variables: {
              sign_in: {
                email_label: 'Seu e-mail',
                password_label: 'Sua senha',
                button_label: 'Entrar',
                social_provider_text: 'Ou entre com',
                link_text: 'Já tem uma conta? Entre',
              },
              sign_up: {
                email_label: 'Seu e-mail',
                password_label: 'Crie uma senha',
                button_label: 'Cadastrar',
                social_provider_text: 'Ou cadastre-se com',
                link_text: 'Não tem uma conta? Cadastre-se',
              },
              forgotten_password: {
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