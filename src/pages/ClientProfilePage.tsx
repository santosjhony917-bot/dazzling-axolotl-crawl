import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils/url';
import ClientBasicInfoSection from '@/components/ClientBasicInfoSection';
import { z } from 'zod';
import { Profile } from '@/types/supabase';

export default function ClientProfilePage() {
  const { isAuthenticated, signOut, profile, isProfileLoading } = useAuth();
  const navigate = useNavigate();

  if (!isAuthenticated) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-bold mb-4">Acesso Negado</h2>
        <p className="text-gray-600 mb-6">Faça login para gerenciar seu perfil.</p>
        <Button onClick={() => navigate(createPageUrl('login'))}>
          Fazer Login
        </Button>
      </div>
    );
  }

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold text-primary">Meu Perfil</h1>

      {/* Informações Básicas */}
      <ClientBasicInfoSection profile={profile} isLoading={isProfileLoading} />

      {/* Configurações de Conta */}
      <Card className="shadow-soft-md border-none rounded-xl">
        <CardHeader>
          <CardTitle className="text-lg">Configurações de Conta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button variant="outline" className="w-full">
            Alterar Senha
          </Button>
          <Button variant="destructive" onClick={signOut} className="w-full">
            Sair
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}