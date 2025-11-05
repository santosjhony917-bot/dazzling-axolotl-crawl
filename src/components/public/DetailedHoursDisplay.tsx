import React from 'react';
import { WeekSchedule } from '@/types/schedule';
import { Clock, XCircle, CheckCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

interface DetailedHoursDisplayProps {
  schedule: WeekSchedule;
}

const dayLabels: Record<keyof WeekSchedule, string> = {
  monday: 'Segunda-feira',
  tuesday: 'Terça-feira',
  wednesday: 'Quarta-feira',
  thursday: 'Quinta-feira',
  friday: 'Sexta-feira',
  saturday: 'Sábado',
  sunday: 'Domingo',
};

const daysOfWeek: (keyof WeekSchedule)[] = [
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'
];

const DetailedHoursDisplay: React.FC<DetailedHoursDisplayProps> = ({ schedule }) => {
  return (
    <Card className="bg-white dark:bg-gray-800 rounded-xl shadow-md border-none p-4">
      <h3 className="text-lg font-bold text-[#022D68] mb-4 flex items-center">
        <Clock className="w-5 h-5 mr-2 text-highlight" /> Horário de Funcionamento
      </h3>
      
      <div className="space-y-2">
        {daysOfWeek.map(day => {
          const daySchedule = schedule[day];
          const label = dayLabels[day];
          
          return (
            <div key={day} className="flex justify-between items-center border-b border-gray-100 dark:border-gray-700 pb-2 last:border-b-0">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{label}</span>
              
              {daySchedule?.isOpen ? (
                <div className="flex flex-col items-end">
                  {daySchedule.slots.map((slot, index) => (
                    <span key={index} className="text-sm font-bold text-green-600 dark:text-green-400">
                      {slot.start} - {slot.end}
                    </span>
                  ))}
                </div>
              ) : (
                <span className="text-sm font-medium text-red-600 dark:text-red-400 flex items-center">
                  <XCircle className="w-4 h-4 mr-1" /> Fechado
                </span>
              )}
            </div>
          );
        })}
      </div>
    </Card>
  );
  
};

export default DetailedHoursDisplay;