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
// Removidos GoogleIcon e AppleIcon, pois não são usados no novo design
import Header from '@/components/Header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

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

  // Removido handleOAuthLogin, pois os botões de login social foram removidos

  return (
    <div className="min-h-screen flex flex-col items-center justify-between bg-gray-50 p-4 font-sans">
      <Header
        title="Login" // Alterado o título para "Login"
        leftAction={{ icon: ArrowLeft, onClick: () => navigate(-1) }}
      />

      <main className="flex-1 flex flex-col justify-center w-full max-w-sm"> {/* Alterado para max-w-sm */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="w-full"
        >
          <div className="text-center mb-6"> {/* Ajustado espaçamento inferior */}
            {/* Logo estilizado como na imagem */}
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white shadow-sm mb-4">
              <img src="/logo.svg" alt="Logo" className="w-10 h-10" /> {/* Ajustado tamanho do logo */}
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-1">Acesse sua conta</h2> {/* Título principal */}
            <p className="text-sm text-gray-600">Gerencie seu restaurante!</p> {/* Subtítulo */}
          </div>

          <Card className="w-full">
            {/* CardHeader e CardDescription removidos daqui, pois o texto foi movido para cima */}
            <CardContent className="pt-6"> {/* Ajustado padding superior */}
              <form onSubmit={handleLogin} className="space-y-6">
                <div>
                  <Label htmlFor="email">E-mail</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="sssjoajo@gmail.com" // Placeholder atualizado
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
                    placeholder="********" // Placeholder atualizado
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
                  {/* ArrowRight removido, pois não está na imagem para o botão principal */}
                </Button>
              </form>

              {/* Botão "Login de Cliente" adicionado */}
              <Button
                variant="outline"
                className="w-full mt-4" // Adicionado espaçamento superior
                onClick={() => navigate('/login')} // Redireciona para a página de login do cliente
                disabled={loading}
              >
                Login de Cliente
              </Button>

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