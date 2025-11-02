import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { base44 } from '@/integrations/base44Client';
import { showError, showSuccess } from '@/utils/toast';
import { createPageUrl } from '@/utils/url';
import { Loader2, ChevronLeft } from 'lucide-react';
import { useAuthData } from '@/context/AuthContext';

const formSchema = z.object({
  restaurantId: z.string().uuid({ message: "ID do restaurante inválido." }),
});

export default function ClaimRestaurant() {
  const navigate = useNavigate();
  const { user, signIn } = useAuthData();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      restaurantId: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      if (!user) {
        showError("Usuário não autenticado.");
        navigate(createPageUrl('restaurant-login'));
        return;
      }

      // 1. Verificar se o restaurante existe e não tem user_id
      const { data: restaurant, error: fetchError } = await base44.integrations.supabase
        .from('restaurants')
        .select('id, user_id')
        .eq('id', values.restaurantId)
        .single();

      if (fetchError || !restaurant) {
        showError("Restaurante não encontrado ou ID inválido.");
        return;
      }

      if (restaurant.user_id) {
        showError("Este restaurante já está associado a outro usuário.");
        return;
      }

      // 2. Associar o restaurante ao usuário atual
      const { error: updateError } = await base44.integrations.supabase
        .from('restaurants')
        .update({ user_id: user.id })
        .eq('id', values.restaurantId);

      if (updateError) {
        showError(`Erro ao reivindicar restaurante: ${updateError.message}`);
        return;
      }

      // 3. Atualizar o perfil do usuário para 'restaurant' se ainda não for
      await base44.auth.updateMe({ user_role: 'restaurant' });
      await signIn(user); // Força a atualização do contexto de autenticação

      showSuccess("Restaurante reivindicado com sucesso! Redirecionando para o painel.");
      setTimeout(() => {
        navigate(createPageUrl('restaurant-area-home'));
      }, 1000);

    } catch (error: any) {
      console.error("Erro ao reivindicar restaurante:", error);
      showError(error.message || "Ocorreu um erro inesperado. Tente novamente.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 md:max-w-md md:mx-auto">
      <header className="flex items-center p-4 bg-white shadow-sm">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(createPageUrl('restaurant-area-hub'))}
          className="text-[#022D68] hover:bg-[#022D68]/5"
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <h1 className="flex-grow text-center text-xl font-semibold text-[#022D68]">Reivindicar Restaurante</h1>
        <div className="w-10"></div> {/* Placeholder para alinhar o título */}
      </header>

      <main className="flex-grow flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold text-center text-[#022D68] mb-6">Reivindicar Restaurante Existente</h2>
          <p className="text-center text-text-secondary mb-6">
            Se o seu restaurante já está listado no FilterFood, você pode reivindicá-lo aqui.
            Insira o ID do restaurante para associá-lo à sua conta.
          </p>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="restaurantId"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>ID do Restaurante</FormLabel>
                    <FormControl>
                      <Input placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full bg-highlight hover:bg-highlight/90" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Reivindicar
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center text-sm text-text-secondary">
            Não tem o ID do seu restaurante?{" "}
            <Link
                  to={createPageUrl('restaurant-login')}
                  className="font-bold text-[#E47948] hover:underline ml-1"
            >
              Entre em contato com o suporte
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}