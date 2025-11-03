import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Helper function to format opening hours
export function formatOpeningHours(openingHours: any): string {
  if (!openingHours) {
    return "Horário de funcionamento não disponível.";
  }

  const daysOfWeek = [
    "Domingo", "Segunda-feira", "Terça-feira", "Quarta-feira",
    "Quinta-feira", "Sexta-feira", "Sábado"
  ];

  let formattedHours = "";
  for (const day of daysOfWeek) {
    const dayKey = day.toLowerCase().replace('-', '_'); // e.g., "segunda_feira"
    if (openingHours[dayKey] && openingHours[dayKey].open && openingHours[dayKey].close) {
      formattedHours += `${day}: ${openingHours[dayKey].open} - ${openingHours[dayKey].close}\n`;
    } else {
      formattedHours += `${day}: Fechado\n`;
    }
  }
  return formattedHours.trim();
}

// Helper function to format price
export function formatPrice(price: number | string): string {
  const numericPrice = typeof price === 'string' ? parseFloat(price) : price;
  if (isNaN(numericPrice)) {
    return 'N/A';
  }
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(numericPrice);
}