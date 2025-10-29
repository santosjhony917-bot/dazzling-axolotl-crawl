import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuthData } from '@/context/AuthContext';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils/url';
import ClientBasicInfoSection from '@/components/ClientBasicInfoSection';
import ChangePasswordDialog from '@/components/ChangePasswordDialog';
import { ImageUploadButton } from '@/components/ImageUploadButton';
import { User, Camera, Loader2 } from 'lucide-react';
import { AVATAR_BUCKET } from '@/constants/assets';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateProfile } from '@/integrations/supabase/profiles';
import { showError, showSuccess } from '@/utils/toast';

export default function ClientProfilePage() {
  const { isAuthenticated, signOut, profile, isProfileLoading, user, refetchProfile } = useAuthData();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [isPasswordDialogOpen, setIsPasswordDialogOpen] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  const updateProfileMutation = useMutation({
    mutationFn: async (updates: { avatar_url: string }) => {
      if (!user) throw new Error("Usuário não autenticado.");
      await updateProfile({ ...updates, id: user.id });
    },
    onSuccess: () => {
      showSuccess("Avatar atualizado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      refetchProfile();
    },
    onError: (e) => {
      showError(`Falha ao atualizar avatar: ${(e as Error).message}`);
    },
    onSettled: () => {
      setIsUploadingAvatar(false);
    }
  });

  const handleAvatarUploadComplete = useCallback((url: string) => {
    setIsUploadingAvatar(true);
    // Adiciona um timestamp para cache busting
    const cacheBustedUrl = `${url}?t=${Date.now()}`;
    updateProfileMutation.mutate({ avatar_url: cacheBustedUrl });
  }, [updateProfileMutation]);

  if (!isAuthenticated) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-bold mb-4">Acesso Negado</h2>
        <p className="text-gray-600 mb-6">Faça login para gerenciar seu perfil.</p>
        <Button onClick={() => navigate(createPageUrl('auth'))}>
          Fazer Login
        </Button>
      </div>
    );
  }
  
  const displayName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || user?.email?.split('@')[0] || 'Usuário';

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-2xl font-bold text-primary">Meu Perfil</h1>

      {/* Avatar Section */}
      <Card className="shadow-soft-xl border-none rounded-2xl p-6 bg-white">
        <CardContent className="p-0 flex flex-col items-center">
          <div className="relative w-28 h-28 rounded-full border-4 border-white bg-gray-200 dark:bg-gray-600 shrink-0 shadow-lg mb-4">
            {profile?.avatar_url ? (
              <img 
                src={profile.avatar_url} 
                alt="Avatar do Usuário" 
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-600 rounded-full">
                <User className="h-12 w-12" />
              </div>
            )}
            
            <div className="absolute bottom-0 right-0 z-10 translate-x-1/4 translate-y-1/4">
              <ImageUploadButton
                onUploadComplete={handleAvatarUploadComplete}
                bucketName={AVATAR_BUCKET}
                folderPath={`user_${user?.id}`}
                className="h-8 w-8 p-0 bg-[#E47948] text-white hover:bg-[#E47948]/90 rounded-full shadow-md"
                icon={isUploadingAvatar ? <Loader2 className="h-4 w-4 animate-spin" /> : <Camera className="h-4 w-4" />}
                disabled={isUploadingAvatar}
              />
            </div>
          </div>
          <h2 className="text-xl font-bold text-primary">{displayName}</h2>
          <p className="text-sm text-gray-500">{user?.email}</p>
        </CardContent>
      </Card>

      {/* Informações Básicas */}
      <ClientBasicInfoSection profile={profile} isLoading={isProfileLoading} />

      {/* Configurações de Conta */}
      <Card className="shadow-soft-md border-none rounded-xl">
        <CardHeader>
          <CardTitle className="text-lg text-primary">Configurações de Conta</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button 
            variant="outline" 
            className="w-full h-12 border-2 border-primary text-primary font-bold hover:bg-primary/5 rounded-xl"
            onClick={() => setIsPasswordDialogOpen(true)}
          >
            Alterar Senha
          </Button>
          <Button 
            variant="destructive" 
            onClick={signOut} 
            className="w-full h-12 font-bold rounded-xl"
          >
            Sair
          </Button>
        </CardContent>
      </Card>
      
      {/* Dialog de Alteração de Senha */}
      <ChangePasswordDialog 
        isOpen={isPasswordDialogOpen}
        onClose={() => setIsPasswordDialogOpen(false)}
      />
    </div>
  );
}