import React from 'react';
import { WeekSchedule } from '@/types/schedule';
import { Button } from '@/components/ui/button';

interface ScheduleEditorProps {
  initialSchedule: WeekSchedule;
  onSave: (schedule: WeekSchedule) => void;
  onCancel: () => void;
}

const ScheduleEditor: React.FC<ScheduleEditorProps> = ({ initialSchedule, onSave, onCancel }) => {
  // Placeholder implementation
  const handleSave = () => {
    // Simulating saving the initial schedule
    onSave(initialSchedule);
  };

  return (
    <div className="space-y-4 p-4 border rounded-lg">
      <p className="text-sm text-gray-600">Editor de horários em desenvolvimento. Usando horários padrão.</p>
      <div className="flex justify-end gap-2">
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="button" onClick={handleSave}>Salvar Horário</Button>
      </div>
    </div>
  );
};

export default ScheduleEditor;