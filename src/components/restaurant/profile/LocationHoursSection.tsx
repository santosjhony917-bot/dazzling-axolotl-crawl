import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Pencil } from 'lucide-react';
import { WeekSchedule, DaySchedule } from '@/types/schedule';
import { Restaurant } from '@/types/supabase';

interface LocationHoursSectionProps {
  restaurant: Restaurant | null;
  isPremium: boolean;
  currentSchedule: WeekSchedule | null | undefined; // Atualizado para permitir null/undefined
  setIsAddressDialogOpen: (isOpen: boolean) => void;
  setIsHoursDialogOpen: (isOpen: boolean) => void;
}

const formatScheduleSummary = (schedule: WeekSchedule | null | undefined): string | null => {
  // Adicionado: Verifica se schedule é nulo, indefinido ou não é um array
  if (!schedule || !Array.isArray(schedule)) {
    return "Horários não definidos";
  }

  const days = [
    'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo'
  ];

  const openDays = schedule.filter(day => day.isActive && day.timeSlots.length > 0);

  if (openDays.length === 0) {
    return "Fechado todos os dias";
  }

  // Simplificação: se todos os dias abertos tiverem o mesmo slot, mostra o resumo.
  const firstOpenDay = openDays[0];
  if (!firstOpenDay || firstOpenDay.timeSlots.length === 0) return "Horários definidos";

  const firstSlot = firstOpenDay.timeSlots[0];
  
  const allSame = openDays.every(day => 
    day.timeSlots.length === firstOpenDay.timeSlots.length &&
    day.timeSlots.every((slot, index) => 
      slot.start === firstOpenDay.timeSlots[index].start && 
      slot.end === firstOpenDay.timeSlots[index].end
    )
  );

  if (allSame) {
    if (openDays.length === 7) {
      return `Aberto todos os dias das ${firstSlot.start} às ${firstSlot.end}`;
    } else if (openDays.length > 1) {
      const firstDayName = openDays[0].day;
      const lastDayName = openDays[openDays.length - 1].day;
      return `Aberto de ${firstDayName} a ${lastDayName} das ${firstSlot.start} às ${firstSlot.end}`;
    }
  }

  return "Horários personalizados";
};

export const LocationHoursSection: React.FC<LocationHoursSectionProps> = ({ currentSchedule, setIsAddressDialogOpen, setIsHoursDialogOpen }) => {
  const summary = formatScheduleSummary(currentSchedule);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-lg font-semibold">Horários de Funcionamento</CardTitle>
        <Button variant="ghost" size="icon" onClick={() => setIsHoursDialogOpen(true)}>
          <Pencil className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          {summary}
        </p>
      </CardContent>
    </Card>
  );
};