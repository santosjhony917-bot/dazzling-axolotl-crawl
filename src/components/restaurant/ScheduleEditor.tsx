"use client";

import React, { useState, useEffect } from 'react';
import { WeekSchedule } from '@/types/schedule';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Loader2 } from 'lucide-react';

interface ScheduleEditorProps {
  isOpen: boolean;
  onClose: () => void;
  initialSchedule: WeekSchedule;
  onSave: (schedule: WeekSchedule) => void;
  isLoading: boolean;
}

const ScheduleEditor: React.FC<ScheduleEditorProps> = ({ isOpen, onClose, initialSchedule, onSave, isLoading }) => {
  const [currentSchedule, setCurrentSchedule] = useState<WeekSchedule>(initialSchedule);

  useEffect(() => {
    if (isOpen) {
      setCurrentSchedule(initialSchedule);
    }
  }, [isOpen, initialSchedule]);

  const handleSave = () => {
    onSave(currentSchedule);
  };

  const handleCancel = () => {
    if (!isLoading) {
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleCancel}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Editar Horário de Funcionamento</DialogTitle>
          <DialogDescription>
            Defina os horários de abertura e fechamento para cada dia da semana.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-4">
          <p className="text-sm text-gray-600">Editor de horários em desenvolvimento. Usando horários padrão.</p>
          {/* Placeholder para a lógica real de edição de horários */}
          {/* Por enquanto, apenas exibe o horário inicial */}
          <div className="border p-3 rounded-md bg-gray-50">
            <h4 className="font-semibold">Horário Atual (Placeholder):</h4>
            <pre className="text-xs overflow-auto">{JSON.stringify(initialSchedule, null, 2)}</pre>
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleCancel} disabled={isLoading}>
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave} disabled={isLoading}>
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Salvar Horário
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ScheduleEditor;