import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthData } from '@/context/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { Loader2, User, LogOut, Settings, Trash2 } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { showError, showSuccess } from '@/utils/toast';
import { z } from 'zod';
import { phoneMask } from '@/utils/masks';
import EditClientFieldDialog from '@/components/EditClientFieldDialog';
import ClientAvatarCard from '@/components/client/profile/ClientAvatarCard';
import ClientInfoSection from '@/components/client/profile/ClientInfoSection';
import { supabase } from '@/integrations/supabase/client';
import { Profile } from '@/types/supabase';
import InfoCardItem from '@/components/InfoCardItem';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Schemas de validação
const nameSchema = z.string().min(2, "O nome deve ter pelo menos 2 caracteres.");
const phoneSchema = z.string().regex(/^\(\d{2}\) \d{4,5}-\d{4}$/, "Telefone inválido (Ex: (83) 99999-9999)").optional().or(z.literal(''));

export default function ClientProfilePage() {
  const navigate = useNavigate();
  const { user, profile, isLoading: authLoading, refetchProfile } = useAuthData();
  const { updateProfile } = useProfile(user);
  
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editConfig, setEditConfig] = useState<{ key: keyof Profile, title: string, fieldName: string, icon: React.ReactNode, validationSchema: z.ZodType<string>, type?: "text" | "tel" | "email", mask?: (value: string) => string, placeholder?: string } | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const isLoading = authLoading || !user;

  const handleEditField = useCallback((key: keyof Profile, title: string, fieldName: string, icon: React.ReactNode, validationSchema: z.ZodType<string>, type?: "text" | "tel" | "email", mask?: (value: string) => string, placeholder?: string) => {
    setEditConfig({
      key,
      title,
      fieldName,
      icon,
      validationSchema,
      type,
      mask,
      placeholder,
    });
    setIsEditDialogOpen(true);
  }, []);

  const handleSaveField = useCallback(async (value: string) => {
    if (!editConfig) return;
    
    // Remove máscara antes de salvar no DB
    const cleanedValue = editConfig.mask ? value.replace(/\D/g, '') : value;
    
    const { error } = await updateProfile({ [editConfig.key]: cleanedValue });
    
    if (error) {
      showError(error);
    } else {
      showSuccess("Campo atualizado com sucesso!");
      refetchProfile();
    }
  }, [editConfig, updateProfile, refetchProfile]);
  
  const handleAvatarUploadComplete = useCallback(async (url: string) => {
    setUploadingAvatar(true);
    const cacheBustedUrl = `${url}?t=${Date.now()}`;
    const { error } = await updateProfile({ avatar_url: cacheBustedUrl });
    if (error) {
      showError(error);
    } else {
      showSuccess("Avatar atualizado com sucesso!");
      refetchProfile();
    }
    setUploadingAvatar(false);
  }, [updateProfile, refetchProfile]);
  
  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      showError("Erro ao sair: " + error.message);
    } else {
      showSuccess("Você saiu da sua conta.");
      navigate('/login');
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeleting(true);
    try {
      // Call Supabase function to delete user account
      const { data, error } = await supabase.rpc('delete_user_account');
      
      if (error) {
        console.error('Error deleting account:', error);
        showError("Erro ao excluir conta: " + error.message);
        setIsDeleting(false);
        return;
      }

      showSuccess("Conta excluída com sucesso.");
      // Sign out after deletion
      await supabase.auth.signOut();
      navigate('/login');
    } catch (error) {
      console.error('Unexpected error deleting account:', error);
      showError("Erro inesperado ao excluir conta.");
      setIsDeleting(false);
    }
  };

  const currentProfile = useMemo(() => ({
    ...profile,
    email: user?.email,
  }), [profile, user]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="p-4 space-y-8 max-w-md mx-auto">
      
      {/* Header */}
      <div className="flex items-center gap-3">
        <Settings className="w-6 h-6 text-primary" />
        <h1 className="text-2xl font-bold text-[#022D68]">Meu Perfil</h1>
      </div>

      {/* 1. Card Principal (Avatar e Nome) */}
      <ClientAvatarCard
        firstName={currentProfile?.first_name || ''}
        lastName={currentProfile?.last_name || ''}
        avatarUrl={currentProfile?.avatar_url}
        uploading={uploadingAvatar}
        onAvatarUploadComplete={handleAvatarUploadComplete}
        userId={user?.id || 'temp'}
      />
      
      <Separator />

      {/* 2. Informações Pessoais */}
      <ClientInfoSection 
        profile={currentProfile} 
        handleEditField={handleEditField} 
        phoneMask={phoneMask} 
        nameSchema={nameSchema} 
        phoneSchema={phoneSchema}
        email={user?.email}
      />
      
      <Separator />

      {/* 3. Opções de Conta */}
      <div className="w-full space-y-3">
        <h2 className="text-xl font-bold text-[#022D68] px-1 mb-4">Opções de Conta</h2>
        
        <InfoCardItem 
          label="Meus Favoritos" 
          value="Ver restaurantes e itens salvos" 
          icon={User}
          onClick={() => navigate('/favorites')}
        />
        
        <InfoCardItem 
          label="Sair da Conta" 
          value="Desconectar deste dispositivo" 
          icon={LogOut}
          onClick={handleLogout}
        />

        <InfoCardItem 
          label="Excluir Conta" 
          value="Remover permanentemente sua conta" 
          icon={Trash2}
          onClick={() => setIsDeleteDialogOpen(true)}
        />
      </div>
      
      {/* Dialogs */}
      {editConfig && (
        <EditClientFieldDialog
          isOpen={isEditDialogOpen}
          onClose={() => setIsEditDialogOpen(false)}
          title={editConfig.title}
          fieldName={editConfig.fieldName}
          currentValue={currentProfile?.[editConfig.key] as string || ''}
          icon={editConfig.icon}
          onSave={handleSaveField}
          placeholder={editConfig.placeholder}
          type={editConfig.type}
          validationSchema={editConfig.validationSchema}
          mask={editConfig.mask}
        />
      )}

      {/* Delete Account Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Tem certeza que deseja excluir sua conta?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é permanente e não pode ser desfeita. Todos os seus dados, incluindo favoritos e informações pessoais, serão removidos permanentemente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancelar</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleDeleteAccount} 
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
              Excluir Conta
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}