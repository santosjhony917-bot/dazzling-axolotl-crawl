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
  const daySchedule: DaySchedule | undefined = schedule[currentDay];

  if (!daySchedule || !daySchedule.isOpen || daySchedule.slots.length === 0) { 
    return 'Fechado hoje';
  }

  const formattedTimes = daySchedule.slots.map(slot => {
    // Assumindo que se isOpen é true, os slots não estão fechados individualmente
    return `${slot.start} - ${slot.end}`;
  }).join(' / ');

  return `Hoje: ${formattedTimes}`;
};