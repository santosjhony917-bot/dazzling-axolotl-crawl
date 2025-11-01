"use client";

import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { useAuth } from '../hooks/useAuth'; // Corrected import path

const Settings: React.FC = () => {
  const { user, isLoading, isLoggedIn } = useAuth();

  if (isLoading) {
    return <div className="container mx-auto p-4">Carregando configurações...</div>;
  }

  if (!isLoggedIn) {
    return <div className="container mx-auto p-4">Por favor, faça login para acessar as configurações.</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6 text-[#022D68]">Configurações</h1>

      <div className="bg-white p-6 rounded-lg shadow-md max-w-md mx-auto">
        <h2 className="text-2xl font-semibold mb-4">Configurações da Conta</h2>
        <p className="mb-4">Aqui você pode gerenciar suas preferências e informações da conta.</p>
        
        <div className="space-y-4">
          <div>
            <h3 className="font-medium">Notificações</h3>
            <p className="text-sm text-gray-600">Gerencie suas preferências de notificação por email e push.</p>
            <Button variant="outline" className="mt-2">Gerenciar Notificações</Button>
          </div>
          <div>
            <h3 className="font-medium">Segurança</h3>
            <p className="text-sm text-gray-600">Altere sua senha e configure a autenticação de dois fatores.</p>
            <Button variant="outline" className="mt-2">Configurações de Segurança</Button>
          </div>
        </div>
      </div>

      <div className="mt-8 text-center">
        <Button variant="link" asChild>
          <Link to="/dashboard">Voltar para o Dashboard</Link>
        </Button>
      </div>
    </div>
  );
};

export default Settings;