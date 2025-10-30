import { WeekSchedule } from '@/types/schedule';

/**
 * Formats the opening hours schedule into a human-readable string.
 * @param schedule The weekly schedule object.
 * @returns A formatted string or null if no schedule is provided.
 */
export const formatOpeningHours = (schedule: WeekSchedule | null | undefined): string | null => {
  if (!schedule) return null;

  const daysOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  const dayNames: { [key: string]: string } = {
    monday: 'Segunda',
    tuesday: 'Terça',
    wednesday: 'Quarta',
    thursday: 'Quinta',
    friday: 'Sexta',
    saturday: 'Sábado',
    sunday: 'Domingo',
  };

  const activeDays = daysOrder.filter(day => schedule[day]?.is_open);

  if (activeDays.length === 0) {
    return 'Fechado permanentemente';
  }

  const formattedSegments: string[] = [];
  let currentSegment: { start: string, end: string, days: string[] } | null = null;

  for (let i = 0; i < daysOrder.length; i++) {
    const dayKey = daysOrder[i];
    const daySchedule = schedule[dayKey];

    if (daySchedule && daySchedule.is_open) {
      const timeString = `${daySchedule.open_time} - ${daySchedule.close_time}`;

      if (currentSegment && currentSegment.start === timeString) {
        currentSegment.days.push(dayNames[dayKey]);
      } else {
        if (currentSegment) {
          formattedSegments.push(formatSegment(currentSegment.days, currentSegment.start));
        }
        currentSegment = { start: timeString, end: timeString, days: [dayNames[dayKey]] };
      }
    } else {
      if (currentSegment) {
        formattedSegments.push(formatSegment(currentSegment.days, currentSegment.start));
        currentSegment = null;
      }
    }
  }

  if (currentSegment) {
    formattedSegments.push(formatSegment(currentSegment.days, currentSegment.start));
  }

  return formattedSegments.join('; ');
};

function formatSegment(days: string[], timeRange: string): string {
  if (days.length === 1) {
    return `${days[0]}: ${timeRange}`;
  }

  const firstDay = days[0];
  const lastDay = days[days.length - 1];

  // Check for consecutive days
  const daysOrder = ['Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado', 'Domingo'];
  const startIndex = daysOrder.indexOf(firstDay);
  const endIndex = daysOrder.indexOf(lastDay);

  let isConsecutive = true;
  for (let i = 1; i < days.length; i++) {
    if (daysOrder.indexOf(days[i]) !== startIndex + i) {
      isConsecutive = false;
      break;
    }
  }

  if (isConsecutive && days.length > 2) {
    return `${firstDay} a ${lastDay}: ${timeRange}`;
  } else {
    return `${days.join(', ')}: ${timeRange}`;
  }
}