import React from 'react';
import InfoCardItem from '@/components/InfoCardItem';
import { Mail, Phone, User, Lock } from 'lucide-react';
import { z } from 'zod';
import { Profile } from '@/types/supabase';

interface ClientInfoSectionProps {
  profile: Profile | null;
  handleEditField: (key: string, title: string, fieldName: string, icon: React.ReactNode, validationSchema: z.ZodType<string>, type?: "text" | "tel" | "email", mask?: (value: string) => string, placeholder?: string) => void;
  phoneMask: (value: string) => string;
  nameSchema: z.ZodType<string>;
  phoneSchema: z.ZodType<string>;
  email: string | undefined | null;
}

const ClientInfoSection: React.FC<ClientInfoSectionProps> = ({
  profile,
  handleEditField,
  phoneMask,
  nameSchema,
  phoneSchema,
  email,
}) => {
  return (
    <div className="w-full space-y-3">
      <h2 className="text-lg font-extrabold text-primary px-1 mb-4">Informações Pessoais</h2>
      
      <InfoCardItem 
        label="Primeiro Nome" 
        value={profile?.first_name || "Não definido"} 
        icon={User}
        onClick={() => handleEditField('first_name', 'Editar Primeiro Nome', 'Primeiro Nome', <User className="h-6 w-6 text-primary" />, nameSchema)}
      />
      
      <InfoCardItem 
        label="Sobrenome" 
        value={profile?.last_name || "Não definido"} 
        icon={User}
        onClick={() => handleEditField('last_name', 'Editar Sobrenome', 'Sobrenome', <User className="h-6 w-6 text-primary" />, nameSchema)}
      />
      
      <InfoCardItem 
        label="E-mail" 
        value={email || "Não definido"} 
        icon={Mail}
        onClick={() => { /* E-mail não editável diretamente */ }}
        extraContent={<p className="text-xs text-gray-500 mt-1 flex items-center gap-1 font-normal"><Lock className="h-3 w-3" /> Não editável</p>}
      />
      
      <InfoCardItem 
        label="Telefone" 
        value={profile?.phone || "Não definido"} 
        icon={Phone}
        onClick={() => handleEditField('phone', 'Editar Telefone', 'Telefone', <Phone className="h-6 w-6 text-primary" />, phoneSchema, "tel", phoneMask)}
      />
    </div>
  );
};

export default ClientInfoSection;