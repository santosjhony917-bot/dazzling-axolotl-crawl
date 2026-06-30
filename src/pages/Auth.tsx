import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuthData } from '@/context/AuthContext';
import { Loader2, Search, ArrowLeft, ArrowRight, Eye, EyeOff } from 'lucide-react';
import { GoogleIcon } from '@/components/icons/GoogleIcon';
import { AppleIcon } from '@/components/icons/AppleIcon';
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
import Header from '@/components/Header';
import PhoneShell from '@/components/layout/PhoneShell';

const customerBenefits = ['Preço', 'Bairro', 'Favoritos'];

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, isLoading: isAuthLoading, refetchProfile, signInWithMock } = useAuthData();
  const [mode, setMode] = useState<'sign_in' | 'sign_up'>('sign_in');
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);

  const redirectFrom = (location.state as { from?: { pathname?: string; search?: string; hash?: string } } | null)?.from;
  const redirectTo = redirectFrom?.pathname
    ? `${redirectFrom.pathname}${redirectFrom.search ?? ''}${redirectFrom.hash ?? ''}`
    : createPageUrl('home');

  const togglePasswordVisibility = () => setPasswordVisible(!passwordVisible);

  // Redireciona se já estiver logado
  useEffect(() => {
    if (user) {
      navigate(redirectTo, { replace: true });
    }
  }, [user, navigate, redirectTo]);

  // Lida com a mudança de estado de autenticação (para erros e sucesso)
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, currentSession) => {
      if (event === 'SIGNED_IN' || event === 'USER_UPDATED') {
        refetchProfile();
        navigate(redirectTo, { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, refetchProfile, redirectTo]);

  const handleAuth = async (e: React.FormEvent<HTMLFormElement>) => {
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
          showSuccess("Login/Cadastro de teste realizado com sucesso!");
          setLoading(false);
          if (cleanEmail.includes('admin')) {
            navigate(createPageUrl('adminDashboard'));
          } else {
            navigate(redirectTo, { replace: true });
          }
          return;
        }
      }
    }

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
          redirectTo: `${window.location.origin}${createPageUrl('auth')}`,
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
    <PhoneShell shellClassName="flex flex-col bg-[#FAFAFA]">

      {/* Unified Header */}
      <Header 
        title={
          <span className="text-lg font-semibold tracking-tight text-[#3C2F2F]">
            {mode === 'sign_in' ? 'Entrar no FilterFood' : 'Criar conta'}
          </span>
        } 
        leftAction={{ icon: ArrowLeft, onClick: () => navigate(createPageUrl('welcome')) }}
        sticky={false}
      />

      <main className="flex-grow flex flex-col justify-center w-full px-4 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full"
        >
          {/* Icon and Title (Padrão Consistente) */}
          <div className="flex flex-col items-center justify-center pb-7 w-full max-w-sm mx-auto text-center">
            <div className="flex items-center justify-center size-12 bg-white rounded-2xl mx-auto mb-3 border border-slate-100 shadow-sm">
              <Search className="w-6 h-6 text-primary" />
            </div>
            <h1 className="text-[#3C2F2F] tracking-tight text-[22px] font-semibold leading-tight">
              {mode === 'sign_in' ? 'Continue sua busca' : 'Crie sua conta'}
            </h1>
            <p className="text-text-secondary text-sm mt-2 leading-relaxed max-w-[320px]">
              {mode === 'sign_in' ? 'Salve favoritos, compare pratos e encontre opções perto de você.' : 'Descubra pratos por preço, bairro e cardápio real.'}
            </p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              {customerBenefits.map((benefit) => (
                <span
                  key={benefit}
                  className="rounded-full bg-highlight/8 px-3 py-1 text-[11px] font-semibold text-highlight"
                >
                  {benefit}
                </span>
              ))}
            </div>
          </div>

          <Card className="w-full rounded-[24px] border border-slate-100/80 bg-white shadow-soft">
            <CardContent className="p-5">
              <form onSubmit={handleAuth} className="space-y-4">
                <Button
                  type="button"
                  onClick={() => handleSocialLogin('google')}
                  variant="channel"
                  className="flex w-full items-center justify-center rounded-2xl h-11 gap-2 text-[15px] font-semibold shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight focus-visible:ring-offset-2"
                  disabled={loading}
                >
                  <GoogleIcon className="h-5 w-5 shrink-0" />
                  <span className="truncate">Continuar com Google</span>
                </Button>
                <Button
                  type="button"
                  onClick={() => handleSocialLogin('apple')}
                  variant="channel"
                  className="flex w-full items-center justify-center rounded-2xl h-11 gap-2 text-[15px] font-semibold shadow-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight focus-visible:ring-offset-2"
                  disabled={loading}
                >
                  <AppleIcon className="h-6 w-6 text-black dark:text-white shrink-0" />
                  <span className="truncate">Continuar com Apple</span>
                </Button>

                <div className="relative flex items-center justify-center py-4">
                  <div className="absolute inset-0 flex items-center">
                    <span className="w-full border-t border-gray-200" />
                  </div>
                  <div className="relative flex justify-center text-xs uppercase" aria-hidden="true">
                    <span className="bg-white px-2 text-gray-500">
                      ou
                    </span>
                  </div>
                </div>

                <Input
                  className="h-12 text-[15px] rounded-2xl border-slate-200/80 focus:border-highlight focus:ring-highlight shadow-none"
                  placeholder="E-mail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                />
                <div className="relative">
                  <Input
                    className="h-12 text-[15px] pr-12 rounded-2xl border-slate-200/80 focus:border-highlight focus:ring-highlight shadow-none"
                    placeholder={mode === 'sign_in' ? 'Senha' : 'Crie uma senha'}
                    type={passwordVisible ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    required
                  />
                  <button
                    onClick={togglePasswordVisibility}
                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-500 hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight focus-visible:ring-offset-2 rounded-2xl"
                    type="button"
                    aria-label={passwordVisible ? 'Ocultar senha' : 'Mostrar senha'}
                  >
                    {passwordVisible ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>

                {mode === 'sign_in' && (
                  <div className="flex justify-end">
                    <Link
                      to={createPageUrl('forgotPassword')}
                      className="text-sm font-medium text-primary hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight focus-visible:ring-offset-2 rounded"
                    >
                      Esqueceu sua senha?
                    </Link>
                  </div>
                )}

                <Button
                  type="submit"
                  disabled={loading}
                  variant="highlight"
                  className="flex w-full items-center justify-center rounded-2xl h-11 gap-1 text-[15px] font-semibold shadow-none transition-all hover:shadow-[0_8px_18px_rgba(223,75,28,0.14)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight focus-visible:ring-offset-2"
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

              <p className="pt-6 text-center text-sm text-slate-600">
                {mode === 'sign_in' ? "Não tem uma conta?" : "Já tem uma conta?"}
                <button
                  onClick={() => setMode(mode === 'sign_in' ? 'sign_up' : 'sign_in')}
                  className="font-semibold text-highlight hover:underline ml-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight focus-visible:ring-offset-2 rounded"
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
      <footer className="w-full max-w-md mx-auto px-4 py-5">
        <nav className="flex justify-center items-center gap-6" aria-label="Links legais">
          <Link to={createPageUrl('legal')} className="text-gray-500 text-sm font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight focus-visible:ring-offset-2 rounded">Termos</Link>
          <Link to={createPageUrl('legal')} className="text-gray-500 text-sm font-medium hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight focus-visible:ring-offset-2 rounded">Privacidade (LGPD)</Link>
        </nav>
      </footer>
    </PhoneShell>
  );
}
