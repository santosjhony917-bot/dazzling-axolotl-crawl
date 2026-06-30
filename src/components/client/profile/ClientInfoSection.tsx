import React from 'react';
import InfoCardItem from '@/components/InfoCardItem';
import { Mail, Phone, User, Lock } from 'lucide-react';
import { z } from 'zod';
import { Profile } from '@/types/supabase';

interface ClientInfoSectionProps {
  profile: Profile | null;
  handleEditField: (
    key: keyof Profile,
    title: string,
    fieldName: string,
    icon: React.ReactNode,
    validationSchema: z.ZodType<string>,
    type?: 'text' | 'tel' | 'email',
    mask?: (value: string) => string,
    placeholder?: string
  ) => void;
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
    <section className="w-full space-y-3">
      <h2 className="px-1 text-[17px] font-semibold tracking-tight text-[#3C2F2F]">Informações pessoais</h2>

      <InfoCardItem
        label="Primeiro nome"
        value={profile?.first_name || 'Não definido'}
        icon={User}
        onClick={() =>
          handleEditField('first_name', 'Editar primeiro nome', 'Primeiro nome', <User className="h-5 w-5 text-highlight" />, nameSchema)
        }
      />

      <InfoCardItem
        label="Sobrenome"
        value={profile?.last_name || 'Não definido'}
        icon={User}
        onClick={() =>
          handleEditField('last_name', 'Editar sobrenome', 'Sobrenome', <User className="h-5 w-5 text-highlight" />, nameSchema)
        }
      />

      <InfoCardItem
        label="E-mail"
        value={email || 'Não definido'}
        icon={Mail}
        onClick={() => {}}
        extraContent={
          <p className="mt-1 flex items-center gap-1 text-xs font-normal text-text-secondary">
            <Lock className="h-3 w-3" /> Não editável
          </p>
        }
      />

      <InfoCardItem
        label="Telefone"
        value={profile?.phone || 'Não definido'}
        icon={Phone}
        onClick={() =>
          handleEditField('phone', 'Editar telefone', 'Telefone', <Phone className="h-5 w-5 text-highlight" />, phoneSchema, 'tel', phoneMask)
        }
      />
    </section>
  );
};

export default ClientInfoSection;
