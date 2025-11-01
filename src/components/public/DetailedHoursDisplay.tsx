"use client";

import { WeekSchedule, DaySchedule } from "@/types/supabase";
import React from "react";
import { Clock } from "lucide-react";
import { Card, CardContent } from "../ui/card";

interface DetailedHoursDisplayProps {
  schedule: WeekSchedule | null;
}

const dayNames: { [key: string]: string } = {
  monday: "Segunda-feira",
  tuesday: "Terça-feira",
  wednesday: "Quarta-feira",
  thursday: "Quinta-feira",
  friday: "Sexta-feira",
  saturday: "Sábado",
  sunday: "Domingo",
};

const formatTimeSlot = (slot: DaySchedule): string => {
  if (slot.is_closed) {
    return "Fechado";
  }
  return `${slot.open} - ${slot.close}`;
};

const DetailedHoursDisplay: React.FC<DetailedHoursDisplayProps> = ({ schedule }) => {
  if (!schedule) {
    return null;
  }

  const days = Object.keys(dayNames) as (keyof WeekSchedule)[];

  return (
    <Card className="mt-6 border-l-4 border-red-500">
      <CardContent className="p-4">
        <h3 className="flex items-center text-lg font-semibold text-gray-800 mb-3">
          <Clock className="w-5 h-5 mr-2 text-red-500" />
          Horário de Funcionamento
        </h3>
        <div className="space-y-1 text-sm">
          {days.map((dayKey) => {
            const daySchedule = schedule[dayKey];
            const isClosedAllDay = !daySchedule || daySchedule.every(s => s.is_closed);

            return (
              <div key={dayKey} className="flex justify-between">
                <span className="font-medium text-gray-700">{dayNames[dayKey]}</span>
                <span className={isClosedAllDay ? "text-red-500" : "text-gray-600"}>
                  {isClosedAllDay
                    ? "Fechado"
                    : daySchedule.map(formatTimeSlot).join(" / ")}
                </span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default DetailedHoursDisplay;