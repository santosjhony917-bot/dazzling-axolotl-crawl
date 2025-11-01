import React from 'react';
import { Label } from '@/components/ui/label';
import InfoCardItem from '@/components/InfoCardItem';
import { Profile } from '@/types/supabase';
import { User, Mail, Phone } from 'lucide-react';
import { z } from 'zod';
import { phoneMask } from '@/utils/masks';

interface ClientBasicInfoSectionProps {
  profile: Profile | null;
  email: string | undefined;
  handleEditField: (key: string, title: string, fieldName: string, icon: React.ReactNode, validationSchema: z.ZodType<string>, type?: "text" | "tel" | "email", mask?: (value: string) => string, placeholder?: string) => void;
}

const nameSchema = z.string().min(2, "O nome deve ter pelo menos 2 caracteres.");
const emailSchema = z.string().email("E-mail inválido.");
const phoneSchema = z.string().regex(/^\(\d{2}\) \d{4,5}-\d{4}$/, "Telefone inválido (Ex: (83) 99999-9999)").optional().or(z.literal(''));

const ClientBasicInfoSection: React.FC<ClientBasicInfoSectionProps> = ({ profile, email, handleEditField }) => {
  return (
    <div className="w-full space-y-3">
      <h2 className="text-xl font-bold text-[#022D68] px-1 mb-4">Informações Básicas</h2>
      
      <InfoCardItem 
        label="Nome" 
        value={profile?.first_name || 'Não definido'} 
        icon={User}
        onClick={() => handleEditField('first_name', 'Editar Nome', 'Nome', <User className="h-6 w-6 text-primary" />, nameSchema)}
      />
      <InfoCardItem 
        label="Sobrenome" 
        value={profile?.last_name || 'Não definido'} 
        icon={User}
        onClick={() => handleEditField('last_name', 'Editar Sobrenome', 'Sobrenome', <User className="h-6 w-6 text-primary" />, nameSchema)}
      />
      <InfoCardItem 
        label="E-mail" 
        value={email || 'Não definido'} 
        icon={Mail}
        onClick={() => alert("A alteração de e-mail não está disponível no momento.")}
      />
      <InfoCardItem 
        label="Telefone" 
        value={profile?.phone ? phoneMask(profile.phone) : 'Não definido'} 
        icon={Phone}
        onClick={() => handleEditField('phone', 'Editar Telefone', 'Telefone', <Phone className="h-6 w-6 text-primary" />, phoneSchema, "tel", phoneMask, "(83) 99999-9999")}
      />
    </div>
  );
};

export default ClientBasicInfoSection;