import { WeekSchedule, DaySchedule } from '@/types/schedule';

interface RawDaySchedule {
  day: string;
  open: string | null;
  close: string | null;
  is_open: boolean;
}

export const convertRawScheduleToWeekSchedule = (rawSchedule: RawDaySchedule[]): WeekSchedule => {
  const weekSchedule: Partial<WeekSchedule> = {};

  rawSchedule.forEach(dayData => {
    const dayKey = dayData.day.toLowerCase() as keyof WeekSchedule;
    weekSchedule[dayKey] = {
      isOpen: dayData.is_open,
      slots: dayData.is_open && dayData.open && dayData.close ? [{ start: dayData.open, end: dayData.close }] : [],
    };
  });

  // Ensure all days are present, even if empty
  const daysOfWeek: (keyof WeekSchedule)[] = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  daysOfWeek.forEach(day => {
    if (!weekSchedule[day]) {
      weekSchedule[day] = { isOpen: false, slots: [] };
    }
  });

  return weekSchedule as WeekSchedule;
};