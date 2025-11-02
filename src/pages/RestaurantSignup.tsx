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
  confirmPassword: z.string().min(6, { message: "Confirmação de senha deve ter pelo menos 6 caracteres." }),
  restaurantName: z.string().min(1, { message: "Nome do restaurante é obrigatório." }),
  phone: z.string().min(10, { message: "Telefone é obrigatório." }),
}).refine((data) => data.password === data.confirmPassword, {
  message: "As senhas não coincidem.",
  path: ["confirmPassword"],
});

export default function RestaurantSignup() {
  const navigate = useNavigate();
  const { signIn } = useAuthData();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      email: "",
      password: "",
      confirmPassword: "",
      restaurantName: "",
      phone: "",
    },
  });

  async function onSubmit(values: z.infer<typeof formSchema>) {
    setIsLoading(true);
    try {
      const { data, error } = await base44.integrations.supabase.auth.signUp({
        email: values.email,
        password: values.password,
        options: {
          data: {
            user_role: 'restaurant',
            first_name: values.restaurantName, // Usando o nome do restaurante como first_name para o perfil inicial
            phone: values.phone,
          },
        },
      });

      if (error) {
        if (error.message.includes("User already registered")) {
          showError("Este e-mail já está em uso. Por favor, faça login na página de acesso do restaurante.");
          navigate(createPageUrl('restaurant-login'));
        } else {
          showError(error.message);
        }
        return;
      }

      if (data.user) {
        // Cria o restaurante após o signup do usuário
        const { error: restaurantError } = await base44.integrations.supabase.from('restaurants').insert({
          user_id: data.user.id,
          name: values.restaurantName,
          phone: values.phone,
          email: values.email,
          plan: 'free', // Plano inicial gratuito
        });

        if (restaurantError) {
          showError(`Erro ao criar restaurante: ${restaurantError.message}`);
          // Opcional: reverter o signup do usuário se a criação do restaurante falhar
          await base44.integrations.supabase.auth.admin.deleteUser(data.user.id);
          return;
        }

        await signIn(data.user); // Atualiza o contexto de autenticação
        showSuccess(`Restaurante cadastrado! Redirecionando para o painel.`);
        navigate(createPageUrl('restaurant-area-home')); // CORRIGIDO: Redireciona para o Dashboard
      }
    } catch (error: any) {
      console.error("Erro de cadastro:", error);
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
        <h1 className="flex-grow text-center text-xl font-semibold text-primary">Cadastro do Restaurante</h1>
        <div className="w-10"></div> {/* Placeholder para alinhar o título */}
      </header>

      <main className="flex-grow flex items-center justify-center p-4">
        <div className="w-full max-w-md bg-white p-6 rounded-lg shadow-lg">
          <h2 className="text-2xl font-bold text-center text-primary mb-6">Criar Conta</h2>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="restaurantName"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nome do Restaurante</FormLabel>
                    <FormControl>
                      <Input placeholder="Meu Restaurante Incrível" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="phone"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Telefone</FormLabel>
                    <FormControl>
                      <Input placeholder="(XX) XXXXX-XXXX" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
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
              <FormField
                control={form.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmar Senha</FormLabel>
                    <FormControl>
                      <Input type="password" placeholder="••••••••" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full bg-highlight hover:bg-highlight/90" disabled={isLoading}>
                {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Cadastrar
              </Button>
            </form>
          </Form>

          <div className="mt-6 text-center text-sm text-text-secondary">
            Já tem uma conta?{" "}
            <Link
              to={createPageUrl('restaurant-login')}
              className="font-bold text-highlight hover:underline"
            >
              Entrar
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}