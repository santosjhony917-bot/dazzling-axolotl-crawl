import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import { useAuthData } from '@/context/AuthContext';
import { MapPin, ArrowLeft, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { GoogleIcon } from '@/components/icons/GoogleIcon';
import { AppleIcon } from '@/components/icons/AppleIcon';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Separator } from '../components/ui/separator';
import { Card, CardContent } from '../components/ui/card';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast'; // Assuming react-hot-toast is installed
import { createPageUrl } from '@/utils/url';
import Header from '@/components/Header';

function RestaurantLogin() {
  const { signInWithMock } = useAuthData();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState<'sign_in' | 'sign_up'>('sign_in');
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const navigate = useNavigate();

  const togglePasswordVisibility = () => setPasswordVisible(!passwordVisible);

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        navigate(createPageUrl('home'));
      }
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setLastError(null);

    const cleanEmail = email.toLowerCase().trim();
    if (
      cleanEmail.includes('premium') ||
      cleanEmail.includes('free') ||
      cleanEmail.includes('admin') ||
      cleanEmail.includes('cliente') ||
      cleanEmail.includes('customer') ||
      cleanEmail.includes('user')
    ) {
      if (signInWithMock) {
        const success = signInWithMock(cleanEmail);
        if (success) {
          toast.success('Login/Cadastro de teste realizado com sucesso!');
          setLoading(false);
          if (cleanEmail.includes('admin')) {
            navigate(createPageUrl('adminDashboard'));
          } else {
            navigate(createPageUrl('home'));
          }
          return;
        }
      }
    }

    try {
      if (mode === 'sign_in') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        toast.success('Login realizado com sucesso!');
      } else {
        navigate(createPageUrl('restaurant-signup'));
        toast.success("Redirecionando para o cadastro de restaurante...");
      }
    } catch (error) {
      const msg = (error as Error).message || "Ocorreu um erro. Tente novamente.";
      setLastError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleSocialLogin = async (provider: 'google' | 'apple') => {
    setLoading(true);
    setLastError(null);
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider,
        options: {
          redirectTo: window.location.origin + createPageUrl('home'),
        },
      });
      if (error) throw error;
    } catch (error) {
      const msg = (error as Error).message || "Ocorreu um erro ao fazer login com o provedor social.";
      setLastError(msg);
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f1f5f9] w-full flex flex-col">
      <div className="min-h-screen bg-background-light flex flex-col w-full max-w-md mx-auto border-x border-slate-200/60">
      
      {/* Unified Header */}
      <Header 
        title={mode === 'sign_in' ? 'Login do Restaurante' : 'Cadastro do Restaurante'} 
        leftAction={{ icon: ArrowLeft, onClick: () => navigate(createPageUrl('welcome')) }}
      />

      <main className="flex-grow flex flex-col justify-center w-full px-4 py-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full"
        >
          <div className="flex flex-col items-center justify-center pb-6 w-full max-w-sm mx-auto text-center">
            <div className="flex items-center justify-center size-16 bg-primary/10 rounded-2xl mx-auto mb-4">
              <MapPin className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-primary tracking-tight text-3xl font-bold leading-tight">
              {mode === 'sign_in' ? 'Acesso rápido' : 'Crie sua conta'}
            </h1>
            <p className="text-text-secondary text-base mt-1">
              Gerencie seu restaurante!
            </p>
          </div>

          <Card className="w-full shadow-soft border border-slate-100/80 rounded-2xl bg-white">
            <CardContent className="p-6 pt-4">
              <form onSubmit={handleAuth} className="space-y-4">
                <Button
                  type="button"
                  onClick={() => handleSocialLogin('google')}
                  variant="channel"
                  className="flex w-full items-center justify-center rounded-2xl h-12 gap-2 text-base font-bold shadow-soft"
                  disabled={loading}
                >
                  <GoogleIcon className="h-5 w-5 shrink-0" />
                  <span className="truncate">Continuar com Google</span>
                </Button>
                <Button
                  type="button"
                  onClick={() => handleSocialLogin('apple')}
                  variant="channel"
                  className="flex w-full items-center justify-center rounded-2xl h-12 gap-2 text-base font-bold shadow-soft"
                  disabled={loading}
                >
                  <AppleIcon className="h-6 w-6 text-black dark:text-white shrink-0" />
                  <span className="truncate">Continuar com Apple</span>
                </Button>

                <div className="relative flex items-center justify-center py-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase">
                    <span className="bg-white px-2 text-gray-500">
                      ou
                    </span>
                  </div>
                </div>

                <Input
                  className="h-14 text-base rounded-2xl border-gray-200 focus:border-highlight focus:ring-highlight shadow-none"
                  placeholder="E-mail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                />
                <div className="relative">
                  <Input
                    className="h-14 text-base pr-12 rounded-2xl border-gray-200 focus:border-highlight focus:ring-highlight shadow-none"
                    placeholder={mode === 'sign_in' ? 'Senha' : 'Crie uma senha'}
                    type={passwordVisible ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    required
                  />
                  <button
                    onClick={togglePasswordVisibility}
                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-500 hover:text-primary transition-colors"
                    type="button"
                  >
                    {passwordVisible ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>

                {mode === 'sign_in' && (
                  <div className="flex justify-end">
                    <Link
                      to={createPageUrl('forgotPassword')}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      Esqueceu sua senha?
                    </Link>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  variant="highlight"
                  className="flex w-full items-center justify-center rounded-2xl h-12 gap-1 text-base font-bold shadow-none transition-all hover:shadow-none"
                >
                  <span className="truncate">
                    {loading ? <MapPin className="mr-2 h-4 w-4 animate-spin" /> : (mode === 'sign_in' ? "Entrar" : "Cadastrar-se")}
                  </span>
                  {!loading && <ArrowRight className="w-5 h-5" />}
                </Button>
              </form>

              {lastError && (
                <p className="pt-4 text-center text-sm text-red-500">
                  {lastError}
                </p>
              )}

              <p className="pt-6 text-center text-base text-gray-600">
                {mode === 'sign_in' ? "Não tem uma conta?" : "Já tem uma conta?"}
                <button
                  onClick={() => setMode(mode === 'sign_in' ? 'sign_up' : 'sign_in')}
                  className="font-bold text-highlight hover:underline ml-1"
                  disabled={loading}
                >
                  {mode === 'sign_in' ? 'Crie uma agora' : 'Entrar'}
                </button>
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </main>

      <footer className="w-full max-w-md mx-auto py-6">
        <div className="flex justify-center items-center gap-6">
          <Link to={createPageUrl('legal')} className="text-gray-500 text-sm font-medium hover:underline">Termos</Link>
          <Link to={createPageUrl('legal')} className="text-gray-500 text-sm font-medium hover:underline">Privacidade (LGPD)</Link>
        </div>
      </footer>
      </div>
    </div>
  );
}

export default RestaurantLogin;