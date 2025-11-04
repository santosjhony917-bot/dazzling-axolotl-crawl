import { WeekSchedule, DaySchedule, TimeSlot } from '@/types/schedule';

// Helper para obter o nome de exibição do dia atual
const getDayDisplayName = (date: Date): string => {
  const days = [
    'Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira',
    'Quinta-feira', 'Sexta-feira', 'Sábado'
  ];
  return days[date.getDay()];
};

export const formatScheduleForDisplay = (schedule: WeekSchedule): string[] => {
  const displayLines: string[] = [];
  const daysOrder = [
    'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado', 'Domingo'
  ];

  const dayNames: Record<string, string> = {
    'Segunda-feira': 'Segunda',
    'Terça-feira': 'Terça',
    'Quarta-feira': 'Quarta',
    'Quinta-feira': 'Quinta',
    'Sexta-feira': 'Sexta',
    'Sábado': 'Sábado',
    'Domingo': 'Domingo',
  };

  for (const dayName of daysOrder) {
    const daySchedule = schedule.find(d => d.day === dayName);
    if (daySchedule && daySchedule.isActive) {
      const timeSlots = daySchedule.timeSlots.map(slot => `${slot.start} - ${slot.end}`).join(', ');
      displayLines.push(`${dayNames[dayName] || dayName}: ${timeSlots}`);
    } else {
      displayLines.push(`${dayNames[dayName] || dayName}: Fechado`);
    }
  }

  return displayLines;
};

export const getTodayOpeningHours = (schedule: WeekSchedule): string => {
  const today = new Date();
  const currentDayDisplayName = getDayDisplayName(today);
  const daySchedule = schedule.find(d => d.day === currentDayDisplayName);

  if (daySchedule && daySchedule.isActive && daySchedule.timeSlots.length > 0) {
    const timeSlots = daySchedule.timeSlots.map(slot => `${slot.start} - ${slot.end}`).join(', ');
    return `Hoje: ${timeSlots}`;
  }
  return 'Hoje: Fechado';
};