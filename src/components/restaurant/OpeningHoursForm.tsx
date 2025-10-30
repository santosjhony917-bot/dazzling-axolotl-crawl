import React, { useState, useEffect } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2, Save, Plus, Trash2 } from 'lucide-react';
import { Restaurant } from '@/types/supabase';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

// Definição dos dias da semana
const DAYS_OF_WEEK = [
  { id: 'sunday', name: 'Domingo' },
  { id: 'monday', name: 'Segunda-feira' },
  { id: 'tuesday', name: 'Terça-feira' },
  { id: 'wednesday', name: 'Quarta-feira' },
  { id: 'thursday', name: 'Quinta-feira' },
  { id: 'friday', name: 'Sexta-feira' },
  { id: 'saturday', name: 'Sábado' },
];

// Esquema para um único período de funcionamento
const PeriodSchema = z.object({
  open: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Formato HH:MM inválido.'),
  close: z.string().regex(/^([01]\d|2[0-3]):([0-5]\d)$/, 'Formato HH:MM inválido.'),
});

// Esquema para um dia da semana
const DaySchema = z.object({
  day: z.string(),
  is_open: z.boolean(),
  periods: z.array(PeriodSchema).optional(),
});

// Esquema principal
const OpeningHoursSchema = z.object({
  opening_hours: z.array(DaySchema),
});

type OpeningHoursFormData = z.infer<typeof OpeningHoursSchema>;

interface OpeningHoursFormProps {
  restaurant: Restaurant;
  refetch: () => void;
}

const OpeningHoursForm: React.FC<OpeningHoursFormProps> = ({ restaurant, refetch }) => {
  const [isSaving, setIsSaving] = useState(false);

  // Inicializa os horários de funcionamento com base nos dados do restaurante ou um padrão
  const initialHours = restaurant.opening_hours || DAYS_OF_WEEK.map(day => ({
    day: day.id,
    is_open: false,
    periods: [{ open: '09:00', close: '18:00' }],
  }));

  const form = useForm<OpeningHoursFormData>({
    resolver: zodResolver(OpeningHoursSchema),
    defaultValues: {
      opening_hours: initialHours,
    },
  });

  useEffect(() => {
    form.reset({
      opening_hours: restaurant.opening_hours || DAYS_OF_WEEK.map(day => ({
        day: day.id,
        is_open: false,
        periods: [{ open: '09:00', close: '18:00' }],
      })),
    });
  }, [restaurant, form]);

  const onSubmit = async (data: OpeningHoursFormData) => {
    setIsSaving(true);
    try {
      // Filtra períodos vazios ou inválidos antes de salvar
      const cleanedData = data.opening_hours.map(day => ({
        ...day,
        periods: day.is_open 
          ? day.periods?.filter(p => p.open && p.close) 
          : undefined, // Remove periods if not open
      }));

      const { error } = await supabase
        .from('restaurants')
        .update({ opening_hours: cleanedData })
        .eq('id', restaurant.id);

      if (error) throw error;

      showSuccess('Horário de funcionamento atualizado com sucesso!');
      refetch();
    } catch (error) {
      console.error('Erro ao salvar horários:', error);
      showError('Falha ao atualizar os horários. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  const { fields: daysFields } = useFieldArray({
    control: form.control,
    name: 'opening_hours',
  });

  const getDayName = (dayId: string) => DAYS_OF_WEEK.find(d => d.id === dayId)?.name || dayId;

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        {daysFields.map((dayField, dayIndex) => (
          <DayField 
            key={dayField.id} 
            dayIndex={dayIndex} 
            control={form.control} 
            dayId={dayField.day}
            dayName={getDayName(dayField.day)}
          />
        ))}

        <Button type="submit" disabled={isSaving} className="w-full bg-highlight hover:bg-highlight/90 rounded-xl mt-6">
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Salvar Horários
        </Button>
      </form>
    </Form>
  );
};

// Componente auxiliar para um único dia
interface DayFieldProps {
  dayIndex: number;
  control: any;
  dayId: string;
  dayName: string;
}

const DayField: React.FC<DayFieldProps> = ({ dayIndex, control, dayId, dayName }) => {
  const { fields: periodFields, append, remove } = useFieldArray({
    control,
    name: `opening_hours.${dayIndex}.periods`,
  });

  const is_open = control._getFormValues().opening_hours[dayIndex].is_open;

  const handleToggleOpen = (checked: boolean) => {
    control.setValue(`opening_hours.${dayIndex}.is_open`, checked);
    if (checked && periodFields.length === 0) {
      append({ open: '09:00', close: '18:00' });
    }
  };

  return (
    <div className="border p-4 rounded-xl space-y-3">
      <div className="flex items-center justify-between">
        <FormLabel className="font-bold text-base">{dayName}</FormLabel>
        <FormField
          control={control}
          name={`opening_hours.${dayIndex}.is_open`}
          render={({ field }) => (
            <FormItem className="flex flex-row items-center space-x-2 space-y-0">
              <FormControl>
                <Checkbox
                  checked={field.value}
                  onCheckedChange={handleToggleOpen}
                  className="h-5 w-5"
                />
              </FormControl>
              <FormLabel className="text-sm font-medium">Aberto</FormLabel>
            </FormItem>
          )}
        />
      </div>

      {is_open && (
        <div className="space-y-3 pt-2">
          {periodFields.map((periodField, periodIndex) => (
            <div key={periodField.id} className="flex items-end gap-2">
              <FormField
                control={control}
                name={`opening_hours.${dayIndex}.periods.${periodIndex}.open`}
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel className="text-xs">Abertura</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} className="rounded-xl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={control}
                name={`opening_hours.${dayIndex}.periods.${periodIndex}.close`}
                render={({ field }) => (
                  <FormItem className="flex-1">
                    <FormLabel className="text-xs">Fechamento</FormLabel>
                    <FormControl>
                      <Input type="time" {...field} className="rounded-xl" />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button 
                type="button" 
                variant="ghost" 
                size="icon" 
                onClick={() => remove(periodIndex)}
                className="h-9 w-9 mb-1 text-red-500 hover:bg-red-50"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button 
            type="button" 
            variant="outline" 
            size="sm" 
            onClick={() => append({ open: '09:00', close: '18:00' })}
            className="w-full border-dashed mt-2 rounded-xl"
          >
            <Plus className="h-4 w-4 mr-2" /> Adicionar Período
          </Button>
        </div>
      )}
    </div>
  );
};

export default OpeningHoursForm;