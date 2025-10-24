import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Eye, EyeOff, ArrowRight, MapPin, Loader2 } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { motion } from 'framer-motion';
import { createPageUrl } from '@/utils/url';
import { useAuth } from '@/context/AuthContext'; // Importa o hook useAuth

const GoogleIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M44.5 20H24V28.5H35.5C34.5 32.5 31.5 35.5 24 35.5C18.5 35.5 14 31 14 24C14 17 18.5 12.5 24 12.5C27.5 12.5 30 14 32 16L38 10C34 6 29 4 24 4C13 4 4 13 4 24C4 35 13 44 24 44C35 44 44 35 44 24C44 22 44.5 21 44.5 20Z" fill="#FFC107" />
    <path d="M44.5 20H24V28.5H35.5C34.5 32.5 31.5 35.5 24 35.5C18.5 35.5 14 31 14 24C14 17 18.5 12.5 24 12.5C27.5 12.5 30 14 32 16L38 10C34 6 29 4 24 4C13 4 4 13 4 24C4 35 13 44 24 44C35 44 44 35 44 24C44 22 44.5 21 44.5 20Z" fill="#FF3D00" />
    <path d="M44.5 20H24V28.5H35.5C34.5 32.5 31.5 35.5 24 35.5C18.5 35.5 14 31 14 24C14 17 18.5 12.5 24 12.5C27.5 12.5 30 14 32 16L38 10C34 6 29 4 24 4C13 4 4 13 4 24C4 35 13 44 24 44C35 44 44 35 44 24C44 22 44.5 21 44.5 20Z" fill="#4CAF50" />
    <path d="M44.5 20H24V28.5H35.5C34.5 32.5 31.5 35.5 24 35.5C18.5 35.5 14 31 14 24C14 17 18.5 12.5 24 12.5C27.5 12.5 30 14 32 16L38 10C34 6 29 4 24 4C13 4 4 13 4 24C4 35 13 44 24 44C35 44 44 35 44 24C44 22 44.5 21 44.5 20Z" fill="#1976D2" />
  </svg>
);

export default function Auth() {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);

  useEffect(() => {
    if (!authLoading && user) {
      // Se o usuário já estiver logado, redireciona para a home do cliente
      navigate(createPageUrl('home'), { replace: true });
    }
  }, [user, authLoading, navigate]);

  const togglePasswordVisibility = () => setPasswordVisible(!passwordVisible);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!isLogin && password !== confirmPassword) {
      showError('As senhas não coincidem.');
      setLoading(false);
      return;
    }

    try {
      if (isLogin) {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        showSuccess('Login realizado com sucesso!');
        navigate(createPageUrl('home'));
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        showSuccess('Conta criada! Verifique seu e-mail para confirmar.');
        setIsLogin(true); // Volta para a tela de login após o cadastro
      }
    } catch (error) {
      console.error('Auth error:', error);
      showError((error as Error).message || 'Ocorreu um erro na autenticação.');
    } finally {
      setLoading(false);
    }
  };

  if (authLoading || user) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center justify-center overflow-x-hidden bg-background-light p-4 font-sans antialiased">
      
      {/* Botão Voltar */}
      <Button
        variant="ghost"
        onClick={() => navigate(createPageUrl('welcome'))}
        className="absolute top-4 left-4 text-primary hover:bg-primary/5"
      >
        <ArrowLeft className="w-5 h-5 mr-2" />
        Voltar
      </Button>

      <main className="flex-1 flex flex-col justify-center w-full max-w-sm">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full"
        >
          {/* Icon and Title */}
          <div className="flex flex-col items-center justify-center pb-6 w-full max-w-sm mx-auto text-center">
            <div className="flex items-center justify-center size-16 bg-highlight/10 rounded-xl mx-auto mb-4">
              <MapPin className="w-8 h-8 text-highlight" />
            </div>
            <h1 className="text-primary tracking-tight text-3xl font-bold leading-tight">
              {isLogin ? 'Bem-vindo de volta!' : 'Crie sua conta'}
            </h1>
            <p className="text-text-secondary text-base mt-1">
              {isLogin ? 'Acesse sua conta para encontrar restaurantes.' : 'Cadastre-se em segundos.'}
            </p>
          </div>

          <Card className="w-full shadow-xl border-none rounded-xl">
            <CardContent className="p-6 pt-4">
              <form onSubmit={handleAuth} className="space-y-4">
                <Input
                  className="h-14 text-base rounded-xl border-gray-200 focus:border-highlight focus:ring-highlight"
                  placeholder="E-mail"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={loading}
                  required
                />
                <div className="relative">
                  <Input
                    className="h-14 text-base pr-12 rounded-xl border-gray-200 focus:border-highlight focus:ring-highlight"
                    placeholder="Senha"
                    type={passwordVisible ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    disabled={loading}
                    required
                    minLength={6}
                  />
                  <button
                    onClick={togglePasswordVisibility}
                    className="absolute inset-y-0 right-0 flex items-center pr-4 text-gray-500 hover:text-primary transition-colors"
                    type="button"
                  >
                    {passwordVisible ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                
                {!isLogin && (
                  <div className="relative">
                    <Input
                      className="h-14 text-base pr-12 rounded-xl border-gray-200 focus:border-highlight focus:ring-highlight"
                      placeholder="Confirmar Senha"
                      type={passwordVisible ? "text" : "password"}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
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
                )}

                {isLogin && (
                  <div className="flex justify-end">
                    <Link
                      to={createPageUrl('forgot-password')}
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
                  className="flex w-full items-center justify-center rounded-xl h-12 gap-1 text-base font-bold shadow-lg transition-all hover:shadow-xl"
                >
                  <span className="truncate">
                    {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isLogin ? "Entrar" : "Cadastrar")}
                  </span>
                  {!loading && <ArrowRight className="w-5 h-5" />}
                </Button>
              </form>

              <div className="pt-6 text-center">
                <p className="text-base text-gray-600">
                  {isLogin ? 'Não tem uma conta?' : 'Já tem uma conta?'}
                  <button
                    onClick={() => setIsLogin(!isLogin)}
                    className="font-bold text-highlight hover:underline ml-1"
                    type="button"
                  >
                    {isLogin ? 'Crie uma agora' : 'Fazer login'}
                  </button>
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="w-full max-w-md mx-auto py-6">
        <div className="flex justify-center items-center gap-6">
          <p className="text-gray-500 text-sm font-medium">Termos</p>
          <p className="text-gray-500 text-sm font-medium">Privacidade (LGPD)</p>
        </div>
      </footer>
    </div>
  );
}