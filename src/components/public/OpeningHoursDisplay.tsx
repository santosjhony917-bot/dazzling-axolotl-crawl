import React from 'react';
import { WeekSchedule } from '@/types/schedule';
import { Clock } from 'lucide-react';

interface OpeningHoursDisplayProps {
  openingHours: WeekSchedule;
  isSummary?: boolean; // Adicionando a prop isSummary
}

export const OpeningHoursDisplay: React.FC<OpeningHoursDisplayProps> = ({ openingHours, isSummary = false }) => {
  if (!openingHours || Object.keys(openingHours).length === 0) {
    return <p className="text-gray-500 text-sm">Horário não disponível.</p>;
  }

  const daysOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  const formatTime = (time: string) => {
    if (!time) return 'Fechado';
    const [hour, minute] = time.split(':');
    return `${hour}:${minute}`;
  };

  const getDayName = (dayKey: string) => {
    const names: { [key: string]: string } = {
      monday: 'Segunda',
      tuesday: 'Terça',
      wednesday: 'Quarta',
      thursday: 'Quinta',
      friday: 'Sexta',
      saturday: 'Sábado',
      sunday: 'Domingo',
    };
    return names[dayKey] || dayKey;
  };

  const todayKey = daysOrder[new Date().getDay() === 0 ? 6 : new Date().getDay() - 1];
  const todaySchedule = openingHours[todayKey];

  if (isSummary) {
    if (!todaySchedule || todaySchedule.isClosed) {
      return <p className="text-red-600 font-medium text-sm">Fechado hoje</p>;
    }
    
    const scheduleText = todaySchedule.periods.map(p => 
      `${formatTime(p.open)} - ${formatTime(p.close)}`
    ).join(' e ');

    return <p className="text-green-600 font-medium text-sm">{scheduleText}</p>;
  }

  return (
    <div className="space-y-1 text-sm">
      {daysOrder.map(dayKey => {
        const schedule = openingHours[dayKey];
        const isToday = dayKey === todayKey;

        if (!schedule) return null;

        return (
          <div key={dayKey} className={`flex justify-between ${isToday ? 'font-bold text-gray-900' : 'text-gray-600'}`}>
            <span>{getDayName(dayKey)}:</span>
            {schedule.isClosed ? (
              <span className="text-red-500">Fechado</span>
            ) : (
              <div className="text-right">
                {schedule.periods.map((p, index) => (
                  <p key={index}>
                    {formatTime(p.open)} - {formatTime(p.close)}
                  </p>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};