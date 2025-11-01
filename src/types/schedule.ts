export type TimeSlot = {
  start: string; // e.g., "08:00"
  end: string; // e.g., "18:00"
};

export type DaySchedule = {
  isOpen: boolean;
  slots: TimeSlot[];
};

export type WeekSchedule = {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
};