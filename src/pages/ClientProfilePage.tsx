"use client";

import React from 'react';
import { useAuth } from '@/context/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/types'; // Importando de '@/types'
import InfoCardItem from '@/components/InfoCardItem';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function ClientProfilePage() {
  const { user, profile, isLoading } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.error('Error logging out:', error.message);
    } else {
      navigate('/login');
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <div className="text-center p-4">Por favor, faça login para ver seu perfil.</div>;
  }

  return (
    <div className="container mx-auto p-4 max-w-2xl">
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl font-bold">Meu Perfil</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <InfoCardItem label="Nome" value={`${profile?.first_name || ''} ${profile?.last_name || ''}`} />
          <InfoCardItem label="Email" value={user.email || 'Não disponível'} />
          <InfoCardItem label="Telefone" value={profile?.phone || 'Não disponível'} />
          {/* Adicione mais informações do perfil conforme necessário */}
          <Separator />
          <Button onClick={handleLogout} variant="destructive" className="w-full">
            Sair
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}