import React from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import InfoCardItem from '@/components/InfoCardItem';
import { MapPin, Clock, Check } from 'lucide-react';
import { WeekSchedule } from '@/types/schedule';

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


const LocationHoursSection: React.FC<LocationHoursSectionProps> = ({
  restaurant,
  isPremium,
  currentSchedule,
  setIsAddressDialogOpen,
  setIsHoursDialogOpen,
}) => {
  const scheduleSummary = formatScheduleSummary(currentSchedule);
  
  return (
    <Card className="w-full shadow-xl border-none rounded-xl p-6 bg-white dark:bg-gray-800 mb-6">
      <CardHeader className="p-0 mb-4">
        <CardTitle className="text-lg font-bold text-[#022D68]">Localização e Horários</CardTitle>
      </CardHeader>
      <div className="space-y-3">
        {/* Endereço */}
        <InfoCardItem
          label="Endereço Principal"
          value={restaurant?.address ? `${restaurant.address}, ${restaurant.neighborhood}, ${restaurant.city} - ${restaurant.state}` : null}
          icon={MapPin}
          isPremium={isPremium}
          onClick={() => setIsAddressDialogOpen(true)}
          extraContent={restaurant?.latitude && restaurant?.longitude ? (
            <p className="text-xs text-green-600 mt-1 flex items-center gap-1 font-normal">
              <Check className="h-3 w-3" /> Coordenadas Geográficas Salvas
            </p>
          ) : undefined}
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
    </Card>
  );
};

export default LocationHoursSection;