import React from 'react';
import { WeekSchedule } from '@/types/schedule'; // Importando o tipo correto

interface OpeningHoursDisplayProps {
  openingHours: WeekSchedule; // Usando o tipo WeekSchedule
}

const daysOrder: (keyof WeekSchedule)[] = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
];

const dayLabels: Record<keyof WeekSchedule, string> = {
  monday: 'Segunda-feira',
  tuesday: 'Terça-feira',
  wednesday: 'Quarta-feira',
  thursday: 'Quinta-feira',
  friday: 'Sexta-feira',
  saturday: 'Sábado',
  sunday: 'Domingo',
};

const OpeningHoursDisplay: React.FC<OpeningHoursDisplayProps> = ({ openingHours }) => {
  if (!openingHours || Object.keys(openingHours).length === 0) {
    return <p className="text-gray-500 dark:text-gray-400">Horário não disponível.</p>;
  }

  return (
    <div className="space-y-1 text-sm">
      {daysOrder.map((dayKey) => {
        const dayData = openingHours[dayKey];
        const dayLabel = dayLabels[dayKey];

        if (!dayData) return null;

        // Exibe todos os slots para o dia
        const timeSlots = dayData.slots.map(slot => `${slot.start} - ${slot.end}`).join(' / ');

        return (
          <div key={dayKey} className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">{dayLabel}:</span>
            {!dayData.isOpen || dayData.slots.length === 0 ? (
              <span className="font-medium text-red-500">Fechado</span>
            ) : (
              <span className="font-medium text-gray-900 dark:text-white">
                {timeSlots}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};

export { OpeningHoursDisplay };