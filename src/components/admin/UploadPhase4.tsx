import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { supabase } from '@/integrations/supabase/client';
import { Restaurant } from '@/types/supabase';
import { WeekSchedule, DaySchedule, TimeSlot } from '@/types/schedule';
import { Loader2 } from 'lucide-react';
import { saveUploadRecord } from '@/utils/uploadHistory'; // Importando saveUploadRecord

const UploadPhase4: React.FC = () => {
  // Placeholder implementation
  const formSchema = z.object({
    csvUrl: z.string().url("URL inválida."),
  });

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      csvUrl: "",
    },
  });

  const onSubmit = (data: z.infer<typeof formSchema>) => {
    // Simulação de processamento
    form.setValue('csvUrl', '');
    saveUploadRecord({
      phase: 4,
      successCount: 30,
      details: `Upload de horários processado.`,
    });
  };

  return (
    <Card className="shadow-soft-lg border-none rounded-xl bg-white">
      <CardHeader>
        <CardTitle className="text-xl text-primary">Horários de Funcionamento (Fase 4)</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600 mb-4">
          Faça o upload de um CSV contendo os horários de funcionamento semanais.
        </p>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="csvUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL do Arquivo CSV</FormLabel>
                  <Input placeholder="https://exemplo.com/data/fase4.csv" {...field} />
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={form.formState.isSubmitting} className="bg-highlight hover:bg-highlight/90">
              {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Processar Fase 4'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default UploadPhase4;