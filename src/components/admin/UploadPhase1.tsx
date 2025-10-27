import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { saveUploadRecord } from '@/utils/uploadHistory'; // NOVO IMPORT
import { Restaurant } from '@/types/supabase'; // Importando o tipo Restaurant
import { Loader2 } from 'lucide-react';

const UploadPhase1: React.FC = () => {
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
      phase: 1,
      successCount: 50,
      details: `Upload de ${data.csvUrl} processado.`,
    });
  };

  return (
    <Card className="shadow-soft-lg border-none rounded-xl bg-white">
      <CardHeader>
        <CardTitle className="text-xl text-primary">Informações Gerais (Fase 1)</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600 mb-4">
          Faça o upload de um CSV contendo o nome, categoria, e-mail e telefone dos restaurantes.
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
                    <Input placeholder="https://exemplo.com/data/fase1.csv" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={form.formState.isSubmitting} className="bg-highlight hover:bg-highlight/90">
              {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Processar Fase 1'}
            </Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default UploadPhase1;