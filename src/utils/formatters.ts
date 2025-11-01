// src/utils/formatters.ts

import { Json } from '@/types/supabase'; // Assuming Json type is available

// Define o tipo para o horário de funcionamento
export interface WeekSchedule {
  monday?: string;
  tuesday?: string;
  wednesday?: string;
  thursday?: string;
  friday?: string;
  saturday?: string;
  sunday?: string;
}

export const formatOpeningHours = (openingHours: Json | null): string => {
  if (!openingHours) {
    return 'Horário não disponível.';
  }

  const schedule: WeekSchedule = openingHours as WeekSchedule;
  const daysOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const dayNames: { [key: string]: string } = {
    monday: 'Segunda-feira',
    tuesday: 'Terça-feira',
    wednesday: 'Quarta-feira',
    thursday: 'Quinta-feira',
    friday: 'Sexta-feira',
    saturday: 'Sábado',
    sunday: 'Domingo',
  };

  let formattedHtml = '';
  let currentRange: string[] = [];
  let currentHours: string | undefined = undefined;

  for (let i = 0; i < daysOrder.length; i++) {
    const day = daysOrder[i];
    const hours = schedule[day as keyof WeekSchedule];

    if (hours === currentHours) {
      currentRange.push(day);
    } else {
      if (currentRange.length > 0) {
        formattedHtml += formatRange(currentRange, currentHours, dayNames);
      }
      currentRange = [day];
      currentHours = hours;
    }
  }

  // Add the last range
  if (currentRange.length > 0) {
    formattedHtml += formatRange(currentRange, currentHours, dayNames);
  }

  return formattedHtml;
};

const formatRange = (range: string[], hours: string | undefined, dayNames: { [key: string]: string }): string => {
  if (!hours) {
    return `<div>${dayNames[range[0]]}${range.length > 1 ? ` a ${dayNames[range[range.length - 1]]}` : ''}: Fechado</div>`;
  }

  if (range.length === 1) {
    return `<div>${dayNames[range[0]]}: ${hours}</div>`;
  } else if (range.length === 7) {
    return `<div>Todos os dias: ${hours}</div>`;
  } else {
    return `<div>${dayNames[range[0]]} a ${dayNames[range[range.length - 1]]}: ${hours}</div>`;
  }
};