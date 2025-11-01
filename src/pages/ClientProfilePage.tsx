import React, { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useAuthData } from '@/context/AuthContext';
import { useProfile } from '@/hooks/useProfile';
import { Loader2, User, Mail, Phone } from 'lucide-react';
import ClientAreaPageLayout from '@/components/ClientAreaPageLayout';
import ClientBasicInfoSection from '@/components/ClientBasicInfoSection';
import { Separator } from '@/components/ui/separator';
import { showError, showSuccess } from '@/utils/toast';
import { z } from 'zod';
import EditClientFieldDialog from '@/components/EditClientFieldDialog';
import { Profile } from '@/types/supabase';

const nameSchema = z.string().min(2, "O nome deve ter pelo menos 2 caracteres.");
const emailSchema = z.string().email("E-mail inválido.");
const phoneSchema = z.string().regex(/^\(\d{2}\) \d{4,5}-\d{4}$/, "Telefone inválido (Ex: (83) 99999-9999)").optional().or(z.literal(''));

export default function ClientProfilePage() {
  const { user } = useAuthData();
  const { profile, isLoading: isProfileLoading, updateProfile, refetchProfile } = useProfile(user?.id);

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editConfig, setEditConfig] = useState<{ key: string, title: string, fieldName: string, icon: React.ReactNode, validationSchema: z.ZodType<string>, type?: "text" | "tel" | "email", mask?: (value: string) => string, placeholder?: string } | null>(null);

  const handleEditField = useCallback((key: string, title: string, fieldName: string, icon: React.ReactNode, validationSchema: z.ZodType<string>, type?: "text" | "tel" | "email", mask?: (value: string) => string, placeholder?: string) => {
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
    
    const cleanedValue = editConfig.mask ? value.replace(/\D/g, '') : value;

    try {
      await updateProfile({ [editConfig.key]: cleanedValue });
      showSuccess("Campo atualizado com sucesso!");
      refetchProfile();
    } catch (error: any) {
      showError(error.message || "Ocorreu um erro ao atualizar o perfil.");
    }
  }, [editConfig, updateProfile, refetchProfile]);

  if (isProfileLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <ClientAreaPageLayout title="Meu Perfil" icon={User} backPath="/">
      <div className="p-4 space-y-8 max-w-md mx-auto">
        {/* Informações Básicas */}
        <ClientBasicInfoSection 
          profile={profile} 
          email={user?.email}
          handleEditField={handleEditField} 
        />
        
        <Separator />

        {/* Outras seções do perfil podem vir aqui */}
      </div>

      {editConfig && (
        <EditClientFieldDialog
          isOpen={isEditDialogOpen}
          onClose={() => setIsEditDialogOpen(false)}
          title={editConfig.title}
          fieldName={editConfig.fieldName}
          currentValue={profile?.[editConfig.key as keyof Profile] as string || ''}
          icon={editConfig.icon}
          onSave={handleSaveField}
          placeholder={editConfig.placeholder}
          type={editConfig.type}
          validationSchema={editConfig.validationSchema}
          mask={editConfig.mask}
        />
      )}
    </ClientAreaPageLayout>
  );
}