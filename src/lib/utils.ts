import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(amount);
}

export function formatAddressSummary(address: string | null, number: string | null, city: string | null, state: string | null): string {
  const parts = [];
  if (address) parts.push(address);
  if (number) parts.push(number);
  if (city) parts.push(city);
  if (state) parts.push(state);
  return parts.filter(Boolean).join(', ');
}