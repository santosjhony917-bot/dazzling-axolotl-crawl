import { DBWeekSchedule, WeekSchedule, DaySchedule, DayOfWeek, ScheduleEntry, OpenStatus } from '@/types/schedule';

// Helper function to convert time string "HH:MM" to minutes since midnight
const timeToMinutes = (time: string): number => {
  const [hours, minutes] = time.split(':').map(Number);
  return hours * 60 + minutes;
};

// Helper function to get the current day of the week key
const getCurrentDayKey = (date: Date): DayOfWeek => {
  const dayIndex = date.getDay(); // 0 (Sunday) to 6 (Saturday)
  const days: DayOfWeek[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[dayIndex];
};

/**
 * Processes the raw DB schedule (DBWeekSchedule) into a displayable format (WeekSchedule)
 * and calculates the current open status.
 */
export const processSchedule = (dbSchedule: DBWeekSchedule | null): WeekSchedule | null => {
  if (!dbSchedule) return null;

  const processedSchedule: WeekSchedule = {};
  const days: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];

  for (const day of days) {
    const entries = dbSchedule[day] || [];
    
    // Determine if the restaurant is open at all today
    const isOpenToday = entries.length > 0;

    processedSchedule[day] = {
      isOpen: isOpenToday,
      slots: entries.map(entry => ({
        open: entry.open,
        close: entry.close,
      })),
    };
  }

  return processedSchedule;
};


/**
 * Calculates the current open status of the restaurant based on the raw DB schedule.
 */
export const getRestaurantOpenStatus = (dbSchedule: DBWeekSchedule | null): OpenStatus => {
  if (!dbSchedule) {
    return { isOpen: false, statusText: 'Horário não informado' };
  }

  const now = new Date();
  const currentDayKey = getCurrentDayKey(now);
  const currentTimeMinutes = timeToMinutes(`${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`);

  const todaySlots = dbSchedule[currentDayKey] || [];

  if (todaySlots.length === 0) {
    return { isOpen: false, statusText: 'Fechado hoje' };
  }

  for (const slot of todaySlots) {
    const openMinutes = timeToMinutes(slot.open);
    const closeMinutes = timeToMinutes(slot.close);

    // Handle simple case (open and close on the same day)
    if (openMinutes <= closeMinutes) {
      if (currentTimeMinutes >= openMinutes && currentTimeMinutes < closeMinutes) {
        return { isOpen: true, statusText: `Aberto até ${slot.close}` };
      }
    } else {
      // Handle overnight case (e.g., 22:00 to 02:00)
      if (currentTimeMinutes >= openMinutes || currentTimeMinutes < closeMinutes) {
        return { isOpen: true, statusText: `Aberto até ${slot.close}` };
      }
    }
  }

  // If we reached here, it's closed now. Find the next opening time.
  
  // 1. Check later today
  for (const slot of todaySlots) {
    const openMinutes = timeToMinutes(slot.open);
    if (openMinutes > currentTimeMinutes) {
      return { isOpen: false, statusText: `Abre hoje às ${slot.open}` };
    }
  }

  // 2. Check tomorrow or next day
  const days: DayOfWeek[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const currentDayIndex = days.indexOf(currentDayKey);

  for (let i = 1; i <= 7; i++) {
    const nextDayIndex = (currentDayIndex + i) % 7;
    const nextDayKey = days[nextDayIndex];
    const nextDaySlots = dbSchedule[nextDayKey] || [];

    if (nextDaySlots.length > 0) {
      const nextOpenTime = nextDaySlots[0].open;
      const nextDayName = i === 1 ? 'Amanhã' : nextDayKey.charAt(0).toUpperCase() + nextDayKey.slice(1);
      return { isOpen: false, statusText: `Abre ${nextDayName} às ${nextOpenTime}` };
    }
  }

  return { isOpen: false, statusText: 'Fechado permanentemente' };
};