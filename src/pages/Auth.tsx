import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Eye, EyeOff } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

const GoogleIcon = ({ className }: { className?: string }) => (
  <svg className={className} role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <title>Google</title>
    <path d="M12.48 10.92v3.28h7.84c-.24 1.84-.85 3.18-1.73 4.1-1.02 1.08-2.56 2.17-4.8 2.17-5.78 0-10.47-4.88-10.47-10.92S6.7 1.48 12.48 1.48c3.24 0 5.42 1.38 6.68 2.54l2.84-2.78C19.59 1.18 16.44 0 12.48 0 5.6 0 0 5.58 0 12.42s5.6 12.42 12.48 12.42c7.2 0 12.12-4.92 12.12-12.72 0-.8-.08-1.52-.24-2.22h-11.88z" />
  </svg>
);

const AppleIcon = ({ className }: { className?: string }) => (
  <svg className={className} role="img" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
    <title>Apple</title>
    <path d="M12.15,2.56c-2.13,0-4.13,1.4-5.12,3.83-2.21,5.22,1.26,11.18,3.67,14.37,1.13,1.5,2.31,3.24,4.06,3.21,1.69-.03,2.61-1.05,4.06-3.21,2.41-3.19,5.88-9.15,3.67-14.37-1.13-2.73-3.53-4.22-5.88-4.22-2.7,0-4.6,1.78-5.88,1.78s-3.18-1.78-5.88-1.78c-2.35,0-4.75,1.49-5.88,4.22-2.21,5.22,1.26,11.18,3.67,14.37,1.13,1.5,2.31,3.24,4.06,3.21,1.69-.03,2.61-1.05,4.06-3.21,1.23-1.65,2.02-3.03,2.83-4.42-1.9-1.14-3.03-3.48-2.8-6.1.29-3.3,2.73-5.63,5.85-5.92-0.02-.05-0.04-.1-0.06-.15-2.13-3.35-5.85-4.34-7.95-2.48-0.02,0.02-0.04,0.04-0.06,0.06-1.98-1.34-4.22-1.38-5.88-1.38Z" />
  </svg>
);

const AuthPage = () => {
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);

  // Redirect if user is already logged in
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        navigate('/find-restaurants');
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleAuthAction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const authFunction = isSignUp ? supabase.auth.signUp : supabase.auth.signInWithPassword;
    
    const { error } = await authFunction({ email, password });

    if (error) {
      showError(error.message);
    } else if (isSignUp) {
      showSuccess('Cadastro realizado! Verifique seu e-mail para confirmar sua conta.');
      setIsSignUp(false); // Switch back to login view
    }
    // On successful login, the onAuthStateChange listener will handle the redirect.
    
    setLoading(false);
  };

  const handleOAuthLogin = async (provider: 'google' | 'apple') => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({ provider });
    if (error) {
      showError(error.message);
    }
    setLoading(false);
  };

  const togglePasswordVisibility = () => setPasswordVisible(!passwordVisible);

  return (
    <div className="bg-[#f5f7f8] font-sans antialiased flex min-h-screen w-full flex-col justify-center items-center p-4">
      <header className="flex flex-col items-center justify-center pt-16 pb-6 w-full max-w-sm">
        <div className="w-36 h-auto drop-shadow-md">
          <svg viewBox="125 -5 100 110" className="w-36 h-auto">
            <g transform="matrix(-1.022,0,0,1.022,227.94,-1.794)" fill="#022D68">
              <path d="M51.798,25.546c-5.767,0-10.458,4.692-10.458,10.459c0,4.981,3.971,14.129,10.458,14.129  c6.488,0,10.458-9.147,10.458-14.129C62.256,30.239,57.564,25.546,51.798,25.546z M51.798,44.633c-1.992,0-4.956-5.162-4.956-8.627  c0-2.732,2.224-4.957,4.956-4.957s4.957,2.225,4.957,4.957C56.755,39.471,53.79,44.633,51.798,44.633z"></path>
              <path d="M82.882,50.348c2.082-4.465,3.162-9.322,3.162-14.342c0-18.886-15.363-34.251-34.246-34.251  c-18.882,0-34.245,15.365-34.245,34.251c0,4.167,0.753,8.22,2.198,12.034c0.645,1.572,3.26,7.376,8.777,13.01  c0.22,0.206,0.422,0.43,0.646,0.628l19.662,20.885c0.03,0.033,3.075,3.029,5.928-0.001l3.655-3.883h10.836  c0.903,0.112,2.088,0.546,2.644,2.031c0.003,0.009,0.007,0.012,0.009,0.019l2.966,7.907H74.87c0,0,0.003,0.009,0.003,0.01  l0.219,0.568c0.317,1.13,0.398,3.528-4.688,3.528H31.886c-4.293,0-3.763-2.433-3.555-3.059l3.068-8.18  c0.057-0.113,0.114-0.233,0.173-0.392c0.676-1.76,1.363-2.29,1.834-2.434h2.09c3.04,0,0.711-2.465,0.711-2.465h0.002l-1.082-1.147  c0-0.003-0.002-0.003-0.003-0.004c-1.411-1.496-3.1-1.825-4.066-1.886h-0.963c-0.645,0.116-1.703,0.681-2.563,2.966l-6.275,16.733  c-0.009,0.03-1.386,5.368,7.131,5.368h46.542c0,0,8.987-1.14,6.504-7.775L76.254,76.66c0-0.005-0.004-0.01-0.004-0.015  c-1.331-3.548-5.043-3.469-5.043-3.469h-7.61L74.515,61.58l3.555-3.793C80.358,54.923,81.921,52.239,82.882,50.348z M54.487,74.825  c-0.003,0.003-0.004,0.003-0.007,0.009c-2.351,2.497-4.419,0.939-5.114,0.267l-0.242-0.257c-0.002-0.004-0.009-0.01-0.009-0.01  L33.089,57.81l-0.191-0.186c-1.336-1.168-2.575-2.473-3.68-3.882l-0.271-0.354c-3.854-5.062-5.89-11.07-5.89-17.38  c0-15.852,12.895-28.749,28.742-28.749c15.85,0,28.742,12.896,28.742,28.749c0,6.31-2.035,12.32-5.891,17.38L54.487,74.825z"></path>
            </g>
          </svg>
        </div>
      </header>

      <main className="flex-1 flex flex-col justify-center w-full max-w-sm">
        <Card className="w-full shadow-xl border-none rounded-xl">
          <CardHeader className="text-center">
            <CardTitle className="text-[#022D68] tracking-tight text-4xl font-extrabold leading-tight">
              {isSignUp ? 'Crie sua conta' : 'Acesse rápido'}
            </CardTitle>
            <CardDescription className="text-gray-600 text-lg font-medium leading-normal pt-2">
              {isSignUp ? 'Junte-se a nós!' : 'Seu acesso aos melhores pratos!'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAuthAction} className="space-y-4">
              <div className="relative">
                <Input 
                  className="w-full rounded-lg text-gray-800 focus:outline-none focus:ring-4 focus:ring-[#E47948]/50 border-2 border-gray-200 bg-white h-14 placeholder:text-gray-400 p-4 text-base font-normal" 
                  placeholder="E-mail" 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
              </div>
              
              <div className="relative">
                <Input 
                  className="w-full rounded-lg text-gray-800 focus:outline-none focus:ring-4 focus:ring-[#E47948]/50 border-2 border-gray-200 bg-white h-14 placeholder:text-gray-400 p-4 text-base font-normal pr-12" 
                  placeholder="Senha" 
                  type={passwordVisible ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                />
                <button 
                  type="button" 
                  className="text-gray-500 absolute inset-y-0 right-0 flex items-center justify-center pr-4 hover:text-[#E47948] transition-colors" 
                  onClick={togglePasswordVisibility}
                >
                  {passwordVisible ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
              
              <div className="pt-2 space-y-4">
                <Button 
                  type="submit"
                  disabled={loading}
                  className="w-full bg-[#E47948] text-white font-bold py-3.5 h-auto rounded-lg shadow-lg shadow-[#E47948]/50 hover:bg-[#E47948]/90 transition-colors text-lg"
                >
                  {loading ? 'Aguarde...' : (isSignUp ? 'Cadastrar' : 'Entrar')}
                </Button>
              </div>
            </form>

            <div className="flex flex-col gap-3 pt-6">
              <div className="relative flex items-center justify-center">
                <div className="absolute w-full border-t border-gray-300"></div>
                <span className="bg-white px-3 text-sm text-gray-500 z-10">ou</span>
              </div>
              
              <Button type="button" onClick={() => handleOAuthLogin('google')} variant="outline" className="w-full h-auto py-3.5 text-base font-semibold shadow-sm" disabled={loading}>
                <GoogleIcon className="w-5 h-5 mr-2" />
                Continuar com Google
              </Button>
              <Button type="button" onClick={() => handleOAuthLogin('apple')} variant="outline" className="w-full h-auto py-3.5 text-base font-semibold shadow-sm" disabled={loading}>
                <AppleIcon className="w-5 h-5 mr-2" />
                Continuar com Apple
              </Button>
            </div>
            
            <p className="pt-6 text-center text-base text-gray-600">
              {isSignUp ? 'Já tem uma conta?' : 'Ainda não tem conta?'}
              <button 
                type="button"
                onClick={() => setIsSignUp(!isSignUp)}
                className="font-bold text-[#E47948] hover:underline ml-1"
              >
                {isSignUp ? 'Fazer login' : 'Cadastrar-se'}
              </button>
            </p>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AuthPage;