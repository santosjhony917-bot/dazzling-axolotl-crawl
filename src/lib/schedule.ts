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

/**
 * Retorna o status detalhado de abertura de um restaurante.
 * @param schedule A agenda semanal do restaurante.
 * @returns Um objeto com isOpen (booleano), statusText (string) e nextOpenTime (string | null).
 */
export const getRestaurantDetailedStatus = (schedule: WeekSchedule | null) => {
  if (!schedule || !Array.isArray(schedule)) { // Adicionado: Verifica se schedule é nulo ou não é um array
    return { isOpen: false, statusText: 'Fechado', nextOpenTime: null };
  }

  const today = new Date();
  const currentDayDisplayName = getDayDisplayName(today);
  const currentDaySchedule: DaySchedule | undefined = schedule.find(d => d.day === currentDayDisplayName);

  let isOpen = false;
  let statusText = 'Fechado';
  let nextOpenTime: string | null = null;

  const nowInMinutes = today.getHours() * 60 + today.getMinutes();

  if (currentDaySchedule && currentDaySchedule.isActive && currentDaySchedule.timeSlots.length > 0) {
    // Verifica se está aberto agora
    for (const slot of currentDaySchedule.timeSlots) {
      const [startHour, startMinute] = slot.start.split(':').map(Number);
      const [endHour, endMinute] = slot.end.split(':').map(Number);

      const startInMinutes = startHour * 60 + startMinute;
      const endInMinutes = endHour * 60 + endMinute;

      if (nowInMinutes >= startInMinutes && nowInMinutes < endInMinutes) {
        isOpen = true;
        statusText = `Aberto até ${formatTime(slot.end)}`;
        break;
      } else if (nowInMinutes < startInMinutes && (nextOpenTime === null || startInMinutes < (parseInt(nextOpenTime.split(':')[0]) * 60 + parseInt(nextOpenTime.split(':')[1])))) {
        nextOpenTime = slot.start;
      }
    }

    if (!isOpen && nextOpenTime) {
      statusText = `Abre hoje às ${formatTime(nextOpenTime)}`;
    }
  }

  if (!isOpen && !nextOpenTime) {
    // Se não estiver aberto hoje e não houver próximo horário de abertura hoje, verifica os próximos dias
    const daysOrder = [
      'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
      'Quinta-feira', 'Sexta-feira', 'Sábado'
    ];
    const currentDayIndex = daysOrder.indexOf(currentDayDisplayName);

    for (let i = 1; i <= 7; i++) { // Verifica até os próximos 7 dias
      const nextDayIndex = (currentDayIndex + i) % 7;
      const nextDayDisplayName = daysOrder[nextDayIndex];
      const nextDaySchedule = schedule.find(d => d.day === nextDayDisplayName);

      if (nextDaySchedule && nextDaySchedule.isActive && nextDaySchedule.timeSlots.length > 0) {
        const sortedTimeSlots = nextDaySchedule.timeSlots.sort((a, b) => a.start.localeCompare(b.start));
        const firstSlot = sortedTimeSlots[0];
        if (firstSlot) {
          statusText = `Abre ${nextDayDisplayName} às ${formatTime(firstSlot.start)}`;
          nextOpenTime = firstSlot.start; // Armazena o horário para nextOpenTime
          break;
        }
      }
    }
  }

  return { isOpen, statusText, nextOpenTime };
};

// As funções getRestaurantStatus e getOpeningHoursText foram removidas ou adaptadas em uma refatoração anterior.
// Se ainda forem necessárias em outras partes do código, elas devem ser reintroduzidas ou adaptadas.
// Para resolver o erro atual, estamos focando na substituição de 'getRestaurantOpenStatus'.