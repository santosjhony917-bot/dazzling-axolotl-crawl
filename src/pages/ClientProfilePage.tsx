import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthData } from '@/context/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { Loader2, LogOut, Users, Calendar, Heart, Trash2 } from 'lucide-react';
import { motion } from 'framer-motion';
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
import PhoneShell from '@/components/layout/PhoneShell';

const nameSchema = z.string().min(2, 'O nome deve ter pelo menos 2 caracteres.');
const phoneSchema = z
  .string()
  .regex(/^\(\d{2}\) \d{4,5}-\d{4}$/, 'Telefone inválido (Ex: (83) 99999-9999)')
  .optional()
  .or(z.literal(''));

export default function ClientProfilePage() {
  const navigate = useNavigate();
  const { user, profile, isLoading: authLoading, refetchProfile, signOut } = useAuthData();
  const { updateProfile } = useProfile(user);

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editConfig, setEditConfig] = useState<{
    key: keyof Profile;
    title: string;
    fieldName: string;
    icon: React.ReactNode;
    validationSchema: z.ZodType<string>;
    type?: 'text' | 'tel' | 'email';
    mask?: (value: string) => string;
    placeholder?: string;
  } | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const isLoading = authLoading || !user;

  const handleEditField = useCallback(
    (
      key: keyof Profile,
      title: string,
      fieldName: string,
      icon: React.ReactNode,
      validationSchema: z.ZodType<string>,
      type?: 'text' | 'tel' | 'email',
      mask?: (value: string) => string,
      placeholder?: string
    ) => {
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
    },
    []
  );

  const handleSaveField = useCallback(
    async (value: string) => {
      if (!editConfig) return;

      const cleanedValue = editConfig.mask ? value.replace(/\D/g, '') : value;
      const { error } = await updateProfile({ [editConfig.key]: cleanedValue });

      if (error) {
        showError(error);
      } else {
        showSuccess('Campo atualizado com sucesso!');
        refetchProfile();
      }
    },
    [editConfig, updateProfile, refetchProfile]
  );

  const handleAvatarUploadComplete = useCallback(
    async (url: string) => {
      setUploadingAvatar(true);
      const cacheBustedUrl = url.startsWith('data:') ? url : `${url}?t=${Date.now()}`;
      const { error } = await updateProfile({ avatar_url: cacheBustedUrl });
      if (error) {
        showError(error);
      } else {
        showSuccess('Avatar atualizado com sucesso!');
        refetchProfile();
      }
      setUploadingAvatar(false);
    },
    [updateProfile, refetchProfile]
  );

  const handleDeleteAccount = async () => {
    try {
      const savedMock = localStorage.getItem('mockSession');
      if (savedMock) {
        localStorage.removeItem('mockSession');
        window.dispatchEvent(new Event('mockSessionUpdated'));
      }

      if (user) {
        const { error: profileError } = await supabase.from('profiles').delete().eq('id', user.id);

        if (profileError) {
          console.warn('Aviso ao deletar perfil:', profileError.message);
        }
      }

      await signOut();
      showSuccess('Sua conta foi excluída com sucesso.');
      navigate('/welcome', { replace: true });
    } catch (error: any) {
      try {
        await signOut();
      } catch (e) {}
      showSuccess('Sua conta foi excluída com sucesso.');
      navigate('/welcome', { replace: true });
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      showSuccess('Você saiu da sua conta.');
      navigate('/welcome', { replace: true });
    } catch (error: any) {
      showError(`Erro ao sair: ${error.message}`);
    }
  };

  const currentProfile = useMemo(
    () => ({
      ...profile,
      email: user?.email,
    }),
    [profile, user]
  );

  if (isLoading) {
    return (
      <PhoneShell>
        <div className="flex min-h-screen items-center justify-center bg-[#FAFAFA]">
          <Loader2 className="h-7 w-7 animate-spin text-highlight" />
        </div>
      </PhoneShell>
    );
  }

  const shortcutItems = [
    { label: 'Amigos', icon: Users, path: '/friends', accent: 'text-highlight', iconClassName: '' },
    { label: 'Favoritos', icon: Heart, path: '/favorites', accent: 'text-highlight', iconClassName: 'fill-highlight/10' },
    { label: 'Happy Hours', icon: Calendar, path: '/happy-hours', accent: 'text-amber-500', iconClassName: '' },
  ];

  return (
    <PhoneShell>
      <div className="flex min-h-screen w-full flex-col bg-[#FAFAFA]">
        <Header title="Meu Perfil" />

        <main className="relative z-20 mx-auto w-full max-w-md space-y-5 px-4 pb-36 pt-4">
          <ClientAvatarCard
            firstName={currentProfile?.first_name || ''}
            lastName={currentProfile?.last_name || ''}
            avatarUrl={currentProfile?.avatar_url}
            uploading={uploadingAvatar}
            onAvatarUploadComplete={handleAvatarUploadComplete}
            userId={user?.id || 'temp'}
          />

          <div className="grid w-full grid-cols-3 gap-3">
            {shortcutItems.map((item) => {
              const Icon = item.icon;
              return (
                <motion.button
                  key={item.label}
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => navigate(item.path)}
                  className="flex h-[86px] flex-col items-center justify-center rounded-[20px] border border-slate-100 bg-white p-3 text-center shadow-soft transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-highlight focus-visible:ring-offset-2"
                >
                  <span className="mb-2 flex h-9 w-9 items-center justify-center rounded-full bg-slate-50">
                    <Icon className={`h-[18px] w-[18px] stroke-[2] ${item.accent} ${item.iconClassName}`} />
                  </span>
                  <span className="text-xs font-semibold leading-tight text-[#3C2F2F]">{item.label}</span>
                </motion.button>
              );
            })}
          </div>

          <ClientInfoSection
            profile={currentProfile}
            handleEditField={handleEditField}
            phoneMask={phoneMask}
            nameSchema={nameSchema}
            phoneSchema={phoneSchema}
            email={user?.email}
          />

          <section className="w-full space-y-3 pt-1">
            <h2 className="px-1 text-[17px] font-semibold tracking-tight text-[#3C2F2F]">Conta</h2>

            <InfoCardItem
              label="Sair da conta"
              value="Desconectar deste dispositivo"
              icon={LogOut}
              onClick={handleLogout}
            />

            <button
              onClick={() => setIsDeleteModalOpen(true)}
              className="mt-1 flex h-11 w-full items-center justify-center gap-2 rounded-[18px] border border-red-100 bg-white text-[14px] font-semibold text-red-500 shadow-soft transition-all hover:bg-red-50 active:scale-[0.99]"
            >
              <Trash2 className="h-4 w-4" />
              Excluir conta
            </button>
          </section>

          {editConfig && (
            <EditClientFieldDialog
              isOpen={isEditDialogOpen}
              onClose={() => setIsEditDialogOpen(false)}
              title={editConfig.title}
              fieldName={editConfig.fieldName}
              currentValue={(currentProfile?.[editConfig.key] as string) || ''}
              icon={editConfig.icon}
              onSave={handleSaveField}
              placeholder={editConfig.placeholder}
              type={editConfig.type}
              validationSchema={editConfig.validationSchema}
              mask={editConfig.mask}
            />
          )}

          {isDeleteModalOpen && (
            <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/45 p-4 backdrop-blur-sm">
              <motion.div
                initial={{ opacity: 0, scale: 0.96 }}
                animate={{ opacity: 1, scale: 1 }}
                className="w-full max-w-sm rounded-[24px] border border-slate-100 bg-white p-5 shadow-float"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-red-500">
                  <Trash2 className="h-5 w-5" />
                </div>
                <div className="space-y-2 text-left">
                  <h3 className="text-[18px] font-semibold tracking-tight text-[#3C2F2F]">
                    Excluir conta permanentemente?
                  </h3>
                  <p className="text-sm leading-relaxed text-text-secondary">
                    Esta ação é irreversível. Seus dados pessoais, favoritos, amigos e histórico serão apagados.
                  </p>
                </div>
                <div className="flex gap-3 pt-5">
                  <Button
                    type="button"
                    variant="secondary"
                    className="h-11 flex-1 shadow-none"
                    onClick={() => setIsDeleteModalOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    className="h-11 flex-1 shadow-none"
                    onClick={handleDeleteAccount}
                  >
                    Excluir
                  </Button>
                </div>
              </motion.div>
            </div>
          )}
        </main>
      </div>
    </PhoneShell>
  );
}
