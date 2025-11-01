"use client";

import React from 'react';
import { WeekSchedule, DayOfWeek, DaySchedule } from '@/types/schedule';
import { Card, CardContent } from '@/components/ui/card';

interface OpeningHoursDisplayProps {
  openingHours: WeekSchedule | null;
}

const dayNames: Record<DayOfWeek, string> = {
  monday: 'Segunda-feira',
  tuesday: 'Terça-feira',
  wednesday: 'Quarta-feira',
  thursday: 'Quinta-feira',
  friday: 'Sexta-feira',
  saturday: 'Sábado',
  sunday: 'Domingo',
};

const OpeningHoursDisplay: React.FC<OpeningHoursDisplayProps> = ({ openingHours }) => {
  if (!openingHours) {
    return <p className="text-sm text-gray-500">Horário não disponível.</p>;
  }

  const daysOrder: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  return (
    <Card className="shadow-none border-gray-200">
      <CardContent className="p-4 space-y-1">
        {daysOrder.map((day) => {
          const schedule: DaySchedule | undefined = openingHours[day];
          const dayName = dayNames[day];

          if (!schedule || schedule.slots.length === 0) {
            return (
              <div key={day} className="flex justify-between text-sm text-gray-500">
                <span>{dayName}</span>
                <span className="font-medium text-red-600">Fechado</span>
              </div>
            );
          }

          return (
            <div key={day} className="flex justify-between text-sm text-gray-700">
              <span>{dayName}</span>
              <div className="text-right">
                {schedule.slots.map((slot, index) => (
                  <p key={index} className="font-medium">
                    {slot.open} - {slot.close}
                  </p>
                ))}
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
};

export { OpeningHoursDisplay };