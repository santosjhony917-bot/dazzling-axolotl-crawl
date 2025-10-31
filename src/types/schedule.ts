export interface DaySchedule {
  open: string | null; // HH:MM
  close: string | null; // HH:MM
  isClosed: boolean;
}

export interface WeekSchedule {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}

export interface OpeningHoursDisplayProps {
  openingHours: WeekSchedule;
}