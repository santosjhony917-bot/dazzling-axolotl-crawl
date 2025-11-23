import React from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import InfoCardItem from '@/components/InfoCardItem';
import { Building2, UtensilsCrossed, FileText, Mail, Phone, File, MapPin, Clock, Check } from 'lucide-react'; // Adicionado File, MapPin, Clock, Check
import { z } from 'zod';
import { WeekSchedule } from '@/types/schedule';

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
  // Novos props para endereço e horários
  currentSchedule: WeekSchedule;
  setIsAddressDialogOpen: (open: boolean) => void;
  setIsHoursDialogOpen: (open: boolean) => void;
}

// Helper para formatar o resumo dos horários
const formatScheduleSummary = (schedule: WeekSchedule): string | null => {
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as (keyof WeekSchedule)[];
  
  const openDays = days.filter(day => schedule[day]?.isOpen);
  
  if (openDays.length === 0) return null;
  
  // Simplificação: se todos os dias abertos tiverem o mesmo slot, mostra o resumo.
  const firstSlot = schedule[openDays[0]].slots[0];
  if (!firstSlot) return "Horários definidos";

  const summary = `${openDays.length} dias abertos. Ex: ${firstSlot.start} - ${firstSlot.end}`;
  return summary;
};

// NOVO: Componente para renderizar o endereço em múltiplas linhas
const AddressValue: React.FC<{ restaurant: any }> = ({ restaurant }) => {
  const addressParts = [
    restaurant?.address,
    restaurant?.number,
    restaurant?.neighborhood,
    restaurant?.city,
    restaurant?.state,
  ].filter(Boolean);
  
  const displayAddress = addressParts.join(', ');
  
  if (!displayAddress) {
    return <p className="text-sm text-gray-400 italic">Não definido</p>;
  }
  
  // Exibe o endereço em múltiplas linhas se for muito longo
  return (
    <div className="flex flex-col text-sm text-text-secondary mt-0.5">
      <p>{restaurant.address}, {restaurant.number}</p>
      <p>{restaurant.neighborhood}, {restaurant.city} - {restaurant.state}</p>
    </div>
  );
};

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
  currentSchedule,
  setIsAddressDialogOpen,
  setIsHoursDialogOpen,
}) => {
  const scheduleSummary = formatScheduleSummary(currentSchedule);

  return (
    <div className="w-full space-y-3">
      <h2 className="text-xl font-bold text-[#022D68] px-1 mb-4">Informações Básicas</h2>
      <InfoCardItem 
        label="Nome do Restaurante" 
        value={restaurant?.name || "Restaurante Teste Free"} 
        icon={FileText} // Ícone de documento/arquivo
        isPremium={isPremium}
        onClick={() => handleEditField('name', 'Editar Nome', 'Nome do Restaurante', <FileText className="h-6 w-6 text-primary" />, nameSchema)}
      />
      <InfoCardItem 
        label="Categoria Principal" 
        value={restaurant?.category || "Não definida"} 
        icon={UtensilsCrossed} // Ícone de talheres cruzados
        isPremium={isPremium}
        onClick={() => handleEditField('category', 'Editar Categoria', 'Categoria Principal', <UtensilsCrossed className="h-6 w-6 text-primary" />, nameSchema, "text", undefined, "Ex: Pizzaria, Hamburgueria")}
      />
      <InfoCardItem 
        label="CNPJ" 
        value={restaurant?.cnpj || "12.345.678/0001-90"} 
        icon={FileText} // Ícone de documento/arquivo
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
      
      {/* Itens movidos de LocationHoursSection */}
      <InfoCardItem
        label="Endereço Principal"
        value={null} // Definido como null para usar o extraContent
        icon={MapPin}
        isPremium={isPremium}
        onClick={() => setIsAddressDialogOpen(true)}
        extraContent={
          <>
            <AddressValue restaurant={restaurant} />
            {restaurant?.latitude && restaurant?.longitude ? (
              <p className="text-xs text-green-600 mt-1 flex items-center gap-1 font-normal">
                <Check className="h-3 w-3" /> Coordenadas Geográficas Salvas
              </p>
            ) : undefined}
          </>
        }
      />

      <InfoCardItem
        label="Horários de Funcionamento"
        value={scheduleSummary}
        icon={Clock}
        isPremium={isPremium}
        onClick={() => setIsHoursDialogOpen(true)}
      />
    </div>
  );
};

export default BasicInfoSection;