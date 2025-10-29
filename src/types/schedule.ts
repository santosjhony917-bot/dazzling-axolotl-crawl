export interface TimeSlot {
  start: string; // e.g., "08:00"
  end: string; // e.g., "18:00"
}

export interface DaySchedule {
  isOpen: boolean;
  slots: TimeSlot[];
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