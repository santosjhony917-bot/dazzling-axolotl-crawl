import { useState, useEffect } from 'react';
import { WeekSchedule } from '@/types/schedule';
import { getRestaurantOpenStatus } from '@/lib/schedule';

interface RestaurantHoursStatus {
  isOpen: boolean;
  statusText: string;
  nextOpenTime: string | null;
}

export const useRestaurantHours = (schedule: WeekSchedule | null): RestaurantHoursStatus => {
  const [status, setStatus] = useState<RestaurantHoursStatus>(() =>
    getRestaurantOpenStatus(schedule)
  );

  useEffect(() => {
    const updateStatus = () => {
      setStatus(getRestaurantOpenStatus(schedule));
    };

    // Update status immediately and then every minute
    updateStatus();
    const intervalId = setInterval(updateStatus, 60 * 1000); // Every minute

    return () => clearInterval(intervalId);
  }, [schedule]);

  return status;
};