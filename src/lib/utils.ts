import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Function to format the address into a summary string
export function formatAddressSummary(
  address: string | null | undefined, 
  number: string | null | undefined, 
  neighborhood: string | null | undefined, 
  city: string | null | undefined, 
  state: string | null | undefined
): string {
  const parts = [];
  if (address) parts.push(address);
  if (number) parts.push(`, ${number}`);
  if (neighborhood) parts.push(` - ${neighborhood}`);
  if (city) parts.push(`, ${city}`);
  if (state) parts.push(`/${state}`);
  
  return parts.join('');
}

// Function to format price to Brazilian Real (R$ X,XX)
export function formatPrice(price: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(price);
}