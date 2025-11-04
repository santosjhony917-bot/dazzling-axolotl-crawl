import { WeekSchedule } from '@/types/schedule';

export const DEFAULT_SCHEDULE: WeekSchedule = [
  { day: 'Segunda-feira', isActive: true, timeSlots: [{ start: '09:00', end: '18:00' }] },
  { day: 'Terça-feira', isActive: true, timeSlots: [{ start: '09:00', end: '18:00' }] },
  { day: 'Quarta-feira', isActive: true, timeSlots: [{ start: '09:00', end: '18:00' }] },
  { day: 'Quinta-feira', isActive: true, timeSlots: [{ start: '09:00', end: '18:00' }] },
  { day: 'Sexta-feira', isActive: true, timeSlots: [{ start: '09:00', end: '18:00' }] },
  { day: 'Sábado', isActive: false, timeSlots: [{ start: '09:00', end: '18:00' }] },
  { day: 'Domingo', isActive: false, timeSlots: [{ start: '09:00', end: '18:00' }] },
];