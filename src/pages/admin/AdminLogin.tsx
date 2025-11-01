"use client";

import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { supabase } from '@/integrations/supabase/client';
import { useAuthData } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';
import { showError } from '@/utils/toast';

const ADMIN_EMAIL = 'joaoedasilva018@gmail.com'; // Email do administrador

const AdminLogin: React.FC = () => {
  const navigate = useNavigate();
  const { user, isProfileLoading, isAdmin } = useAuthData();
  const [email, setEmail] = useState(ADMIN_EMAIL); // Preenche o email do admin por padrão

  useEffect(() => {
    if (!isProfileLoading && user && isAdmin) {
      navigate('/admin/dashboard');
    } else if (!isProfileLoading && user && !isAdmin) {
      showError('Você não tem permissão de administrador.');
      navigate('/'); // Redireciona para a home se não for admin
    }
  }, [user, isProfileLoading, isAdmin, navigate]);

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
        <h2 className="text-2xl font-bold text-center mb-6 text-[#022D68]">Login do Administrador</h2>
        <Auth
          supabaseClient={supabase}
          appearance={{ theme: ThemeSupa }}
          providers={[]} // Removendo provedores de terceiros
          redirectTo={window.location.origin + '/admin/dashboard'}
          view="sign_in"
          // email e onAuthStateChange não são props diretas do componente Auth
        />
      </div>
    </div>
  );
};

export default AdminLogin;