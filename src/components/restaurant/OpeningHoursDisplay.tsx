"use client";

import React from 'react';

interface OpeningHoursDisplayProps {
  openingHours: {
    [key: string]: {
      open: string;
      close: string;
    }[];
  };
}

const dayNames: { [key: string]: string } = {
  monday: 'Segunda-feira',
  tuesday: 'Terça-feira',
  wednesday: 'Quarta-feira',
  thursday: 'Quinta-feira',
  friday: 'Sexta-feira',
  saturday: 'Sábado',
  sunday: 'Domingo',
};

export const OpeningHoursDisplay: React.FC<OpeningHoursDisplayProps> = ({ openingHours }) => {
  if (!openingHours || Object.keys(openingHours).length === 0) {
    return <p>Horário de funcionamento não disponível.</p>;
  }

  const sortedDays = Object.keys(dayNames).filter(day => openingHours[day]);

  return (
    <div className="space-y-2">
      {sortedDays.map(day => (
        <div key={day} className="flex justify-between">
          <span className="font-medium">{dayNames[day]}:</span>
          <div>
            {openingHours[day].length > 0 ? (
              openingHours[day].map((time, index) => (
                <p key={index}>{time.open} - {time.close}</p>
              ))
            ) : (
              <p>Fechado</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};