// Define a slot for opening/closing time
export interface TimeSlot {
  open_time: string; // e.g., "08:00"
  close_time: string; // e.g., "18:00"
  is_closed: boolean;
}

// DaySchedule is an array of TimeSlot, allowing for split shifts (e.g., lunch and dinner)
export type DaySchedule = TimeSlot[];

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