import { WeekSchedule } from '@/types/schedule';

// Função auxiliar para formatar um slot de tempo (ex: 09:00)
const formatTime = (time: string): string => {
  const [hour, minute] = time.split(':');
  return `${hour}:${minute}`;
};

// Função principal para formatar o status de funcionamento
export const formatSchedule = (schedule: WeekSchedule | null | undefined) => {
  if (!schedule) {
    return {
      status: 'Horários não informados',
      nextOpenTime: null,
    };
  }

  const now = new Date();
  const currentDayIndex = now.getDay(); // 0 (Domingo) a 6 (Sábado)
  const daysOfWeek = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'] as const;
  const currentDayKey = daysOfWeek[currentDayIndex];
  
  const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();

  // 1. Checar se está aberto agora
  const currentDaySchedule = schedule[currentDayKey];
  let isOpenNow = false;
  let closingTime: string | null = null;

  if (currentDaySchedule?.isOpen) {
    for (const slot of currentDaySchedule.slots) {
      const [startHour, startMinute] = slot.start.split(':').map(Number);
      const [endHour, endMinute] = slot.end.split(':').map(Number);
      
      const startMinutes = startHour * 60 + startMinute;
      const endMinutes = endHour * 60 + endMinute;

      if (currentTimeMinutes >= startMinutes && currentTimeMinutes < endMinutes) {
        isOpenNow = true;
        closingTime = formatTime(slot.end);
        break;
      }
    }
  }

  if (isOpenNow && closingTime) {
    return {
      status: `Aberto agora. Fecha às ${closingTime}.`,
      nextOpenTime: null,
    };
  }

  // 2. Encontrar o próximo horário de abertura
  
  // Função para encontrar o próximo slot de abertura no dia atual
  const findNextSlotToday = (daySchedule: typeof currentDaySchedule) => {
    if (daySchedule?.isOpen) {
      for (const slot of daySchedule.slots) {
        const [startHour, startMinute] = slot.start.split(':').map(Number);
        const startMinutes = startHour * 60 + startMinute;
        
        if (startMinutes > currentTimeMinutes) {
          return { time: formatTime(slot.start), day: 'Hoje' };
        }
      }
    }
    return null;
  };

  let nextOpen = findNextSlotToday(currentDaySchedule);
  if (nextOpen) {
    return {
      status: 'Fechado agora.',
      nextOpenTime: `Abre ${nextOpen.day} às ${nextOpen.time}.`,
    };
  }

  // 3. Procurar nos próximos 7 dias
  for (let i = 1; i <= 7; i++) {
    const nextDayIndex = (currentDayIndex + i) % 7;
    const nextDayKey = daysOfWeek[nextDayIndex];
    const nextDaySchedule = schedule[nextDayKey];
    
    if (nextDaySchedule?.isOpen && nextDaySchedule.slots.length > 0) {
      const nextSlot = nextDaySchedule.slots[0];
      const dayLabel = i === 1 ? 'Amanhã' : nextDayKey.charAt(0).toUpperCase() + nextDayKey.slice(1); // Ex: Monday
      
      return {
        status: 'Fechado agora.',
        nextOpenTime: `Abre ${dayLabel} às ${formatTime(nextSlot.start)}.`,
      };
    }
  }

  // 4. Se nunca abre
  return {
    status: 'Fechado permanentemente ou horários indisponíveis.',
    nextOpenTime: null,
  };
};