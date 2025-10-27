import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/context/AuthContext';
import { showSuccess, showError } from '@/utils/toast';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2 } from 'lucide-react';

// NOTE: This email should ideally be managed via environment variables or database roles, 
// but for simplicity, we use a hardcoded value based on the is_admin function definition.
const ADMIN_EMAIL = 'joaoedasilva018@gmail.com'; 

const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const { refetchProfile, user, isAdmin, isLoading } = useAuthContext();
  const [email, setEmail] = useState(ADMIN_EMAIL);
  const [password, setPassword] = useState('');
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  useEffect(() => {
    if (!isLoading && user && isAdmin) {
      navigate('/admin/dashboard');
    }
  }, [user, isAdmin, isLoading, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    
    try {
      const { error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) throw error;

      // Refetch profile to ensure admin status is updated
      await refetchProfile();
      showSuccess('Login de administrador bem-sucedido!');
      // Redirecionamento é tratado pelo useEffect

    } catch (error) {
      showError('Falha no login: Credenciais inválidas ou você não é um administrador.');
      console.error(error);
    } finally {
      setIsLoggingIn(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md shadow-lg dark:bg-gray-800">
        <CardHeader>
          <CardTitle className="text-2xl text-center dark:text-white">Acesso Administrativo</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              type="email"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={isLoggingIn}
            />
            <Input
              type="password"
              placeholder="Senha"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={isLoggingIn}
            />
            <Button type="submit" className="w-full" disabled={isLoggingIn}>
              {isLoggingIn ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : 'Entrar como Admin'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminLogin;