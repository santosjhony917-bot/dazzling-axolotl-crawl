export interface TimeSlot {
  start: string; // HH:MM
  end: string; // HH:MM
}

export interface DaySchedule {
  isOpen: boolean; // Indica se o restaurante está aberto neste dia
  slots: TimeSlot[]; // Pode ter múltiplos horários de abertura/fechamento
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

// Este é o formato usado no banco de dados (JSONB array)
export interface OpeningHours {
  day: number; // 0 (Sunday) to 6 (Saturday)
  open: string; // HH:MM
  close: string; // HH:MM
}