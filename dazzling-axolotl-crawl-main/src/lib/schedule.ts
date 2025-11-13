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

interface OpenStatus {
  isOpen: boolean;
  statusText: string;
  nextOpenTime: string | null;
}

/**
 * Calcula o status de abertura do restaurante em tempo real.
 */
export const getRestaurantOpenStatus = (schedule: WeekSchedule | null): OpenStatus => {
  if (!schedule) {
    return { isOpen: false, statusText: 'Horário não definido', nextOpenTime: null };
  }

  const now = new Date();
  const currentDayKey = getCurrentDayName(now);
  const currentDaySchedule = schedule[currentDayKey];
  
  const currentTimeMinutes = now.getHours() * 60 + now.getMinutes();

  // 1. Verificar se está aberto hoje
  if (currentDaySchedule?.isOpen && currentDaySchedule.slots.length > 0) {
    for (const slot of currentDaySchedule.slots) {
      const [startHour, startMinute] = slot.start.split(':').map(Number);
      const [endHour, endMinute] = slot.end.split(':').map(Number);
      
      const startMinutes = startHour * 60 + startMinute;
      const endMinutes = endHour * 60 + endMinute;

      // Lógica simples: verifica se o tempo atual está dentro de um slot
      if (currentTimeMinutes >= startMinutes && currentTimeMinutes < endMinutes) {
        return { 
          isOpen: true, 
          statusText: `Aberto agora até ${slot.end}`, 
          nextOpenTime: null 
        };
      }
    }
  }
  
  // 2. Se não estiver aberto agora, encontrar o próximo horário de abertura
  const daysOrder: (keyof WeekSchedule)[] = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  
  for (let i = 0; i < 7; i++) {
    const dayIndex = (now.getDay() + i) % 7;
    const dayKey = daysOrder[dayIndex];
    const daySchedule = schedule[dayKey];
    
    if (daySchedule?.isOpen && daySchedule.slots.length > 0) {
      // Ordena os slots para encontrar o próximo
      const sortedSlots = daySchedule.slots.sort((a, b) => a.start.localeCompare(b.start));
      
      for (const slot of sortedSlots) {
        const [startHour, startMinute] = slot.start.split(':').map(Number);
        const startMinutes = startHour * 60 + startMinute;
        
        // Se for hoje, e o slot ainda não passou
        if (i === 0 && startMinutes > currentTimeMinutes) {
          return { 
            isOpen: false, 
            statusText: 'Fechado', 
            nextOpenTime: `Abre hoje às ${slot.start}` 
          };
        } 
        // Se for um dia futuro
        else if (i > 0) {
          const dayLabel = dayLabels[dayKey];
          return { 
            isOpen: false, 
            statusText: 'Fechado', 
            nextOpenTime: `Abre ${dayLabel} às ${slot.start}` 
          };
        }
      }
    }
  }

  return { isOpen: false, statusText: 'Fechado', nextOpenTime: 'Sem horário de abertura futuro' };
};

const dayLabels: Record<keyof WeekSchedule, string> = {
  monday: 'Segunda',
  tuesday: 'Terça',
  wednesday: 'Quarta',
  thursday: 'Quinta',
  friday: 'Sexta',
  saturday: 'Sábado',
  sunday: 'Domingo',
};