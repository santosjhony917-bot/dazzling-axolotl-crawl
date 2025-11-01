import { WeekSchedule, DaySchedule, TimeSlot } from '@/types/schedule';
import { format } from 'date-fns';

interface OpenStatus {
  isOpen: boolean;
  statusText: string;
  nextOpenTime: string | null;
}

export function getRestaurantOpenStatus(schedule: WeekSchedule | null): OpenStatus {
  if (!schedule) {
    return { isOpen: false, statusText: 'Horário não disponível', nextOpenTime: null };
  }

  const now = new Date();
  const currentDay = now.getDay(); // 0 for Sunday, 1 for Monday, ..., 6 for Saturday
  const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const currentDayName = daysOfWeek[currentDay] as keyof WeekSchedule;

  const todaySchedule = schedule[currentDayName];

  if (!todaySchedule || !todaySchedule.isOpen || todaySchedule.slots.length === 0) {
    // If closed today, try to find the next open day
    for (let i = 0; i < 7; i++) {
      const nextDayIndex = (currentDay + i) % 7;
      const nextDayName = daysOfWeek[nextDayIndex] as keyof WeekSchedule;
      const nextDaySchedule = schedule[nextDayName];

      if (nextDaySchedule && nextDaySchedule.isOpen && nextDaySchedule.slots.length > 0) {
        const firstSlot = nextDaySchedule.slots[0];
        const dayLabel = i === 0 ? 'hoje' : (i === 1 ? 'amanhã' : dayNames[nextDayName]);
        return { isOpen: false, statusText: 'Fechado', nextOpenTime: `Abre ${dayLabel} às ${firstSlot.start}` };
      }
    }
    return { isOpen: false, statusText: 'Fechado permanentemente', nextOpenTime: null };
  }

  const currentTime = format(now, 'HH:mm');

  for (const slot of todaySchedule.slots) {
    if (currentTime >= slot.start && currentTime <= slot.end) {
      return { isOpen: true, statusText: 'Aberto agora', nextOpenTime: null };
    }
  }

  // If not open now, but has future slots today
  for (const slot of todaySchedule.slots) {
    if (currentTime < slot.start) {
      return { isOpen: false, statusText: 'Fechado', nextOpenTime: `Abre hoje às ${slot.start}` };
    }
  }

  // If all slots for today have passed, find next open day
  for (let i = 1; i < 7; i++) { // Start from tomorrow
    const nextDayIndex = (currentDay + i) % 7;
    const nextDayName = daysOfWeek[nextDayIndex] as keyof WeekSchedule;
    const nextDaySchedule = schedule[nextDayName];

    if (nextDaySchedule && nextDaySchedule.isOpen && nextDaySchedule.slots.length > 0) {
      const firstSlot = nextDaySchedule.slots[0];
      const dayLabel = i === 1 ? 'amanhã' : dayNames[nextDayName];
      return { isOpen: false, statusText: 'Fechado', nextOpenTime: `Abre ${dayLabel} às ${firstSlot.start}` };
    }
  }

  return { isOpen: false, statusText: 'Fechado', nextOpenTime: null };
}

const dayNames: { [key: string]: string } = {
  monday: "Segunda-feira",
  tuesday: "Terça-feira",
  wednesday: "Quarta-feira",
  thursday: "Quinta-feira",
  friday: "Sexta-feira",
  saturday: "Sábado",
  sunday: "Domingo",
};