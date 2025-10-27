import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { Auth as SupabaseAuth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { createPageUrl } from '@/utils/url';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, ArrowLeft } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import { useAuthContext } from '@/context/AuthContext';

// Componente de Login/Cadastro customizado
const CustomAuthForm: React.FC<{ type: 'login' | 'signup' }> = ({ type }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState(''); // CORRIGIDO: Inicializado como string vazia
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const isLogin = type === 'login';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      let response;
      
      if (isLogin) {
        response = await supabase.auth.signInWithPassword({ email, password });
      } else {
        response = await supabase.auth.signUp({ email, password });
      }

      if (response.error) {
        showError(response.error.message);
        return;
      }

      if (isLogin) {
        showSuccess('Login realizado com sucesso!');
        // Redireciona para a página inicial do cliente após o login
        navigate(createPageUrl('home'), { replace: true });
      } else {
        showSuccess('Cadastro realizado! Verifique seu email para confirmar sua conta.');
        // Após o cadastro, redireciona para a tela de login (auth?mode=login)
        navigate(createPageUrl('auth', undefined, { mode: 'login' }), { replace: true });
      }
      
      // O contexto de autenticação é atualizado automaticamente pelo onAuthStateChange

    } catch (error) {
      console.error('Auth error:', error);
      showError('Ocorreu um erro durante a autenticação.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className="w-full max-w-md mx-auto shadow-xl border-none">
      <CardHeader>
        <CardTitle className="text-2xl text-primary">{isLogin ? 'Entrar' : 'Criar Conta'}</CardTitle>
        <CardDescription>
          {isLogin ? 'Use seu email e senha para acessar sua conta.' : 'Crie sua conta em segundos.'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="seu@email.com"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Senha</Label>
            <Input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          
          <Button
            type="submit"
            disabled={loading}
            variant="highlight"
            className="w-full"
          >
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              isLogin ? 'Entrar' : 'Cadastrar'
            )}
          </Button>
          
          <div className="text-center pt-2">
            <Button 
              variant="link" 
              type="button"
              onClick={() => navigate(isLogin ? createPageUrl('auth', undefined, { mode: 'signup' }) : createPageUrl('auth', undefined, { mode: 'login' }))}
              className="text-sm text-highlight"
            >
              {isLogin ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Faça login'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

// Página principal de autenticação
export default function AuthPage() {
  const navigate = useNavigate();
  const routerLocation = useLocation(); 
  
  const params = new URLSearchParams(routerLocation.search);
  const mode = params.get('mode') === 'signup' ? 'signup' : 'login';

  const handleBack = () => {
    navigate(createPageUrl('welcome'));
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md mb-6">
        <Button 
          variant="ghost" 
          onClick={handleBack} 
          className="text-primary hover:bg-gray-100"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Voltar
        </Button>
      </div>
      
      <CustomAuthForm type={mode} />
      
      <div className="mt-8 w-full max-w-md">
        <p className="text-center text-sm text-gray-500 mb-4">Ou continue com</p>
        <div className="p-4 border rounded-lg bg-white shadow-sm">
          <SupabaseAuth
            supabaseClient={supabase}
            appearance={{
              theme: ThemeSupa,
              variables: {
                default: {
                  colors: {
                    brand: '#E47948', // Cor principal (highlight)
                    brandAccent: '#D46938', // Cor de destaque
                    defaultButtonBackground: '#f3f4f6', // bg-gray-100
                    defaultButtonBackgroundHover: '#e5e7eb', // bg-gray-200
                    defaultButtonBorder: '#d1d5db', // border-gray-300
                    inputBackground: '#ffffff',
                    inputBorder: '#d1d5db',
                    inputBorderHover: '#9ca3af',
                    inputBorderFocus: '#E47948',
                    inputLabelText: '#1f2937', // text-gray-800
                    inputText: '#1f2937',
                  },
                  radii: {
                    borderRadiusButton: '0.5rem', // rounded-lg
                    buttonBorderRadius: '0.5rem',
                    inputBorderRadius: '0.5rem',
                  },
                },
              },
            }}
            providers={['google']}
            theme="light"
            redirectTo={window.location.origin + createPageUrl('home')} // Redirecionamento após auth de terceiros
            onlyThirdPartyProviders={true}
          />
        </div>
      </div>
    </div>
  );
}