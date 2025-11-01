"use client";

import React, { useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthData } from '@/context/AuthContext';
import { Loader2 } from 'lucide-react';
import { showError } from '@/utils/toast';

export default function RestaurantArea() {
  const { user, isProfileLoading, restaurant } = useAuthData(); // CORRIGIDO: Usando isProfileLoading
  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isProfileLoading) {
      if (!user) {
        showError('Você precisa estar logado para acessar a área do restaurante.');
        navigate('/auth');
      } else if (!restaurant) {
        showError('Você precisa ter um restaurante registrado para acessar esta área.');
        navigate('/claim-restaurant');
      }
    }
  }, [user, restaurant, isProfileLoading, navigate]);

  if (isProfileLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
      </div>
    );
  }

  // Renderiza o Outlet apenas se o usuário estiver logado E tiver um restaurante
  if (user && restaurant) {
    return <Outlet />;
  }

  // Caso contrário, não renderiza nada (o useEffect já cuidou do redirecionamento)
  return null;
}