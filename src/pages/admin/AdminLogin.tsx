import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuthData } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, LogIn } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import { createPageUrl } from '@/utils/url';

// NOTE: This email is hardcoded to check for admin status in AuthContext
const ADMIN_EMAIL = 'joaoedasilva018@gmail.com'; 

export default function AdminLogin() {
  const navigate = useNavigate();
  const { refetchProfile, signInWithMock } = useAuthData(); // CORRIGIDO: Usando useAuthData
  const [email, setEmail] = useState(ADMIN_EMAIL);
  const [password, setPassword] = useState('password'); // Mock password for easy testing
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const cleanEmail = email.toLowerCase().trim();
    if (cleanEmail === 'admin@restaurante.com' || cleanEmail === 'joaoedasilva018@gmail.com') {
      if (signInWithMock) {
        signInWithMock('admin@restaurante.com');
        showSuccess("Login de administrador de teste realizado com sucesso!");
        setIsLoading(false);
        navigate(createPageUrl('adminDashboard'));
        return;
      }
    }

    if (email !== ADMIN_EMAIL) {
      showError("Acesso negado. Este painel é exclusivo para administradores.");
      setIsLoading(false);
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      showError(`Erro de login: ${error.message}`);
    } else {
      // Refetch profile data to ensure isAdmin status is updated immediately
      await refetchProfile(); 
      showSuccess("Login de administrador realizado com sucesso!");
      navigate(createPageUrl('adminDashboard'));
    }
    setIsLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <Card className="w-full max-w-md shadow-soft-xl border-none rounded-2xl">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2 text-primary">
            <LogIn className="w-6 h-6 text-primary" /> Login de Administrador
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
                className="h-12 rounded-xl border-gray-200 focus:border-highlight focus:ring-highlight shadow-soft-sm"
              />
            </div>
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">Senha</label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
                className="h-12 rounded-xl border-gray-200 focus:border-highlight focus:ring-highlight shadow-soft-sm"
              />
            </div>
            <Button type="submit" className="w-full h-12 text-lg font-bold" disabled={isLoading} variant="highlight">
              {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <LogIn className="mr-2 h-4 w-4" />}
              Entrar
            </Button>
          </form>
          <p className="mt-4 text-center text-sm text-gray-500">
            Apenas para uso administrativo.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}