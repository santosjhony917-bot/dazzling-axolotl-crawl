"use client";

import React from 'react';
import { WeekSchedule, DaySchedule } from '@/types'; // Importando os tipos WeekSchedule e DaySchedule

interface DetailedHoursDisplayProps {
  openingHours: WeekSchedule | null; // Tipo corrigido
}

const DetailedHoursDisplay: React.FC<DetailedHoursDisplayProps> = ({ openingHours }) => {
  if (!openingHours) {
    return <p className="text-gray-500">Horário de funcionamento não disponível.</p>;
  }

  const daysOfWeek = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const dayNames = {
    monday: 'Segunda-feira',
    tuesday: 'Terça-feira',
    wednesday: 'Quarta-feira',
    thursday: 'Quinta-feira',
    friday: 'Sexta-feira',
    saturday: 'Sábado',
    sunday: 'Domingo',
  };

  const formatTime = (time: string) => {
    // Assuming time is in "HH:MM" format
    return time;
  };

  return (
    <div className="space-y-2">
      {daysOfWeek.map((dayKey) => {
        const schedule: DaySchedule = openingHours[dayKey as keyof WeekSchedule];
        return (
          <div key={dayKey} className="flex justify-between">
            <span className="font-medium">{dayNames[dayKey as keyof typeof dayNames]}</span>
            <div>
              {schedule && schedule.length > 0 ? (
                schedule.map((slot, index) => (
                  <p key={index} className="text-gray-700">
                    {formatTime(slot.start)} - {formatTime(slot.end)}
                  </p>
                ))
              ) : (
                <p className="text-gray-500">Fechado</p>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default DetailedHoursDisplay;