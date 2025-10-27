import React from 'react';
import { User, Mail, Phone } from 'lucide-react';
import { Card } from '@/components/ui/card';
import InfoCardItem from '@/components/InfoCardItem';
import { Profile } from '@/types/supabase';
import { z } from 'zod';
import { phoneMask } from '@/components/restaurant/ProfileManagementLayout'; // Reutilizando a máscara de telefone

interface ClientBasicInfoSectionProps {
  profile: Profile | null;
  userEmail: string;
  handleEditField: (
    key: keyof Profile | 'email', 
    title: string, 
    fieldName: string, 
    icon: React.ReactNode, 
    validationSchema: z.ZodType<string>, 
    type?: "text" | "tel" | "email", 
    mask?: (value: string) => string, 
    placeholder?: string
  ) => void;
  nameSchema: z.ZodType<string>;
  phoneSchema: z.ZodType<string>;
}

// Máscara de telefone (copiada de ProfileManagementLayout para evitar dependência circular)
const localPhoneMask = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/^(\d{2})(\d)/g, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{4})\d+?$/, '$1');
};

const ClientBasicInfoSection: React.FC<ClientBasicInfoSectionProps> = ({
  profile,
  userEmail,
  handleEditField,
  nameSchema,
  phoneSchema,
}) => {
  
  const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ');
  const displayPhone = profile?.phone ? localPhoneMask(profile.phone.replace(/\D/g, '')) : null;

  return (
    <div className="w-full space-y-3">
      <h2 className="text-xl font-bold text-[#022D68] px-1 mb-4">Informações Básicas</h2>
      
      <InfoCardItem 
        label="Nome Completo" 
        value={fullName || "Não definido"} 
        icon={User} 
        onClick={() => handleEditField('first_name', 'Editar Nome', 'Nome Completo', <User className="h-6 w-6 text-primary" />, nameSchema, "text", undefined, "Ex: João da Silva")}
      />
      
      <InfoCardItem 
        label="E-mail" 
        value={userEmail} 
        icon={Mail} 
        onClick={() => alert("A alteração de e-mail deve ser feita através das configurações de autenticação.")}
        // E-mail não é editável diretamente aqui, apenas exibido
        isLocked={true} 
      />
      
      <InfoCardItem 
        label="Telefone" 
        value={displayPhone} 
        icon={Phone} 
        onClick={() => handleEditField('phone', 'Editar Telefone', 'Telefone de Contato', <Phone className="h-6 w-6 text-primary" />, phoneSchema, "tel", localPhoneMask, "(XX) XXXXX-XXXX")}
      />
    </div>
  );
};

export default ClientBasicInfoSection;