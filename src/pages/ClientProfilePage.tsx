"use client";

import React, { useState } from 'react';
import { useAuthData } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createPageUrl } from '@/utils/url';
import { ClientBasicInfoSection } from '@/components/ClientBasicInfoSection';
import ChangePasswordDialog from '@/components/ChangePasswordDialog';
import { LogOut, User, Lock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

const ClientProfilePage: React.FC = () => {
  const { user, profile, isLoading } = useAuthData();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({
        title: "Erro ao sair",
        description: error.message,
        variant: "destructive",
      });
    } else {
      navigate(createPageUrl('home'));
    }
  };

  if (isLoading) {
    return <div className="p-4 text-center">Carregando perfil...</div>;
  }

  if (!user || !profile) {
    return <div className="p-4 text-center">Você precisa estar logado para ver esta página.</div>;
  }

  return (
    <div className="p-4 md:p-8 max-w-2xl mx-auto bg-white">
      <h1 className="text-3xl font-bold mb-6 text-primary flex items-center">
        <User className="w-7 h-7 mr-3" />
        Meu Perfil
      </h1>

      <div className="space-y-6">
        <ClientBasicInfoSection profile={profile} />

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Lock className="w-5 h-5 mr-2" />
              Segurança
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button 
              variant="outline" 
              className="w-full justify-start"
              onClick={() => setIsPasswordDialogOpen(true)}
            >
              Alterar Senha
            </Button>
            
            <ChangePasswordDialog
              isOpen={isPasswordDialogOpen}
              onClose={() => setIsPasswordDialogOpen(false)}
            />
          </CardContent>
        </Card>

        <Button 
          variant="destructive" 
          onClick={handleLogout} 
          className="w-full flex items-center justify-center"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Sair
        </Button>
      </div>
    </div>
  );
};

export default ClientProfilePage;