import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, LogIn } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import { createPageUrl } from '@/utils/url';
import { useAuth } from '@/hooks/useAuth'; // Usando useAuth para refetch

// NOTE: This email is hardcoded to check for admin status in AuthContext
const ADMIN_EMAIL = 'joaoedasilva018@gmail.com'; 

export default function AdminLogin() {
  const navigate = useNavigate();
  const { refetchProfile } = useAuth(); // Usando refetchProfile do useAuth
  const [email, setEmail] = useState(ADMIN_EMAIL);
  const [password, setPassword] = useState('password'); // Mock password for easy testing
  const [isLoading, setIsLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

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
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
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
              />
            </div>
            <Button type="submit" className="w-full" disabled={isLoading}>
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