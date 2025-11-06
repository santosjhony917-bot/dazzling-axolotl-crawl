import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export const isRestaurantOpen = (schedule: any): boolean => {
  if (!schedule) return false;

  const now = new Date();
  const dayIndex = now.getDay();
  const dayName = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ][dayIndex];

  const todaySchedule = schedule[dayName];

  // Check today's schedule
  if (todaySchedule && todaySchedule.isOpen) {
    const openTime = new Date(now);
    const [openHour, openMinute] = todaySchedule.open.split(":").map(Number);
    openTime.setHours(openHour, openMinute, 0, 0);

    const closeTime = new Date(now);
    const [closeHour, closeMinute] = todaySchedule.close.split(":").map(Number);
    closeTime.setHours(closeHour, closeMinute, 0, 0);

    if (closeTime <= openTime) {
      // Overnight schedule
      if (now >= openTime) {
        return true;
      }
    } else {
      // Same-day schedule
      if (now >= openTime && now <= closeTime) {
        return true;
      }
    }
  }

  // Check yesterday's schedule for overnight closing
  const yesterdayIndex = (dayIndex - 1 + 7) % 7;
  const yesterdayName = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ][yesterdayIndex];
  const yesterdaySchedule = schedule[yesterdayName];

  if (yesterdaySchedule && yesterdaySchedule.isOpen) {
    const openTime = new Date(now);
    openTime.setDate(now.getDate() - 1);
    const [openHour, openMinute] = yesterdaySchedule.open.split(":").map(Number);
    openTime.setHours(openHour, openMinute, 0, 0);

    const closeTime = new Date(now);
    closeTime.setDate(now.getDate() - 1);
    const [closeHour, closeMinute] = yesterdaySchedule.close.split(":").map(Number);
    closeTime.setHours(closeHour, closeMinute, 0, 0);

    if (closeTime <= openTime) {
      // Overnight from yesterday
      closeTime.setDate(closeTime.getDate() + 1); // Move close time to today
      if (now <= closeTime) {
        return true;
      }
    }
  }

  return false;
};

export const formatPrice = (price: number | null | undefined): string => {
  if (price === null || price === undefined) {
    return "R$ 0,00";
  }
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(price);
};

export const formatAddressSummary = (restaurant: { city?: string | null, state?: string | null }): string => {
  if (!restaurant) return "";
  const { city, state } = restaurant;
  if (city && state) {
    return `${city}, ${state}`;
  }
  return city || state || "";
};