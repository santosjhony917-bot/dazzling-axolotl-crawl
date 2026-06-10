import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthData } from '@/context/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { Loader2, User, LogOut, Settings, Users, Calendar, Heart } from 'lucide-react';
import { motion } from 'framer-motion';
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
import Header from '@/components/Header';

// Schemas de validação
const nameSchema = z.string().min(2, "O nome deve ter pelo menos 2 caracteres.");
const phoneSchema = z.string().regex(/^\(\d{2}\) \d{4,5}-\d{4}$/, "Telefone inválido (Ex: (83) 99999-9999)").optional().or(z.literal(''));

export default function ClientProfilePage() {
  const navigate = useNavigate();
  const { user, profile, isLoading: authLoading, refetchProfile, signOut } = useAuthData();
  const { updateProfile } = useProfile(user);
  
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editConfig, setEditConfig] = useState<{ key: keyof Profile, title: string, fieldName: string, icon: React.ReactNode, validationSchema: z.ZodType<string>, type?: "text" | "tel" | "email", mask?: (value: string) => string, placeholder?: string } | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

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
    const cacheBustedUrl = url.startsWith('data:') ? url : `${url}?t=${Date.now()}`;
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
    try {
      await signOut();
      showSuccess("Você saiu da sua conta.");
      navigate('/welcome', { replace: true });
    } catch (error: any) {
      showError("Erro ao sair: " + error.message);
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
    <div className="flex flex-col w-full flex-grow bg-white">
      <Header title="Meu Perfil" />
      
      <div className="p-4 space-y-6 max-w-md mx-auto w-full relative z-20 mt-4">
        {/* 1. Card Principal (Avatar e Nome) */}
        <ClientAvatarCard
          firstName={currentProfile?.first_name || ''}
          lastName={currentProfile?.last_name || ''}
          avatarUrl={currentProfile?.avatar_url}
          uploading={uploadingAvatar}
          onAvatarUploadComplete={handleAvatarUploadComplete}
          userId={user?.id || 'temp'}
        />

        {/* Atalhos rápidos em formato de 3 quadrados um ao lado do outro */}
        <div className="grid grid-cols-3 gap-3 w-full pt-1">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/friends')}
            className="flex flex-col items-center justify-center p-3 bg-white border border-slate-100/85 rounded-xl transition-all text-center h-24 cursor-pointer focus:outline-none hover:shadow-none shadow-none"
          >
            <div className="w-10 h-10 bg-highlight/10 rounded-full flex items-center justify-center mb-2 text-highlight">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800">Amigos</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/favorites')}
            className="flex flex-col items-center justify-center p-3 bg-white border border-slate-100/85 rounded-xl transition-all text-center h-24 cursor-pointer focus:outline-none hover:shadow-none shadow-none"
          >
            <div className="w-10 h-10 bg-[#EF2A39]/10 rounded-full flex items-center justify-center mb-2 text-[#EF2A39]">
              <Heart className="w-5 h-5 fill-[#EF2A39]/10" />
            </div>
            <span className="text-xs font-bold text-slate-800">Favoritos</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => navigate('/happy-hours')}
            className="flex flex-col items-center justify-center p-3 bg-white border border-slate-100/85 rounded-xl transition-all text-center h-24 cursor-pointer focus:outline-none hover:shadow-none shadow-none"
          >
            <div className="w-10 h-10 bg-amber-500/10 rounded-full flex items-center justify-center mb-2 text-amber-500">
              <Calendar className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-slate-800">Happy Hours</span>
          </motion.button>
        </div>
        
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
        <h2 className="text-lg font-extrabold text-primary px-1 mb-4">Opções de Conta</h2>
        
        <InfoCardItem 
          label="Sair da Conta" 
          value="Desconectar deste dispositivo" 
          icon={LogOut}
          onClick={handleLogout}
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
      </div>
    </div>
  );
}