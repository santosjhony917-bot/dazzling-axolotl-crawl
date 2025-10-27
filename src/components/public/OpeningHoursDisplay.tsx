import React from 'react';

interface OpeningHoursDisplayProps {
  openingHours: {
    [key: string]: {
      open: string;
      close: string;
      isClosed: boolean;
    };
  };
}

const dayNames: { [key: string]: string } = {
  mon: 'Segunda-feira',
  tue: 'Terça-feira',
  wed: 'Quarta-feira',
  thu: 'Quinta-feira',
  fri: 'Sexta-feira',
  sat: 'Sábado',
  sun: 'Domingo',
};

const OpeningHoursDisplay: React.FC<OpeningHoursDisplayProps> = ({ openingHours }) => {
  if (!openingHours || Object.keys(openingHours).length === 0) {
    return <p className="text-gray-500 dark:text-gray-400">Horário não disponível.</p>;
  }

  const sortedDays = Object.keys(dayNames);

  return (
    <div className="space-y-1 text-sm">
      {sortedDays.map((dayKey) => {
        const dayData = openingHours[dayKey];
        const dayLabel = dayNames[dayKey];

        if (!dayData) return null;

        return (
          <div key={dayKey} className="flex justify-between">
            <span className="text-gray-600 dark:text-gray-400">{dayLabel}:</span>
            {dayData.isClosed ? (
              <span className="font-medium text-red-500">Fechado</span>
            ) : (
              <span className="font-medium text-gray-900 dark:text-white">
                {dayData.open} - {dayData.close}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
};

export { OpeningHoursDisplay };