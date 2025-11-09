"use client";

import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Loader2, PlusCircle } from 'lucide-react';
import { useAuthData } from '@/context/AuthContext';

const createRestaurantSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  category: z.string().min(1, 'Categoria é obrigatória'),
  phone: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  cnpj: z.string().optional(),
});

type CreateRestaurantFormValues = z.infer<typeof createRestaurantSchema>;

interface CreateRestaurantFormProps {
  onSuccess: () => void;
  onCancel: () => void;
}

const CreateRestaurantForm: React.FC<CreateRestaurantFormProps> = ({ onSuccess, onCancel }) => {
  const { user } = useAuthData();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<CreateRestaurantFormValues>({
    resolver: zodResolver(createRestaurantSchema),
    defaultValues: {
      name: '',
      description: '',
      category: '',
      phone: '',
      email: '',
      cnpj: '',
    },
  });

  const onSubmit = async (values: CreateRestaurantFormValues) => {
    if (!user) {
      toast.error('Você precisa estar logado para criar um restaurante.');
      return;
    }

    setIsSubmitting(true);
    const { data, error } = await supabase
      .from('restaurants')
      .insert({
        ...values,
        user_id: user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating restaurant:', error);
      toast.error('Erro ao criar restaurante.');
    } else {
      toast.success('Restaurante criado com sucesso!');
      onSuccess();
    }
    setIsSubmitting(false);
  };

  const restaurantCategories = [
    'Brasileira', 'Italiana', 'Japonesa', 'Mexicana', 'Chinesa', 'Indiana', 'Francesa',
    'Portuguesa', 'Árabe', 'Vegetariana', 'Vegana', 'Fast Food', 'Pizzaria', 'Hamburgueria',
    'Confeitaria', 'Cafeteria', 'Bar', 'Outros'
  ];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-4 border rounded-lg shadow-sm bg-white dark:bg-gray-800">
        <h2 className="text-2xl font-bold mb-4">Criar Novo Restaurante</h2>
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nome do Restaurante</FormLabel>
              <FormControl>
                <Input placeholder="Nome do Restaurante" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição</FormLabel>
              <FormControl>
                <Textarea placeholder="Uma breve descrição do seu restaurante" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="category"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Categoria Principal</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Selecione uma categoria" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  {restaurantCategories.map((category) => (
                    <SelectItem key={category} value={category}>
                      {category}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
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
              <FormLabel>Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="email@exemplo.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <FormField
          control={form.control}
          name="cnpj"
          render={({ field }) => (
            <FormItem>
              <FormLabel>CNPJ</FormLabel>
              <FormControl>
                <Input placeholder="XX.XXX.XXX/XXXX-XX" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="flex justify-end space-x-2 mt-6">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <PlusCircle className="mr-2 h-4 w-4" />
            )}
            Criar Restaurante
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default CreateRestaurantForm;