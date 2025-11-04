import React from 'react';
import { WeekSchedule, DaySchedule } from '@/types/schedule';
import { Badge } from '@/components/ui/badge';

interface DetailedHoursDisplayProps {
  schedule: WeekSchedule;
}

const dayLabels: Record<string, string> = {
  'Segunda-feira': 'Segunda-feira',
  'Terça-feira': 'Terça-feira',
  'Quarta-feira': 'Quarta-feira',
  'Quinta-feira': 'Quinta-feira',
  'Sexta-feira': 'Sexta-feira',
  'Sábado': 'Sábado',
  'Domingo': 'Domingo',
};

const daysOfWeek = [
  'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo'
];

export const DetailedHoursDisplay: React.FC<DetailedHoursDisplayProps> = ({ schedule }) => {
  if (!schedule || schedule.length === 0) {
    return <p className="text-gray-500 dark:text-gray-400">Horários não definidos.</p>;
  }

  return (
    <div className="space-y-3">
      {daysOfWeek.map(dayName => {
        const daySchedule = schedule.find(d => d.day === dayName);
        const label = dayLabels[dayName] || dayName;

        return (
          <div key={dayName} className="flex justify-between items-center border-b border-gray-100 dark:border-gray-700 pb-2 last:border-b-0">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
            {daySchedule?.isActive && daySchedule.timeSlots.length > 0 ? (
                <div className="flex flex-col items-end">
                  {daySchedule.timeSlots.map((slot, index) => (
                    <span key={index} className="text-sm font-bold text-green-600 dark:text-green-400">
                      {slot.start} - {slot.end}
                    </span>
                  ))}
                </div>
            ) : (
              <Badge variant="outline" className="font-medium bg-red-100 text-red-700 border-red-200">Fechado</Badge>
            )}
          </div>
        );
      })}
    </div>
  );
};