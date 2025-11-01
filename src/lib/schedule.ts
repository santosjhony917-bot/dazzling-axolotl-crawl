import { WeekSchedule, DaySchedule, TimeSlot } from '@/types/schedule';
import { format } from 'date-fns';

interface OpenStatus {
  isOpen: boolean;
  statusText: string;
  nextOpenTime: string | null;
}

const dayNames: { [key: string]: string } = {
  monday: "Segunda",
  tuesday: "Terça",
  wednesday: "Quarta",
  thursday: "Quinta",
  friday: "Sexta",
  saturday: "Sábado",
  sunday: "Domingo",
};

export function getRestaurantOpenStatus(schedule: WeekSchedule | null): OpenStatus {
  if (!schedule) {
    return { isOpen: false, statusText: 'Horário indisponível', nextOpenTime: null };
  }

  const now = new Date();
  const currentDayIndex = now.getDay(); // 0 for Sunday, 1 for Monday, ..., 6 for Saturday
  const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  const currentDayName = daysOfWeek[currentDayIndex] as keyof WeekSchedule;

  const todaySchedule = schedule[currentDayName];

  // Check if open right now
  if (todaySchedule && todaySchedule.isOpen) {
    const currentTime = format(now, 'HH:mm');
    for (const slot of todaySchedule.slots) {
      if (currentTime >= slot.start && currentTime < slot.end) {
        return { isOpen: true, statusText: `Aberto até ${slot.end}`, nextOpenTime: null };
      }
    }
  }

  // If not open now, find the next opening time
  for (let i = 0; i < 7; i++) {
    const dayIndex = (currentDayIndex + i) % 7;
    const dayName = daysOfWeek[dayIndex] as keyof WeekSchedule;
    const daySchedule = schedule[dayName];

    if (daySchedule && daySchedule.isOpen && daySchedule.slots.length > 0) {
      const sortedSlots = [...daySchedule.slots].sort((a, b) => a.start.localeCompare(b.start));
      
      if (i === 0) { // Today
        const currentTime = format(now, 'HH:mm');
        for (const slot of sortedSlots) {
          if (currentTime < slot.start) {
            return { isOpen: false, statusText: 'Fechado', nextOpenTime: `Abre hoje às ${slot.start}` };
          }
        }
      } else { // Future day
        const dayLabel = i === 1 ? 'amanhã' : dayNames[dayName];
        return { isOpen: false, statusText: 'Fechado', nextOpenTime: `Abre ${dayLabel} às ${sortedSlots[0].start}` };
      }
    }
  }

  return { isOpen: false, statusText: 'Fechado', nextOpenTime: 'Consulte os horários' };
}