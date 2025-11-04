export type TimeSlot = {
  start: string; // Ex: "09:00"
  end: string;   // Ex: "18:00"
};

export type DaySchedule = {
  day: string; // Ex: "Segunda-feira", "Domingo"
  isActive: boolean;
  timeSlots: TimeSlot[];
};

export type WeekSchedule = DaySchedule[];