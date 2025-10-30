import { WeekSchedule, DaySchedule } from '@/types/schedule';

// Helper function to get the current day name in Portuguese
const getCurrentDayName = (date: Date): keyof WeekSchedule => {
  const days: (keyof WeekSchedule)[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[date.getDay()];
};

// Function to format opening hours for display
export const formatOpeningHours = (schedule: WeekSchedule): string => {
  const today = new Date();
  const currentDay = getCurrentDayName(today);
  const daySchedule: DaySchedule | undefined = schedule[currentDay]; // Explicitly type as DaySchedule

  // CORREÇÃO 5 & 6: DaySchedule é um array (TimeSlot[]), então .length e .map funcionam.
  if (!daySchedule || daySchedule.length === 0) { 
    return 'Horário não definido';
  }

  const formattedTimes = daySchedule.map(slot => {
    if (slot.is_closed) {
      return 'Fechado';
    }
    return `${slot.open_time} - ${slot.close_time}`;
  }).join(' / ');

  return `Hoje: ${formattedTimes}`;
};