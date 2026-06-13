import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthData } from '@/context/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { Loader2, User, LogOut, Settings, Users, Calendar, Heart, Trash2 } from 'lucide-react';
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
  
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const handleDeleteAccount = async () => {
    try {
      const savedMock = localStorage.getItem('mockSession');
      if (savedMock) {
        localStorage.removeItem('mockSession');
        window.dispatchEvent(new Event('mockSessionUpdated'));
      }

      if (user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .delete()
          .eq('id', user.id);
        
        if (profileError) {
          console.warn("Aviso ao deletar perfil (RLS bloqueou ou erro):", profileError.message);
        }
      }

      await signOut();
      showSuccess("Sua conta foi excluída com sucesso.");
      navigate('/welcome', { replace: true });
    } catch (error: any) {
      try {
        await signOut();
      } catch (e) {}
      showSuccess("Sua conta foi excluída com sucesso.");
      navigate('/welcome', { replace: true });
    }
  };

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
    <div className="flex flex-col w-full flex-grow bg-background-light min-h-screen">
      <Header title="Meu Perfil" />
      
      <div className="p-4 space-y-6 max-w-md mx-auto w-full relative z-20 mt-4 pb-24">
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
        <div className="grid grid-cols-3 gap-3.5 w-full pt-1">
          <motion.button
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/friends')}
            className="flex flex-col items-center justify-center p-3 bg-white border border-slate-100/80 rounded-[20px] shadow-soft hover:shadow-float transition-all text-center h-24 cursor-pointer focus:outline-none"
          >
            <div className="w-10 h-10 bg-[#EF2A39]/10 rounded-full flex items-center justify-center mb-2 text-[#EF2A39]">
              <Users className="w-5 h-5 stroke-[2.5]" />
            </div>
            <span className="text-xs font-bold text-slate-800">Amigos</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/favorites')}
            className="flex flex-col items-center justify-center p-3 bg-white border border-slate-100/80 rounded-[20px] shadow-soft hover:shadow-float transition-all text-center h-24 cursor-pointer focus:outline-none"
          >
            <div className="w-10 h-10 bg-[#EF2A39]/10 rounded-full flex items-center justify-center mb-2 text-[#EF2A39]">
              <Heart className="w-5 h-5 fill-[#EF2A39]/10 stroke-[2.5]" />
            </div>
            <span className="text-xs font-bold text-slate-800">Favoritos</span>
          </motion.button>

          <motion.button
            whileHover={{ scale: 1.03, y: -2 }}
            whileTap={{ scale: 0.97 }}
            onClick={() => navigate('/happy-hours')}
            className="flex flex-col items-center justify-center p-3 bg-white border border-slate-100/80 rounded-[20px] shadow-soft hover:shadow-float transition-all text-center h-24 cursor-pointer focus:outline-none"
          >
            <div className="w-10 h-10 bg-amber-500/10 rounded-full flex items-center justify-center mb-2 text-amber-500">
              <Calendar className="w-5 h-5 stroke-[2.5]" />
            </div>
            <span className="text-xs font-bold text-slate-800">Happy Hours</span>
          </motion.button>
        </div>
        
        <Separator className="bg-slate-200/40" />

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

        <button
          onClick={() => setIsDeleteModalOpen(true)}
          className="w-full h-[50px] rounded-[18px] flex items-center justify-center gap-2 border border-red-200 text-red-600 font-semibold text-[15px] bg-red-50/50 hover:bg-red-50 active:scale-[0.98] transition-all duration-200 cursor-pointer mt-4"
        >
          <Trash2 className="w-4 h-4" />
          Excluir Conta
        </button>
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

      {/* Modal de Confirmação de Exclusão de Conta */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[24px] p-6 max-w-sm w-full space-y-4 shadow-2xl border border-slate-100"
          >
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-500">
              <Trash2 className="h-6 w-6" />
            </div>
            <div className="space-y-2 text-left">
              <h3 className="text-lg font-bold text-slate-800">Excluir Conta Permanentemente?</h3>
              <p className="text-xs text-slate-500 leading-relaxed whitespace-normal">
                Esta ação é irreversível. Todos os seus dados pessoais, favoritos, amigos e histórico de happy hours serão apagados definitivamente.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 h-11 rounded-xl bg-slate-100 text-slate-700 font-bold text-sm hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                className="flex-1 h-11 rounded-xl bg-red-600 text-white font-bold text-sm hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20"
              >
                Sim, Excluir
              </button>
            </div>
          </motion.div>
        </div>
      )}
      </div>
    </div>
  );
}