"use client";

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Eye, EyeOff, ArrowLeft, ArrowRight } from 'lucide-react';
import { useAuthData } from '@/context/AuthContext';
import { GoogleIcon } from '@/components/icons/GoogleIcon';
import { AppleIcon } from '@/components/icons/AppleIcon';
import Header from '@/components/Header'; // Importar o componente Header
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'; // Importar componentes Card

export default function RestaurantLogin() {
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthData();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isAuthenticated) {
      navigate('/restaurant-area');
    }
  }, [isAuthenticated, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Login bem-sucedido!');
      navigate('/restaurant-area');
    }
    setLoading(false);
  };

  const handleOAuthLogin = async (provider: 'google' | 'apple') => {
    setLoading(true);
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/restaurant-area`,
      },
    });
    if (error) {
      toast.error(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-between bg-gray-50 p-4 font-sans">
      <Header
        title="Acesse sua conta"
        leftAction={{ icon: ArrowLeft, onClick: () => navigate(-1) }}
      />

      <main className="flex-1 flex flex-col justify-center w-full max-w-md"> {/* Alterado de max-w-sm para max-w-md */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full"
        >
          <div className="text-center mb-12"> {/* Aumentado o espaçamento inferior */}
            <img src="/logo.svg" alt="Logo" className="w-24 h-24 mx-auto" /> {/* Logo maior e centralizado */}
          </div>

          <Card className="w-full">
            <CardHeader className="text-center">
              <CardTitle>Acesse sua conta</CardTitle>
              <CardDescription>Gerencie seu restaurante!</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleLogin} className="space-y-6">
                <div>
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="seu@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="mt-1"
                  />
                </div>
                <div className="relative">
                  <Label htmlFor="password">Senha</Label>
                  <Input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="Sua senha"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="mt-1"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-9 text-gray-500"
                  >
                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
                <div className="text-right">
                  <a href="/forgot-password" tabIndex={-1} className="text-sm text-orange-600 hover:underline">
                    Esqueceu sua senha?
                  </a>
                </div>
                <Button type="submit" variant="highlight" className="w-full" disabled={loading}>
                  {loading ? 'Entrando...' : 'Entrar'}
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Button>
              </form>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-white px-2 text-muted-foreground">
                    Ou continue com
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Button variant="outline" onClick={() => handleOAuthLogin('google')} disabled={loading}>
                  <GoogleIcon className="mr-2 h-5 w-5" />
                  Google
                </Button>
                <Button variant="outline" onClick={() => handleOAuthLogin('apple')} disabled={loading}>
                  <AppleIcon className="mr-2 h-5 w-5" />
                  Apple
                </Button>
              </div>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  Não tem uma conta?{' '}
                  <a href="/restaurant-area/signup" className="font-medium text-orange-600 hover:underline">
                    Crie uma agora
                  </a>
                </p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </main>

      <footer className="w-full max-w-sm text-center py-4">
        <div className="text-xs text-gray-500 space-x-4">
          <a href="/terms" className="hover:underline">Termos</a>
          <a href="/privacy" className="hover:underline">Privacidade (LGPD)</a>
        </div>
      </footer>
    </div>
  );
}