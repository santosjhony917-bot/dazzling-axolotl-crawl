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
  email: z.string().email({ message: "E-mail inválido." }),
  password: z.string().min(6, { message: "A senha deve ter pelo menos 6 caracteres." }),
});

export default function RestaurantLogin() {
  const navigate = useNavigate();
  const { signIn } = useAuthData();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      const { data, error } = await base44.integrations.supabase.auth.signInWithPassword({
        email: values.email,
        password: values.password,
      });

      if (error) {
        showError(error.message);
        return;
      }

      if (data.user) {
        // Verifica se o usuário tem um restaurante associado
        const restaurant = await base44.restaurants.getRestaurantByUserId(data.user.id);
        if (restaurant) {
          await signIn(data.user); // Atualiza o contexto de autenticação
          showSuccess("Login realizado com sucesso!");
          // CORRIGIDO: Redirecionar para a rota do Dashboard do restaurante
          navigate(createPageUrl("restaurant-area-home"));
        } else {
          // Se não tiver restaurante, redireciona para a página de criação/claim
          showError("Você não tem um restaurante associado. Por favor, cadastre ou reivindique um.");
          navigate(createPageUrl('restaurant-area-hub'));
        }
      }
    } catch (error: any) {
      console.error("Erro de login:", error);
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
          className="text-primary hover:bg-primary/5"
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <h1 className="flex-grow text-center text-xl font-semibold text-primary">Acesso do Restaurante</h1>
        <div className="w-10"></div> {/* Placeholder para alinhar o título */}
      </header>

      <main className="flex-grow flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold text-center text-primary mb-6">Entrar</h2>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>E-mail</FormLabel>
                    <FormControl>
                      <Input placeholder="seu@email.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full bg-highlight hover:bg-highlight/90" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Entrar
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center text-sm text-text-secondary">
            Não tem uma conta?{" "}
            <Link
                  to={createPageUrl('restaurant-signup')}
                  className="font-bold text-highlight hover:underline ml-1"
            >
              Cadastre-se
            </Link>
          </div>
          <div className="mt-4 text-center text-sm text-text-secondary">
            <Link to={createPageUrl('forgotPassword')} className="hover:underline">
              Esqueceu sua senha?
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}