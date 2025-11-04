import React from 'react';
import { WeekSchedule, DaySchedule } from '@/types/schedule';
import { Badge } from '@/components/ui/badge';

interface OpeningHoursDisplayProps {
  schedule: WeekSchedule;
}

const daysOrder = [
  'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo'
];

const dayLabels: Record<string, string> = {
  'Segunda-feira': 'Segunda',
  'Terça-feira': 'Terça',
  'Quarta-feira': 'Quarta',
  'Quinta-feira': 'Quinta',
  'Sexta-feira': 'Sexta',
  'Sábado': 'Sábado',
  'Domingo': 'Domingo',
};

export const OpeningHoursDisplay: React.FC<OpeningHoursDisplayProps> = ({ schedule }) => {
  if (!schedule || schedule.length === 0) {
    return <p className="text-gray-500 dark:text-gray-400">Horários não definidos.</p>;
  }

  return (
    <div className="space-y-1 text-sm">
      {daysOrder.map(dayName => {
        const dayData = schedule.find(d => d.day === dayName);
        const label = dayLabels[dayName] || dayName;

        if (!dayData || !dayData.isActive || dayData.timeSlots.length === 0) {
          return (
            <div key={dayName} className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">{label}:</span>
              <Badge className="font-medium bg-red-100 text-red-700 border border-red-200">Fechado</Badge>
            </div>
          );
        }

        // Exibe todos os timeSlots para o dia
        const timeSlots = dayData.timeSlots.map(slot => `${slot.start} - ${slot.end}`).join(' / ');

        return (
          <div key={dayName} className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">{label}:</span>
            <span className="font-medium text-green-700 dark:text-green-400">{timeSlots}</span>
          </div>
        );
      })}
    </div>
  );
};