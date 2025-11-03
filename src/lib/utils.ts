import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Utility function to format opening hours for display
export function formatOpeningHours(openingHours: Record<string, string[]> | null | undefined): string[] {
  if (!openingHours) {
    return ["Horário não disponível"];
  }

  const daysOrder = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
  const dayNames: Record<string, string> = {
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
    const hours = openingHours[dayKey];
    const dayName = dayNames[dayKey];

    if (hours && hours.length > 0) {
      formattedHours.push(`${dayName}: ${hours.join(', ')}`);
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