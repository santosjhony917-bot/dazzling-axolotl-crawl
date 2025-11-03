import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"
import { WeekSchedule, DaySchedule } from "@/types/schedule"; // Import WeekSchedule and DaySchedule

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Utility function to format opening hours for display
export function formatOpeningHours(openingHours: WeekSchedule | null | undefined): string[] {
  if (!openingHours) {
    return ["Horário não disponível"];
  }

  const daysOrder: Array<keyof WeekSchedule> = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  const dayNames: Record<keyof WeekSchedule, string> = {
    monday: "Segunda-feira",
    tuesday: "Terça-feira",
    wednesday: "Quarta-feira",
    thursday: "Quinta-feira",
    friday: "Sexta-feira",
    saturday: "Sábado",
    sunday: "Domingo",
  };

  const formattedHours: string[] = [];

  daysOrder.forEach(dayKey => {
    const daySchedule: DaySchedule = openingHours[dayKey];
    const dayName = dayNames[dayKey];

    if (daySchedule && daySchedule.isOpen && daySchedule.slots.length > 0) {
      const times = daySchedule.slots.map(slot => `${slot.start} - ${slot.end}`).join(', ');
      formattedHours.push(`${dayName}: ${times}`);
    } else {
      formattedHours.push(`${dayName}: Fechado`);
    }
  });

  return formattedHours;
}

// Utility function to format price
export function formatPrice(price: number | string): string {
  const numericPrice = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(numericPrice)) {
    return 'R$ --';
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(numericPrice);
}