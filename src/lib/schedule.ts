import { WeekSchedule, DaySchedule } from '@/types/schedule'; // Importar WeekSchedule do novo arquivo

export function getRestaurantOpenStatus(openingHours: WeekSchedule | null): { isOpen: boolean; statusText: string } {
  if (!openingHours) {
    return { isOpen: false, statusText: 'Horário não informado' };
  }

  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 for Sunday, 1 for Monday, ..., 6 for Saturday
  const currentTime = now.getHours() * 60 + now.getMinutes(); // Current time in minutes

  const daysMap: { [key: number]: keyof WeekSchedule } = {
    0: 'sunday',
    1: 'monday',
    2: 'tuesday',
    3: 'wednesday',
    4: 'thursday',
    5: 'friday',
    6: 'saturday',
  };

  const currentDayKey = daysMap[dayOfWeek];
  const schedulesForToday: DaySchedule[] = openingHours[currentDayKey];

  if (!schedulesForToday || schedulesForToday.length === 0 || schedulesForToday.every(s => s.is_closed)) {
    return { isOpen: false, statusText: 'Fechado hoje' };
  }

  for (const schedule of schedulesForToday) {
    if (schedule.is_closed) continue;

    const [openHour, openMinute] = schedule.open.split(':').map(Number);
    const [closeHour, closeMinute] = schedule.close.split(':').map(Number);

    const openTime = openHour * 60 + openMinute;
    const closeTime = closeHour * 60 + closeMinute;

    // Handle overnight schedules (e.g., 22:00 - 02:00)
    if (openTime > closeTime) {
      // If current time is after open time OR before close time (next day)
      if (currentTime >= openTime || currentTime < closeTime) {
        return { isOpen: true, statusText: `Aberto até ${schedule.close}` };
      }
    } else {
      // Normal schedule
      if (currentTime >= openTime && currentTime < closeTime) {
        return { isOpen: true, statusText: `Aberto até ${schedule.close}` };
      }
    }
  }

  // Check for next opening time
  const nextOpen = findNextOpening(openingHours, now);
  if (nextOpen) {
    return { isOpen: false, statusText: `Fecha às ${schedulesForToday[schedulesForToday.length - 1].close}. Abre ${nextOpen.day} às ${nextOpen.time}` };
  }

  return { isOpen: false, statusText: 'Fechado agora' };
}

function findNextOpening(openingHours: WeekSchedule, fromDate: Date): { day: string; time: string } | null {
  const daysMap: { [key: number]: keyof WeekSchedule } = {
    0: 'domingo', 1: 'segunda', 2: 'terça', 3: 'quarta', 4: 'quinta', 5: 'sexta', 6: 'sábado',
  };

  for (let i = 0; i < 7; i++) {
    const checkDate = new Date(fromDate);
    checkDate.setDate(fromDate.getDate() + i);
    const dayOfWeek = checkDate.getDay();
    const dayKey = daysMap[dayOfWeek];
    const schedulesForDay: DaySchedule[] = openingHours[dayKey as keyof WeekSchedule];

    if (schedulesForDay && schedulesForDay.length > 0 && !schedulesForDay.every(s => s.is_closed)) {
      for (const schedule of schedulesForDay) {
        if (!schedule.is_closed) {
          return { day: daysMap[dayOfWeek], time: schedule.open };
        }
      }
    }
  }
  return null;
}