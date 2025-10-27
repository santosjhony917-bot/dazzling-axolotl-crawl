import React, { useState, useEffect } from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/context/AuthContext';
import { showSuccess } from '@/utils/toast';

const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const { session, isLoading: isAuthLoading, refetchProfile } = useAuthContext();
  const [mode, setMode] = useState<'sign_in' | 'sign_up'>('sign_in');

  useEffect(() => {
    if (session) {
      // Se o usuário estiver logado, garante que o perfil seja carregado e redireciona
      refetchProfile().then(() => {
        showSuccess('Login realizado com sucesso!');
        navigate('/');
      });
    }
  }, [session, navigate, refetchProfile]);

  if (isAuthLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p>Carregando...</p>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md shadow-lg dark:bg-gray-800">
        <CardHeader>
          <CardTitle className="text-2xl text-center dark:text-white">
            {mode === 'sign_in' ? 'Entrar' : 'Criar Conta'}
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Auth
            supabaseClient={supabase}
            providers={[]}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: 'hsl(var(--primary))',
                    brandAccent: 'hsl(var(--primary-foreground))',
                  },
                },
              },
            }}
            theme="light"
            view={mode}
            // Redirecionamento manual após o login/signup é tratado pelo useEffect
          />
          <div className="mt-4 text-center">
            <button
              onClick={() => setMode(mode === 'sign_in' ? 'sign_up' : 'sign_in')}
              className="text-sm text-primary hover:underline dark:text-highlight"
            >
              {mode === 'sign_in' ? 'Não tem uma conta? Cadastre-se' : 'Já tem uma conta? Faça login'}
            </button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthPage;