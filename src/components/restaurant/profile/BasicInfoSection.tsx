import React from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import InfoCardItem from '@/components/InfoCardItem';
import { Building2, UtensilsCrossed, FileText, Mail, Phone } from 'lucide-react';
import { z } from 'zod';

interface BasicInfoSectionProps {
  restaurant: any; // Simplificado para 'any'
  isPremium: boolean;
  handleEditField: (key: string, title: string, fieldName: string, icon: React.ReactNode, validationSchema: z.ZodType<string>, type?: "text" | "tel" | "email", mask?: (value: string) => string, placeholder?: string) => void;
  cnpjMask: (value: string) => string;
  phoneMask: (value: string) => string;
  nameSchema: z.ZodType<string>;
  emailSchema: z.ZodType<string>;
  phoneSchema: z.ZodType<string>;
  cnpjSchema: z.ZodType<string>;
}

const BasicInfoSection: React.FC<BasicInfoSectionProps> = ({
  restaurant,
  isPremium,
  handleEditField,
  cnpjMask,
  phoneMask,
  nameSchema,
  emailSchema,
  phoneSchema,
  cnpjSchema,
}) => {
  return (
    <div className="w-full space-y-3">
      <h2 className="text-lg font-bold text-[#022D68] px-1">Informações Básicas</h2>
      <InfoCardItem 
        label="Nome do Restaurante" 
        value={restaurant?.name || "Restaurante Teste Free"} 
        icon={Building2} 
        isPremium={isPremium}
        onClick={() => handleEditField('name', 'Editar Nome', 'Nome do Restaurante', <Building2 className="h-6 w-6 text-primary" />, nameSchema)}
      />
      <InfoCardItem 
        label="Categoria Principal" 
        value={restaurant?.category || "Não definida"} 
        icon={UtensilsCrossed} 
        isPremium={isPremium}
        onClick={() => handleEditField('category', 'Editar Categoria', 'Categoria Principal', <UtensilsCrossed className="h-6 w-6 text-primary" />, nameSchema, "text", undefined, "Ex: Pizzaria, Hamburgueria")}
      />
      <InfoCardItem 
        label="CNPJ" 
        value={restaurant?.cnpj || "12.345.678/0001-90"} 
        icon={FileText} 
        isPremium={isPremium}
        onClick={() => handleEditField('cnpj', 'Editar CNPJ', 'CNPJ', <FileText className="h-6 w-6 text-primary" />, cnpjSchema, "text", cnpjMask, "XX.XXX.XXX/XXXX-XX")}
      />
      <InfoCardItem 
        label="E-mail de Contato" 
        value={restaurant?.email || "teste@filterfood.com"} 
        icon={Mail} 
        isPremium={isPremium}
        onClick={() => handleEditField('email', 'Editar E-mail', 'E-mail de Contato', <Mail className="h-6 w-6 text-primary" />, emailSchema, "email")}
      />
      <InfoCardItem 
        label="Telefone de Contato" 
        value={restaurant?.phone || "(83) 99999-9999"} 
        icon={Phone} 
        isPremium={isPremium}
        onClick={() => handleEditField('phone', 'Editar Telefone', 'Telefone de Contato', <Phone className="h-6 w-6 text-primary" />, phoneSchema, "tel", phoneMask)}
      />
    </div>
  );
};

export default BasicInfoSection;