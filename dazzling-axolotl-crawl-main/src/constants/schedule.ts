import { WeekSchedule } from '@/types/schedule';

export const DEFAULT_SCHEDULE: WeekSchedule = {
  monday: { isOpen: true, slots: [{ start: '09:00', end: '18:00' }] },
  tuesday: { isOpen: true, slots: [{ start: '09:00', end: '18:00' }] },
  wednesday: { isOpen: true, slots: [{ start: '09:00', end: '18:00' }] },
  thursday: { isOpen: true, slots: [{ start: '09:00', end: '18:00' }] },
  friday: { isOpen: true, slots: [{ start: '09:00', end: '18:00' }] },
  saturday: { isOpen: false, slots: [] },
  sunday: { isOpen: false, slots: [] },
};