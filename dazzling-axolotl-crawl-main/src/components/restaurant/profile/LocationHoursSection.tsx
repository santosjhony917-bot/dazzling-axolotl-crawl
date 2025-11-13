import React from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import InfoCardItem from '@/components/InfoCardItem';
import { MapPin, Clock, Check } from 'lucide-react';
import { WeekSchedule, DaySchedule } from '@/types/schedule';

interface LocationHoursSectionProps {
  restaurant: any;
  isPremium: boolean;
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


const LocationHoursSection: React.FC<LocationHoursSectionProps> = ({
  restaurant,
  isPremium,
  currentSchedule,
  setIsAddressDialogOpen,
  setIsHoursDialogOpen,
}) => {
  const scheduleSummary = formatScheduleSummary(currentSchedule);
  
  return (
    <div className="w-full space-y-3">
      <h2 className="text-xl font-bold text-[#022D68] px-1 mb-4">Localização e Horários</h2>
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

      {/* Horários */}
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

export default LocationHoursSection;