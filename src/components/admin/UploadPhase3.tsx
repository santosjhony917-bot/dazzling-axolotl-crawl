import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { supabase } from '@/integrations/supabase/client';
import { Restaurant } from '@/types/supabase';
import { saveUploadRecord } from '@/utils/uploadHistory';
import { Loader2 } from 'lucide-react';

const UploadPhase3: React.FC = () => {
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
      phase: 3,
      successCount: 1200,
      details: `Upload de cardápios processado.`,
    });
  };

  return (
    <Card className="shadow-soft-lg border-none rounded-xl bg-white">
      <CardHeader>
        <CardTitle className="text-xl text-primary">Cardápios e Itens (Fase 3)</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600 mb-4">
          Faça o upload de um CSV contendo itens de menu, preços, descrições e links de imagem.
        </p>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="csvUrl"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>URL do Arquivo CSV</FormLabel>
                  <FormControl>
                    <Input placeholder="https://exemplo.com/data/fase3.csv" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={form.formState.isSubmitting} className="bg-highlight hover:bg-highlight/90">
              {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Processar Fase 3'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default UploadPhase3;