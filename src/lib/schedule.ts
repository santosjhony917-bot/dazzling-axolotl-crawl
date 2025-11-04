import { WeekSchedule, DaySchedule, TimeSlot } from '@/types/schedule';

// Helper para obter o nome de exibição do dia atual
const getDayDisplayName = (date: Date): string => {
  const days = [
    'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
    'Quinta-feira', 'Sexta-feira', 'Sábado'
  ];
  return days[date.getDay()];
};

// Helper para formatar a hora (ex: "09:00")
const formatTime = (time: string): string => time;

export const getRestaurantStatus = (schedule: WeekSchedule): string => {
  const today = new Date();
  const currentDayDisplayName = getDayDisplayName(today);

  const daySchedule: DaySchedule | undefined = schedule.find(d => d.day === currentDayDisplayName);

  if (!daySchedule || !daySchedule.isActive || daySchedule.timeSlots.length === 0) {
    return 'Fechado hoje';
  }

  const now = today.getHours() * 60 + today.getMinutes(); // Hora atual em minutos

  let isOpenNow = false;
  let nextOpeningTime: string | null = null;

  for (const slot of daySchedule.timeSlots) {
    const [startHour, startMinute] = slot.start.split(':').map(Number);
    const [endHour, endMinute] = slot.end.split(':').map(Number);

    const startInMinutes = startHour * 60 + startMinute;
    const endInMinutes = endHour * 60 + endMinute;

    if (now >= startInMinutes && now < endInMinutes) {
      isOpenNow = true;
      break;
    } else if (now < startInMinutes && (nextOpeningTime === null || startInMinutes < (parseInt(nextOpeningTime.split(':')[0]) * 60 + parseInt(nextOpeningTime.split(':')[1])))) {
      nextOpeningTime = slot.start;
    }
  }

  if (isOpenNow) {
    const closingSlot = daySchedule.timeSlots.find(slot => {
      const [startHour, startMinute] = slot.start.split(':').map(Number);
      const [endHour, endMinute] = slot.end.split(':').map(Number);
      const startInMinutes = startHour * 60 + startMinute;
      const endInMinutes = endHour * 60 + endMinute;
      return now >= startInMinutes && now < endInMinutes;
    });
    if (closingSlot) {
      return `Aberto até ${formatTime(closingSlot.end)}`;
    }
  } else if (nextOpeningTime) {
    return `Abre às ${formatTime(nextOpeningTime)}`;
  }

  // Se não estiver aberto agora e não houver próximo horário de abertura hoje, verifica o próximo dia
  const daysOrder = [
    'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
    'Quinta-feira', 'Sexta-feira', 'Sábado'
  ];
  const currentDayIndex = daysOrder.indexOf(currentDayDisplayName);

  for (let i = 1; i <= 7; i++) {
    const nextDayIndex = (currentDayIndex + i) % 7;
    const nextDayDisplayName = daysOrder[nextDayIndex];
    const nextDaySchedule = schedule.find(d => d.day === nextDayDisplayName);

    if (nextDaySchedule && nextDaySchedule.isActive && nextDaySchedule.timeSlots.length > 0) {
      const sortedTimeSlots = nextDaySchedule.timeSlots.sort((a, b) => a.start.localeCompare(b.start));
      const firstSlot = sortedTimeSlots[0];
      if (firstSlot) {
        return `Abre ${nextDayDisplayName} às ${formatTime(firstSlot.start)}`;
      }
    }
  }

  return 'Fechado'; // Padrão se nenhuma agenda for encontrada ou todos os dias estiverem fechados
};

export const getOpeningHoursText = (schedule: WeekSchedule): string => {
  const today = new Date();
  const currentDayDisplayName = getDayDisplayName(today);
  const currentDaySchedule = schedule.find(d => d.day === currentDayDisplayName);

  // 1. Verificar se está aberto hoje
  if (currentDaySchedule?.isActive && currentDaySchedule.timeSlots.length > 0) {
    for (const slot of currentDaySchedule.timeSlots) {
      const [startHour, startMinute] = slot.start.split(':').map(Number);
      const [endHour, endMinute] = slot.end.split(':').map(Number);

      const now = today.getHours() * 60 + today.getMinutes();
      const startInMinutes = startHour * 60 + startMinute;
      const endInMinutes = endHour * 60 + endMinute;

      if (now >= startInMinutes && now < endInMinutes) {
        return `Aberto até ${formatTime(slot.end)}`;
      }
    }
  }

  // 2. Se não estiver aberto agora, encontrar o próximo horário de abertura
  const daysOrder = [
    'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
    'Quinta-feira', 'Sexta-feira', 'Sábado'
  ];
  const currentDayIndex = daysOrder.indexOf(currentDayDisplayName);

  for (let i = 0; i < 7; i++) {
    const dayIndex = (currentDayIndex + i) % 7;
    const dayDisplayName = daysOrder[dayIndex];
    const daySchedule = schedule.find(d => d.day === dayDisplayName);

    if (daySchedule?.isActive && daySchedule.timeSlots.length > 0) {
      // Ordena os timeSlots para encontrar o próximo
      const sortedTimeSlots = daySchedule.timeSlots.sort((a, b) => a.start.localeCompare(b.start));

      for (const slot of sortedTimeSlots) {
        const [startHour, startMinute] = slot.start.split(':').map(Number);
        const startInMinutes = startHour * 60 + startMinute;

        if (i === 0) { // Hoje
          const now = today.getHours() * 60 + today.getMinutes();
          if (startInMinutes > now) {
            return `Abre hoje às ${formatTime(slot.start)}`;
          }
        } else { // Próximos dias
          return `Abre ${dayDisplayName} às ${formatTime(slot.start)}`;
        }
      }
    }
  }

  return 'Fechado';
};