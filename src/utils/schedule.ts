import { WeekSchedule } from '@/types/schedule';

/**
 * Formats the WeekSchedule object into an array of strings suitable for display.
 * @param schedule The WeekSchedule object.
 * @returns An array of strings, one for each day/schedule line.
 */
export function formatScheduleForDisplay(schedule: WeekSchedule | null | undefined): string[] {
  if (!schedule) {
    return ["Horário não disponível."];
  }

  const daysOrder: (keyof WeekSchedule)[] = [
    'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
  ];

  const dayNames: Record<keyof WeekSchedule, string> = {
    monday: 'Segunda',
    tuesday: 'Terça',
    wednesday: 'Quarta',
    thursday: 'Quinta',
    friday: 'Sexta',
    saturday: 'Sábado',
    sunday: 'Domingo',
  };

  const displayLines: string[] = [];

  for (const dayKey of daysOrder) {
    const daySchedule = schedule[dayKey];
    const dayName = dayNames[dayKey];

    if (daySchedule.isOpen) {
      const timeSlots = daySchedule.slots.map(slot => `${slot.start} - ${slot.end}`).join(', ');
      displayLines.push(`${dayName}: ${timeSlots}`);
    } else {
      displayLines.push(`${dayName}: Fechado`);
    }
  }

  return displayLines;
}