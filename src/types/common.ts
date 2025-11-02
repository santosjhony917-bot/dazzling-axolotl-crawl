export type DaySchedule = {
  open: string;
  close: string;
};

export type WeekSchedule = {
  monday?: DaySchedule;
  tuesday?: DaySchedule;
  wednesday?: DaySchedule;
  thursday?: DaySchedule;
  friday?: DaySchedule;
  saturday?: DaySchedule;
  sunday?: DaySchedule;
  [key: string]: DaySchedule | undefined; // Adiciona assinatura de índice para compatibilidade com Json
};