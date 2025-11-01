"use client";

import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthData } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';

const Splash: React.FC = () => {
  const navigate = useNavigate();
  const { user, isProfileLoading } = useAuthData(); // Corrigido: usando isProfileLoading

  useEffect(() => {
    if (!isProfileLoading) {
      if (user) {
        navigate('/'); // Redireciona para a página inicial se o usuário estiver logado
      } else {
        navigate('/auth'); // Redireciona para a página de autenticação se não estiver logado
      }
    }
  }, [user, isProfileLoading, navigate]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-600 to-purple-700 text-white">
      <Loader2 className="h-16 w-16 animate-spin mb-4" />
      <h1 className="text-4xl font-bold">Carregando...</h1>
      <p className="text-lg mt-2">Preparando sua experiência gastronômica</p>
    </div>
  );
};

export default Splash;