import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { toast } from 'sonner';

// Define types locally to resolve import errors
export interface DayHours {
  isOpen: boolean;
  open: string;
  close: string;
}

export interface OpeningHours {
  [key: string]: DayHours;
}

interface DayScheduleEditorProps {
  day: string;
  label: string;
  schedule: DayHours;
  onChange: (day: string, value: DayHours) => void;
}

function DayScheduleEditor({ day, label, schedule, onChange }: DayScheduleEditorProps) {
  const { isOpen, open, close } = schedule || { isOpen: false, open: '09:00', close: '18:00' };

  const handleToggle = (checked: boolean) => {
    onChange(day, { ...schedule, isOpen: checked });
  };

  const handleTimeChange = (field: 'open' | 'close', value: string) => {
    onChange(day, { ...schedule, [field]: value });
  };

  return (
    <div className="flex items-center justify-between p-3 rounded-lg bg-gray-50">
      <div className="flex items-center space-x-4">
        <Switch
          id={`switch-${day}`}
          checked={isOpen}
          onCheckedChange={handleToggle}
        />
        <label htmlFor={`switch-${day}`} className="font-medium text-gray-700 w-28">{label}</label>
      </div>
      {isOpen && (
        <div className="flex items-center space-x-2">
          <Input
            type="time"
            value={open}
            onChange={(e) => handleTimeChange('open', e.target.value)}
            className="w-28"
          />
          <span className="text-gray-500">-</span>
          <Input
            type="time"
            value={close}
            onChange={(e) => handleTimeChange('close', e.target.value)}
            className="w-28"
          />
        </div>
      )}
      {!isOpen && (
        <div className="text-gray-500 w-[calc(7rem*2+0.5rem+1rem)] text-center">Fechado</div>
      )}
    </div>
  );
}

interface EditHoursDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentSchedule: OpeningHours;
  onSave: (newSchedule: OpeningHours) => Promise<void>;
}

const daysOfWeek = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];
const dayLabels: { [key: string]: string } = {
  monday: "Segunda-feira",
  tuesday: "Terça-feira",
  wednesday: "Quarta-feira",
  thursday: "Quinta-feira",
  friday: "Sexta-feira",
  saturday: "Sábado",
  sunday: "Domingo",
};

export function EditHoursDialog({ open, onOpenChange, currentSchedule, onSave }: EditHoursDialogProps) {
  const [openingHours, setOpeningHours] = useState<OpeningHours>({});
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (currentSchedule) {
      setOpeningHours(currentSchedule);
    } else {
      const defaultHours: OpeningHours = {};
      daysOfWeek.forEach(day => {
        defaultHours[day] = { isOpen: false, open: "09:00", close: "18:00" };
      });
      setOpeningHours(defaultHours);
    }
  }, [currentSchedule]);

  const handleDayChange = (day: string, value: DayHours) => {
    setOpeningHours(prev => ({ ...prev, [day]: value }));
  };

  const handleSave = async () => {
    setIsLoading(true);
    try {
      await onSave(openingHours);
      toast.success("Horários de funcionamento atualizados com sucesso!");
      onOpenChange(false);
    } catch (error) {
      toast.error("Erro ao atualizar os horários. Tente novamente.");
      console.error(error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] rounded-xl max-h-[90vh] grid grid-rows-[auto_1fr_auto] p-0 shadow-soft-xl">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-xl font-bold text-primary">Horários de Funcionamento</DialogTitle>
          <DialogDescription>
            Defina os dias e horários que seu restaurante está aberto.
          </DialogDescription>
        </DialogHeader>
        
        <ScrollArea className="px-6 py-4">
          <div className="space-y-4">
            {daysOfWeek.map(day => (
              <DayScheduleEditor
                key={day}
                day={day}
                label={dayLabels[day]}
                schedule={openingHours[day]}
                onChange={handleDayChange}
              />
            ))}
          </div>
        </ScrollArea>

        <DialogFooter className="p-6 pt-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>Cancelar</Button>
          <Button onClick={handleSave} disabled={isLoading}>
            {isLoading ? "Salvando..." : "Salvar alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}