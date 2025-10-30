// Define a slot for opening/closing time
export interface TimeSlot {
  start: string; // e.g., "08:00"
  end: string; // e.g., "18:00"
}

// DaySchedule is now an object containing status and an array of TimeSlot
export interface DaySchedule {
  isOpen: boolean;
  slots: TimeSlot[];
}

// WeekSchedule maps day names to DaySchedule
export interface WeekSchedule {
  monday: DaySchedule;
  tuesday: DaySchedule;
  wednesday: DaySchedule;
  thursday: DaySchedule;
  friday: DaySchedule;
  saturday: DaySchedule;
  sunday: DaySchedule;
}