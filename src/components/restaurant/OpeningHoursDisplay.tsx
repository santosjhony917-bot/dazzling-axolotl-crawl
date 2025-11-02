import React from 'react';
import { Clock } from 'lucide-react';
import { WeekSchedule, DaySchedule } from '@/types/schedule'; // Importando os tipos do novo arquivo

interface OpeningHoursDisplayProps {
  openingHours: WeekSchedule | null;
}

const daysOfWeek = [
  'sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'
];

const dayNames: { [key: string]: string } = {
  sunday: 'Domingo',
  monday: 'Segunda-feira',
  tuesday: 'Terça-feira',
  wednesday: 'Quarta-feira',
  thursday: 'Quinta-feira',
  friday: 'Sexta-feira',
  saturday: 'Sábado',
};

const OpeningHoursDisplay: React.FC<OpeningHoursDisplayProps> = ({ openingHours }) => {
  if (!openingHours) {
    return null;
  }

  return (
    <div className="space-y-2">
      {daysOfWeek.map(dayKey => {
        const schedules: DaySchedule[] = openingHours[dayKey as keyof WeekSchedule];
        const hasSchedule = schedules && schedules.length > 0;
        const isClosed = hasSchedule && schedules.every(s => s.is_closed);

        return (
          <div key={dayKey} className="flex items-center gap-3 text-gray-700">
            <Clock className="w-5 h-5 text-highlight" />
            <p className="text-base font-medium w-28">{dayNames[dayKey]}:</p>
            <div className="flex-1">
              {isClosed ? (
                <span className="text-red-500">Fechado</span>
              ) : hasSchedule ? (
                schedules.map((schedule, index) => (
                  <span key={index} className="block">
                    {schedule.open} - {schedule.close}
                  </span>
                ))
              ) : (
                <span className="text-gray-500">Não informado</span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default OpeningHoursDisplay;