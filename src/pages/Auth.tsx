"use client";

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { useAuthData } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

const AuthPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, isProfileLoading } = useAuthData(); // CORRIGIDO: Usando 'isProfileLoading'
  const [mode, setMode] = useState<'sign_in' | 'sign_up'>('sign_in');

  useEffect(() => {
    if (!isProfileLoading && user) {
      navigate('/'); // Redireciona para a página inicial se o usuário estiver logado
    }
  }, [user, isProfileLoading, navigate]);

  if (isProfileLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white p-8 rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center mb-6 text-[#022D68]">
          {mode === 'sign_in' ? 'Entrar' : 'Criar Conta'}
        </h2>
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          providers={[]} // Removendo provedores de terceiros por enquanto
          redirectTo={window.location.origin + '/'} // Redireciona para a home após o login
          view={mode}
          // onAuthStateChange e email não são props diretas do componente Auth,
          // o AuthContext já lida com onAuthStateChange globalmente.
        />
        <Button
          variant="link"
          className="w-full mt-4 text-[#E47948]"
          onClick={() => setMode(mode === 'sign_in' ? 'sign_up' : 'sign_in')}
        >
          {mode === 'sign_in' ? 'Não tem uma conta? Cadastre-se' : 'Já tem uma conta? Faça login'}
        </Button>
      </div>
    </div>
  );
};

export default AuthPage;