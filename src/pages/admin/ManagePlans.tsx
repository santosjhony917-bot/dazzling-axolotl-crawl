import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Crown, DollarSign, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { showSuccess, showError } from '@/utils/toast';

const planSchema = z.object({
  restaurantId: z.string().min(1, "ID do Restaurante é obrigatório."),
  newPlan: z.enum(['free', 'basic', 'premium'], { message: "Plano inválido." }),
});

const ManagePlans: React.FC = () => {
  const form = useForm<z.infer<typeof planSchema>>({
    resolver: zodResolver(planSchema),
    defaultValues: {
      restaurantId: "",
      newPlan: "premium",
    },
  });

  const onSubmit = (data: z.infer<typeof planSchema>) => {
    // Simulação de atualização de plano
    console.log("Updating plan for:", data);
    showSuccess(`Plano do restaurante ${data.restaurantId} atualizado para ${data.newPlan}.`);
    form.reset();
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-soft-lg border-none rounded-xl bg-white">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-2xl text-[#022D68]">
            <Crown className="w-6 h-6" /> Gerenciar Planos
          </CardTitle>
          <CardDescription>Altere o plano de assinatura de qualquer restaurante.</CardDescription>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="restaurantId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ID do Restaurante</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: a1b2c3d4-..." {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="newPlan"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Novo Plano</FormLabel>
                    <FormControl>
                      <select
                        {...field}
                        className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        <option value="free">Free</option>
                        <option value="basic">Basic</option>
                        <option value="premium">Premium</option>
                      </select>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" disabled={form.formState.isSubmitting} className="bg-highlight hover:bg-highlight/90">
                {form.formState.isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Atualizar Plano'}
              </Button>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
};

export default ManagePlans;