import React from 'react';
import { User, Mail, Phone } from 'lucide-react';
import { Card } from '@/components/ui/card';
import InfoCardItem from '@/components/InfoCardItem';
import { Profile } from '@/types/supabase';
import { z } from 'zod';
import { phoneMask } from '@/utils/masks'; // CORRIGIDO: Importando de utilitários

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

// Máscara de telefone (reutilizada do utilitário)
const localPhoneMask = phoneMask;

const ClientBasicInfoSection: React.FC<ClientBasicInfoSectionProps> = ({
  profile,
  userEmail,
  handleEditField,
  nameSchema,
  phoneSchema,
}) => {
  
  // CORRIGIDO: 'phone' agora existe no tipo Profile
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
        // CORRIGIDO: Usando isPremiumFeature para simular bloqueio (apenas visual)
        isPremiumFeature={true} 
        isPremium={false} // Simula que o campo está bloqueado para edição direta
      />
      
      <InfoCardItem 
        label="Telefone" 
        value={displayPhone} 
        icon={Phone} 
        // CORRIGIDO: 'phone' é uma chave válida de Profile
        onClick={() => handleEditField('phone', 'Editar Telefone', 'Telefone de Contato', <Phone className="h-6 w-6 text-primary" />, phoneSchema, "tel", localPhoneMask, "(XX) XXXXX-XXXX")} 
      />
    </div>
  );
};

export default ClientBasicInfoSection;