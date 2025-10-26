import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ArrowLeft, Eye, EyeOff, ArrowRight, MapPin } from 'lucide-react';
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
import { useAuth } from '@/hooks/useAuth'; // Importa o hook useAuth

const GoogleIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
    <title>Google</title>
    <path fill="#EA4335" d="M24 9.5c3.94 0 7.1 1.64 9.26 3.02l6.84-6.84C36.49 2.34 30.71 0 24 0 14.64 0 6.6 5.4 2.69 13.22l7.97 6.19C12.23 13.66 17.66 9.5 24 9.5z"/>
    <path fill="#34A853" d="M46.1 24.5c0-1.64-.15-3.21-.44-4.74H24v9h12.45c-.54 2.9-2.16 5.36-4.58 7.06l7.02 5.45c4.12-3.8 6.46-9.4 6.46-16.77z"/>
    <path fill="#FBBC05" d="M10.66 28.41a14.44 14.44 0 010-8.82l-7.97-6.19A23.94 23.94 0 000 24c0 3.86.92 7.5 2.69 10.6l7.97-6.19z"/>
    <path fill="#4285F4" d="M24 48c6.48 0 11.92-2.13 15.89-5.79l-7.02-5.45C30.76 38.18 27.68 39.5 24 39.5c-6.34 0-11.77-4.16-13.34-9.81l-7.97 6.19C6.6 42.6 14.64 48 24 48z"/>
  </svg>
);

const AuthPage = () => {
  const navigate = useNavigate();
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  const { user, isLoading: authLoading } = useAuth(); // Usa o hook useAuth

  // Redirect if user is already logged in
  useEffect(() => {
    if (!authLoading && user) {
      // Redireciona para a home do cliente se já estiver logado
      navigate(createPageUrl('home'));
    }
  }, [user, authLoading, navigate]);

  const handleAuthAction = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    if (isSignUp) {
      if (password !== confirmPassword) {
        showError('As senhas não coincidem.');
        setLoading(false);
        return;
      }
      
      const result = await supabase.auth.signUp({ email, password });
      const error = result.error;

      if (error) {
        showError(error.message);
      } else {
        showSuccess('Cadastro realizado! Verifique seu e-mail para confirmar sua conta.');
        setIsSignUp(false); // Switch back to login view
      }
    } else {
      const result = await supabase.auth.signInWithPassword({ email, password });
      const error = result.error;
      
      if (error) {
        showError(error.message);
      } else {
        // Login bem-sucedido, o useEffect acima cuidará do redirecionamento
      }
    }
    
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

  if (authLoading) {
    return <div className="flex justify-center items-center min-h-screen">Carregando...</div>;
  }

  return (
    <div className="relative bg-background-light font-sans antialiased flex min-h-screen w-full flex-col justify-center items-center p-4">
      
      {/* Header/Botão Voltar (Padrão Consistente) */}
      <header className="flex items-center bg-white p-4 pb-2 justify-between sticky top-0 z-20 shadow-soft-md w-full max-w-sm absolute top-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="text-primary hover:bg-primary/5 rounded-lg"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <div className="flex items-center gap-2">
          <h2 className="text-primary text-xl font-bold">
            {isSignUp ? 'Cadastro' : 'Login'}
          </h2>
        </div>
        <div className="w-10"></div> {/* Placeholder para alinhamento */}
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
            <div className="flex items-center justify-center size-16 bg-primary/10 rounded-2xl mx-auto mb-4">
              <MapPin className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-primary tracking-tight text-3xl font-bold leading-tight">
              {isSignUp ? 'Crie sua conta' : 'Acesse rápido'}
            </h1>
            <p className="text-text-secondary text-base mt-1">
              {isSignUp ? 'Junte-se a nós!' : 'Seu acesso aos melhores pratos!'}
            </p>
          </div>

          <Card className="w-full shadow-soft-xl border-none rounded-2xl">
            <CardContent className="p-6 pt-4">
              <form onSubmit={handleAuthAction} className="space-y-4">
                <Input 
                  className="h-14 text-base rounded-xl border-gray-200 focus:border-highlight focus:ring-highlight shadow-soft-sm" 
                  placeholder="E-mail" 
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                />
                
                <div className="relative">
                  <Input 
                    className="h-14 text-base pr-12 rounded-xl border-gray-200 focus:border-highlight focus:ring-highlight shadow-soft-sm" 
                    placeholder="Senha" 
                    type={passwordVisible ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={loading}
                  />
                  <button 
                    type="button" 
                    className="text-gray-500 absolute inset-y-0 right-0 flex items-center justify-center pr-4 hover:text-primary transition-colors" 
                    onClick={togglePasswordVisibility}
                  >
                    {passwordVisible ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>

                {isSignUp && (
                  <div className="relative">
                    <Input 
                      className="h-14 text-base pr-12 rounded-xl border-gray-200 focus:border-highlight focus:ring-highlight shadow-soft-sm" 
                      placeholder="Confirmar Senha" 
                      type={passwordVisible ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      required
                      disabled={loading}
                    />
                    <button 
                      type="button" 
                      className="text-gray-500 absolute inset-y-0 right-0 flex items-center justify-center pr-4 hover:text-primary transition-colors" 
                      onClick={togglePasswordVisibility}
                    >
                      {passwordVisible ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                )}

                {!isSignUp && (
                  <div className="flex justify-end">
                    <Link
                      to="/forgot-password"
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
                    {loading ? 'Aguarde...' : (isSignUp ? 'Cadastrar' : 'Entrar')}
                  </span>
                  {!loading && <ArrowRight className="w-5 h-5" />}
                </Button>
              </form>

              <div className="space-y-6 pt-6">
                <div className="relative flex items-center justify-center">
                  <div className="absolute w-full border-t border-gray-300"></div>
                  <span className="bg-white px-3 text-sm text-gray-500 z-10">ou continue com</span>
                </div>
                
                <div className="flex justify-center gap-4">
                  <Button type="button" onClick={() => handleOAuthLogin('google')} variant="outline" size="icon" className="h-14 w-14 rounded-xl shadow-soft-md" disabled={loading}>
                    <GoogleIcon className="w-7 h-7" />
                  </Button>
                  <Button type="button" onClick={() => handleOAuthLogin('apple')} variant="outline" size="icon" className="h-14 w-14 rounded-xl shadow-soft-md" disabled={loading}>
                    <i className="fa-brands fa-apple text-3xl"></i>
                  </Button>
                </div>
              </div>
              
              <p className="pt-6 text-center text-base text-gray-600">
                {isSignUp ? 'Já tem uma conta?' : 'Ainda não tem conta?'}
                <button 
                  type="button"
                  onClick={() => setIsSignUp(!isSignUp)}
                  className="font-bold text-highlight hover:underline ml-1"
                >
                  {isSignUp ? 'Fazer login' : 'Cadastrar-se'}
                </button>
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </main>
      
      {/* Footer (Padrão Consistente) */}
      <footer className="w-full max-w-md mx-auto py-6">
        <div className="flex justify-center items-center gap-6">
          <Link to={createPageUrl('legal')} className="text-gray-500 text-sm font-medium hover:underline">Termos</Link>
          <Link to={createPageUrl('legal')} className="text-gray-500 text-sm font-medium hover:underline">Privacidade (LGPD)</Link>
        </div>
      </footer>
    </div>
  );
};

export default AuthPage;