import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Creates a URL path for a given page key, ensuring it starts with a slash.
 * @param pageKey The key or path segment for the page.
 * @returns The formatted URL path.
 */
export function createPageUrl(pageKey: string): string {
  if (pageKey.startsWith('/')) {
    return pageKey;
  }
  return `/${pageKey}`;
}

/**
 * Formats a number as currency (BRL).
 * @param amount The number to format.
 * @returns The formatted currency string.
 */
export function formatPrice(amount: number): string {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
  }).format(amount);
}