import { WeekSchedule } from "@/types/supabase";
import { useState, useEffect } from "react";

interface UseRestaurantHoursResult {
  isOpen: boolean;
  statusText: string;
  statusColor: string;
}

const getDayName = (dayIndex: number): keyof WeekSchedule => {
  const days: (keyof WeekSchedule)[] = [
    "sunday",
    "monday",
    "tuesday",
    "wednesday",
    "thursday",
    "friday",
    "saturday",
  ];
  return days[dayIndex];
};

const checkOpenStatus = (schedule: WeekSchedule | null): UseRestaurantHoursResult => {
  if (!schedule) {
    return { isOpen: false, statusText: "Horário não definido", statusColor: "gray" };
  }

  const now = new Date();
  const currentDayIndex = now.getDay(); // 0 (Sunday) to 6 (Saturday)
  const currentDayKey = getDayName(currentDayIndex);
  const currentTime = now.getHours() * 60 + now.getMinutes(); // Minutes since midnight

  const todaySchedule = schedule[currentDayKey];

  if (!todaySchedule || todaySchedule.length === 0 || todaySchedule.every(s => s.is_closed)) {
    return { isOpen: false, statusText: "Fechado hoje", statusColor: "red" };
  }

  for (const slot of todaySchedule) {
    if (slot.is_closed) continue;

    try {
      const [openHour, openMinute] = slot.open.split(':').map(Number);
      const [closeHour, closeMinute] = slot.close.split(':').map(Number);

      const openTime = openHour * 60 + openMinute;
      let closeTime = closeHour * 60 + closeMinute;

      // Handle closing past midnight (e.g., 23:00 to 02:00)
      if (closeTime <= openTime) {
        closeTime += 24 * 60;
      }

      // Check if current time is within the slot (handling wrap-around for current time if needed)
      let checkTime = currentTime;
      if (checkTime < openTime && closeTime > 24 * 60) {
        // If we are checking early morning hours (e.g., 01:00) and the closing time is past midnight (e.g., 02:00),
        // we need to treat the current time as if it were on the previous day's schedule.
        // For simplicity in this hook, we assume the schedule is for the current day.
        // If the current time is less than open time, it's only open if the closing time is past midnight AND the current time is before the wrap-around close time.
        if (currentTime < closeHour * 60 + closeMinute) {
            // If current time is 01:00 and close time is 02:00, it's open.
            return { isOpen: true, statusText: "Aberto", statusColor: "green" };
        }
      }
      
      if (currentTime >= openTime && currentTime < closeTime) {
        return { isOpen: true, statusText: "Aberto", statusColor: "green" };
      }

    } catch (e) {
      console.error("Error parsing schedule slot:", slot, e);
      // Continue to next slot if parsing fails
    }
  }

  return { isOpen: false, statusText: "Fechado", statusColor: "red" };
};

export function useRestaurantHours(openingHours: WeekSchedule | null): UseRestaurantHoursResult {
  const [status, setStatus] = useState<UseRestaurantHoursResult>(() => checkOpenStatus(openingHours));

  useEffect(() => {
    // Recalculate status immediately
    setStatus(checkOpenStatus(openingHours));

    // Set up interval to check status every minute (or less frequently if preferred)
    const intervalId = setInterval(() => {
      setStatus(checkOpenStatus(openingHours));
    }, 60000); // Check every minute

    return () => clearInterval(intervalId);
  }, [openingHours]);

  return status;
}