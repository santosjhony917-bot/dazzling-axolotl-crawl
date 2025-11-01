export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';

export interface ScheduleEntry {
  open: string; // e.g., "09:00"
  close: string; // e.g., "18:00"
}

export interface DaySchedule {
  isOpen: boolean;
  slots: ScheduleEntry[];
}

// This is the structure stored in the DB (JSONB)
export type DBWeekSchedule = {
  [key in DayOfWeek]?: ScheduleEntry[];
};

// This is the structure used for display/logic after processing
export type WeekSchedule = {
  [key in DayOfWeek]?: DaySchedule;
};

export interface OpenStatus {
  isOpen: boolean;
  statusText: string;
}