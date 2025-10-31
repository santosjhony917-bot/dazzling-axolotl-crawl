import { OpeningHours, WeekSchedule, DaySchedule } from '@/types/schedule';

// Helper function to convert DB format (array) to UI/Logic format (object)
export const convertOpeningHoursToWeekSchedule = (hours: OpeningHours[] | null): WeekSchedule => {
  const defaultDay: DaySchedule = { open: null, close: null, isClosed: true };
  
  const schedule: WeekSchedule = {
    sunday: { ...defaultDay },
    monday: { ...defaultDay },
    tuesday: { ...defaultDay },
    wednesday: { ...defaultDay },
    thursday: { ...defaultDay },
    friday: { ...defaultDay },
    saturday: { ...defaultDay },
  };

  if (!hours) {
    return schedule;
  }

  const dayMap: { [key: number]: keyof WeekSchedule } = {
    0: 'sunday',
    1: 'monday',
    2: 'tuesday',
    3: 'wednesday',
    4: 'thursday',
    5: 'friday',
    6: 'saturday',
  };

  hours.forEach(item => {
    const dayName = dayMap[item.day];
    if (dayName) {
      schedule[dayName] = {
        open: item.open,
        close: item.close,
        isClosed: false,
      };
    }
  });

  return schedule;
};

// Função para calcular o status de abertura (assumindo que recebe WeekSchedule)
export const getRestaurantOpenStatus = (schedule: WeekSchedule | null): { isOpen: boolean; statusText: string } => {
  if (!schedule) {
    return { isOpen: false, statusText: 'Horário não informado' };
  }

  const now = new Date();
  const currentDayIndex = now.getDay(); // 0 (Sunday) to 6 (Saturday)
  const dayMap: { [key: number]: keyof WeekSchedule } = {
    0: 'sunday',
    1: 'monday',
    2: 'tuesday',
    3: 'wednesday',
    4: 'thursday',
    5: 'friday',
    6: 'saturday',
  };
  
  const currentDayName = dayMap[currentDayIndex];
  const todaySchedule = schedule[currentDayName];

  if (todaySchedule.isClosed || !todaySchedule.open || !todaySchedule.close) {
    return { isOpen: false, statusText: 'Fechado hoje' };
  }

  const [openHour, openMinute] = todaySchedule.open.split(':').map(Number);
  const [closeHour, closeMinute] = todaySchedule.close.split(':').map(Number);

  const openTime = new Date(now);
  openTime.setHours(openHour, openMinute, 0, 0);

  const closeTime = new Date(now);
  closeTime.setHours(closeHour, closeMinute, 0, 0);

  // Handle closing past midnight (e.g., 23:00 to 02:00)
  if (closeTime < openTime) {
    closeTime.setDate(closeTime.getDate() + 1);
  }

  const currentTime = now.getTime();
  
  if (currentTime >= openTime.getTime() && currentTime <= closeTime.getTime()) {
    return { isOpen: true, statusText: 'Aberto agora' };
  } else if (currentTime < openTime.getTime()) {
    return { isOpen: false, statusText: `Abre às ${todaySchedule.open}` };
  } else {
    return { isOpen: false, statusText: 'Fechado' };
  }
};