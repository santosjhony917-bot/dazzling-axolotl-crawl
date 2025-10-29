import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import InfoCardItem from '@/components/InfoCardItem';
import { Profile } from '@/types/supabase';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Button } from '@/components/ui/button';
import { Loader2, Save, User, Mail, Phone } from 'lucide-react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { updateProfile } from '@/integrations/supabase/profiles';
import { showError, showSuccess } from '@/utils/toast';
import { useAuthData } from '@/context/AuthContext';
import EditClientFieldDialog from '@/components/EditClientFieldDialog';
import { phoneMask } from '@/utils/masks';

interface ClientBasicInfoSectionProps {
  profile: Profile | null;
  isLoading: boolean;
}

const nameSchema = z.string().min(2, "O nome deve ter pelo menos 2 caracteres.");
const phoneSchema = z.string().regex(/^\(\d{2}\) \d{5}-\d{4}$/, "Telefone inválido (Ex: (83) 99999-9999)").optional().or(z.literal(''));

const ClientBasicInfoSection: React.FC<ClientBasicInfoSectionProps> = ({ profile, isLoading }) => {
  const { user, refetchProfile } = useAuthData();
  const queryClient = useQueryClient();
  
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [editConfig, setEditConfig] = React.useState<{ key: keyof Profile, title: string, fieldName: string, icon: React.ReactNode, validationSchema: z.ZodType<string>, type?: "text" | "tel" | "email", mask?: (value: string) => string, placeholder?: string } | null>(null);

  const updateProfileMutation = useMutation({
    mutationFn: async (updates: Partial<Profile>) => {
      if (!user) throw new Error("Usuário não autenticado.");
      await updateProfile({ ...updates, id: user.id });
    },
    onSuccess: () => {
      showSuccess("Perfil atualizado com sucesso!");
      queryClient.invalidateQueries({ queryKey: ['profile', user?.id] });
      refetchProfile();
    },
    onError: (e) => {
      showError(`Falha ao atualizar perfil: ${(e as Error).message}`);
    },
  });

  const handleEditField = (key: keyof Profile, title: string, fieldName: string, icon: React.ReactNode, validationSchema: z.ZodType<string>, type?: "text" | "tel" | "email", mask?: (value: string) => string, placeholder?: string) => {
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
  };

  const handleSaveField = async (value: string) => {
    if (!editConfig) return;
    await updateProfileMutation.mutateAsync({ [editConfig.key]: value });
  };

  if (isLoading) {
    return <Card className="p-6 text-center"><Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" /></Card>;
  }

  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ');
  const displayName = fullName || user?.email?.split('@')[0] || 'Usuário';

  return (
    <Card className="shadow-soft-xl border-none rounded-2xl p-6 bg-white">
      <CardHeader className="p-0 mb-4">
        <CardTitle className="text-xl font-bold text-primary">Informações Pessoais</CardTitle>
      </CardHeader>
      <CardContent className="p-0 space-y-3">
        
        <InfoCardItem 
          label="Nome Completo" 
          value={fullName} 
          icon={User} 
          onClick={() => handleEditField('first_name', 'Editar Nome', 'Nome', <User className="h-6 w-6 text-primary" />, nameSchema, "text", undefined, "Seu nome e sobrenome")}
        />
        
        <InfoCardItem 
          label="E-mail" 
          value={user?.email || 'Não definido'} 
          icon={Mail} 
          onClick={() => showError("O e-mail só pode ser alterado nas configurações de conta.")}
        />
        
        <InfoCardItem 
          label="Telefone" 
          value={profile?.phone || 'Não definido'} 
          icon={Phone} 
          onClick={() => handleEditField('phone', 'Editar Telefone', 'Telefone', <Phone className="h-6 w-6 text-primary" />, phoneSchema, "tel", phoneMask, "(83) 99999-9999")}
        />
        
      </CardContent>
      
      {editConfig && (
        <EditClientFieldDialog
          isOpen={isEditDialogOpen}
          onClose={() => setIsEditDialogOpen(false)}
          title={editConfig.title}
          fieldName={editConfig.fieldName}
          currentValue={profile?.[editConfig.key] as string || ''}
          icon={editConfig.icon}
          onSave={handleSaveField}
          placeholder={editConfig.placeholder}
          type={editConfig.type}
          validationSchema={editConfig.validationSchema}
          mask={editConfig.mask}
        />
      )}
    </Card>
  );
};

export default ClientBasicInfoSection;