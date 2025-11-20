import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../integrations/supabase/client';
import { MapPin, ArrowLeft, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Separator } from '../components/ui/separator';
import { Card, CardContent } from '../components/ui/card';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast'; // Assuming react-hot-toast is installed
import { createPageUrl } from '@/utils/url';

function RestaurantLogin() {
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
        navigate(createPageUrl('restaurant-area/home'));
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
          redirectTo: window.location.origin + createPageUrl('restaurant-area/home'),
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
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-x-hidden bg-background-light p-4 font-sans antialiased">
      <header className="flex items-center bg-white p-4 pb-2 justify-start sticky top-0 z-20 shadow-soft-md w-full max-w-md absolute top-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(createPageUrl('welcome'))}
          className="text-primary hover:bg-primary/5"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h2 className="text-primary text-xl font-bold ml-4">{mode === 'sign_in' ? 'Login do Restaurante' : 'Cadastro do Restaurante'}</h2>
      </header>

      <main className="flex-1 flex flex-col justify-center w-full max-w-sm pt-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full"
        >
          <div className="flex flex-col items-center justify-center pb-6 w-full max-w-sm mx-auto text-center">
            <div className="flex items-center justify-center size-16 bg-primary/10 rounded-xl mx-auto mb-4">
              <MapPin className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-primary tracking-tight text-3xl font-bold leading-tight">
              {mode === 'sign_in' ? 'Acesso rápido' : 'Crie sua conta'}
            </h1>
            <p className="text-text-secondary text-base mt-1">
              Gerencie seu restaurante!
            </p>
          </div>

          <Card className="w-full shadow-soft-xl border-none rounded-2xl">
            <CardContent className="p-6 pt-4">
              <form onSubmit={handleAuth} className="space-y-4">
                <Button
                  type="button"
                  onClick={() => handleSocialLogin('google')}
                  variant="channel"
                  className="flex w-full items-center justify-center rounded-xl h-12 gap-2 text-base font-bold shadow-soft-sm"
                  disabled={loading}
                >
                  <div className="h-5 w-5 flex items-center justify-center">
                    <svg version="1.1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" xmlnsXlink="http://www.w3.org/1999/xlink" style={{ display: 'block' }}>
                      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                      <path fill="none" d="M0 0h48v48H0z"></path>
                    </svg>
                  </div>
                  <span className="truncate">Continuar com Google</span>
                </Button>
                <Button
                  type="button"
                  onClick={() => handleSocialLogin('apple')}
                  variant="channel"
                  className="flex w-full items-center justify-center rounded-xl h-12 gap-2 text-base font-bold shadow-soft-sm"
                  disabled={loading}
                >
                  <div className="h-7 w-7 flex items-center justify-center">
                    <svg height="225" width="225" viewBox="0 0 225 225">
                      {/* top leaf */}
                      <path fill="#000" d="m108,35
                            c5.587379,-6.7633 9.348007,-16.178439 8.322067,-25.546439
                            c-8.053787,0.32369 -17.792625,5.36682 -23.569427,12.126399
                            c-5.177124,5.985922 -9.711121,15.566772 -8.48777,24.749359
                            c8.976891,0.69453 18.147476,-4.561718 23.73513,-11.329308" />
                      
                      {/* apple left half */}
                      <path fill="#000" d="M88,162.415214
                            c-12.24469,0 -16.072174,6.151901 -26.213551,6.550446
                            c-10.52422,0.398254 -18.538303,-10.539917 -25.26247,-20.251053
                            c-13.740021,-19.864456 -24.24024,-56.132286 -10.1411,-80.613663
                            c7.004152,-12.157551 19.521101,-19.85622 33.10713,-20.053638
                            c10.334515,-0.197132 20.089069,6.952717 26.406689,6.952717" />
                      
                      {/* apple right half */}
                      <path fill="#000" d="M85,55
                            c6.313614,0 18.167473,-8.59832 30.628998,-7.335548
                            c5.21682,0.217129 19.860519,2.1073 29.263641,15.871029
                            c-0.75766,0.469692 -17.472931,10.200527 -17.291229,30.443592
                            c0.224838,24.213104 21.241287,32.270615 21.474121,32.373459
                            c-0.177704,0.56826 -3.358078,11.482742 -11.072464,22.756622
                            c-6.668747,9.746841 -13.590027,19.457977 -24.493088,19.659103
                            c-10.713348,0.197403 -14.158287,-6.353043 -26.406677,-6.353043" />
                    </svg>
                  </div>
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
                  className="h-14 text-base rounded-xl border-gray-200 focus:border-highlight focus:ring-highlight shadow-soft-sm"
                  placeholder="E-mail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                />
                <div className="relative">
                  <Input
                    className="h-14 text-base pr-12 rounded-xl border-gray-200 focus:border-highlight focus:ring-highlight shadow-soft-sm"
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
                  className="flex w-full items-center justify-center rounded-xl h-12 gap-1 text-base font-bold shadow-highlight-glow transition-all hover:shadow-soft-xl"
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
                  onClick={() => {
                    if (mode === 'sign_in') {
                      navigate(createPageUrl('restaurant-signup'));
                    } else {
                      setMode('sign_in');
                    }
                  }}
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
  );
}

export default RestaurantLogin;