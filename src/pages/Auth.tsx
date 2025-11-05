import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuthData } from '@/context/AuthContext';
import { Loader2, MapPin, ArrowLeft, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { createPageUrl } from '@/utils/url';
import { showError, showSuccess } from '@/utils/toast';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { motion } from "framer-motion";

export default function Auth() {
  const navigate = useNavigate();
  const { user, isLoading: isAuthLoading, refetchProfile } = useAuthData();
  const [mode, setMode] = useState<'sign_in' | 'sign_up'>('sign_in');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const togglePasswordVisibility = () => setPasswordVisible(!passwordVisible);

  // Redireciona se já estiver logado
  useEffect(() => {
    if (user) {
      navigate(createPageUrl('home'));
    }
  }, [user, navigate]);

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

  const handleAuth = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setLastError(null);

    try {
      if (mode === 'sign_in') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        showSuccess("Login realizado com sucesso!");
      } else { // sign_up
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        showSuccess("Conta criada! Verifique seu e-mail para confirmar e tente o login novamente.");
        setMode('sign_in'); // Após o cadastro, redireciona para o login
      }
    } catch (error) {
      const msg = (error as Error).message || "Ocorreu um erro. Tente novamente.";
      setLastError(msg);
      showError(msg);
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
          redirectTo: window.location.origin + createPageUrl('auth'),
        },
      });
      if (error) throw error;
    } catch (error) {
      const msg = (error as Error).message || "Ocorreu um erro ao fazer login com o provedor social.";
      setLastError(msg);
      showError(msg);
    } finally {
      setLoading(false);
    }
  };

  if (isAuthLoading || user) {
    return (
      <div className="flex justify-center items-center h-screen bg-background-light">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-x-hidden bg-background-light p-4 font-sans antialiased">

      {/* Header de Navegação (Apenas botão de voltar) */}
      <header className="flex items-center bg-white p-4 pb-2 justify-start sticky top-0 z-20 shadow-soft-md w-full max-w-md absolute top-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(createPageUrl('welcome'))}
          className="text-primary hover:bg-primary/5"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h2 className="text-primary text-xl font-bold ml-4">{mode === 'sign_in' ? 'Login' : 'Cadastro'}</h2>
      </header>

      <main className="flex-1 flex flex-col justify-center w-full max-w-sm pt-20">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full"
        >
          {/* Icon and Title (Padrão Consistente) */}
          <div className="flex flex-col items-center justify-center pb-6 w-full max-w-sm mx-auto text-center">
            <div className="flex items-center justify-center size-16 bg-primary/10 rounded-xl mx-auto mb-4">
              <MapPin className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-primary tracking-tight text-3xl font-bold leading-tight">
              {mode === 'sign_in' ? 'Acesso rápido' : 'Crie sua conta'}
            </h1>
            <p className="text-text-secondary text-base mt-1">
              {mode === 'sign_in' ? 'Seu acesso aos melhores pratos!' : 'Descubra os melhores restaurantes!'}
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
                  <img src="/assets/google-logo.svg" alt="Google" className="h-5 w-5" />
                  <span className="truncate">Continuar com Google</span>
                </Button>
                <Button
                  type="button"
                  onClick={() => handleSocialLogin('apple')}
                  variant="channel"
                  className="flex w-full items-center justify-center rounded-xl h-12 gap-2 text-base font-bold shadow-soft-sm"
                  disabled={loading}
                >
                  <img src="/assets/apple-logo.svg" alt="Apple" className="h-5 w-5" />
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
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (mode === 'sign_in' ? "Entrar" : "Cadastrar-se")}
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

      {/* Footer */}
      <footer className="w-full max-w-md mx-auto py-6">
        <div className="flex justify-center items-center gap-6">
          <Link to={createPageUrl('legal')} className="text-gray-500 text-sm font-medium hover:underline">Termos</Link>
          <Link to={createPageUrl('legal')} className="text-gray-500 text-sm font-medium hover:underline">Privacidade (LGPD)</Link>
        </div>
      </footer>
    </div>
  );
}