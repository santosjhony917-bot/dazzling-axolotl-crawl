export type DaySchedule = {
  open: string; // e.g., "09:00"
  close: string; // e.g., "18:00"
  is_closed: boolean;
};

export type WeekSchedule = {
  monday: DaySchedule[];
  tuesday: DaySchedule[];
  wednesday: DaySchedule[];
  thursday: DaySchedule[];
  friday: DaySchedule[];
  saturday: DaySchedule[];
  sunday: DaySchedule[];
};