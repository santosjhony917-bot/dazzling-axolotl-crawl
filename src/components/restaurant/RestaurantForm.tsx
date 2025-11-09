"use client";

import React, { useState, useEffect } from 'react';
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
import { Loader2, Save } from 'lucide-react';

const restaurantSchema = z.object({
  name: z.string().min(1, 'Nome é obrigatório'),
  description: z.string().optional(),
  category: z.string().min(1, 'Categoria é obrigatória'),
  phone: z.string().optional(),
  email: z.string().email('Email inválido').optional().or(z.literal('')),
  cnpj: z.string().optional(),
  whatsapp_url: z.string().url('URL do WhatsApp inválida').optional().or(z.literal('')),
  ifood_url: z.string().url('URL do iFood inválida').optional().or(z.literal('')),
  other_url: z.string().url('URL inválida').optional().or(z.literal('')),
  other_url_label: z.string().optional(),
  address: z.string().optional(),
  number: z.string().optional(),
  neighborhood: z.string().optional(),
  city: z.string().optional(),
  state: z.string().optional(),
  cep: z.string().optional(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
});

type RestaurantFormValues = z.infer<typeof restaurantSchema>;

interface RestaurantFormProps {
  restaurant: any; // TODO: Use a more specific type for restaurant
  onUpdate: () => void;
}

const RestaurantForm: React.FC<RestaurantFormProps> = ({ restaurant, onUpdate }) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<RestaurantFormValues>({
    resolver: zodResolver(restaurantSchema),
    defaultValues: {
      name: restaurant.name || '',
      description: restaurant.description || '',
      category: restaurant.category || '',
      phone: restaurant.phone || '',
      email: restaurant.email || '',
      cnpj: restaurant.cnpj || '',
      whatsapp_url: restaurant.whatsapp_url || '',
      ifood_url: restaurant.ifood_url || '',
      other_url: restaurant.other_url || '',
      other_url_label: restaurant.other_url_label || '',
      address: restaurant.address || '',
      number: restaurant.number || '',
      neighborhood: restaurant.neighborhood || '',
      city: restaurant.city || '',
      state: restaurant.state || '',
      cep: restaurant.cep || '',
      latitude: restaurant.latitude || null,
      longitude: restaurant.longitude || null,
    },
  });

  useEffect(() => {
    form.reset({
      name: restaurant.name || '',
      description: restaurant.description || '',
      category: restaurant.category || '',
      phone: restaurant.phone || '',
      email: restaurant.email || '',
      cnpj: restaurant.cnpj || '',
      whatsapp_url: restaurant.whatsapp_url || '',
      ifood_url: restaurant.ifood_url || '',
      other_url: restaurant.other_url || '',
      other_url_label: restaurant.other_url_label || '',
      address: restaurant.address || '',
      number: restaurant.number || '',
      neighborhood: restaurant.neighborhood || '',
      city: restaurant.city || '',
      state: restaurant.state || '',
      cep: restaurant.cep || '',
      latitude: restaurant.latitude || null,
      longitude: restaurant.longitude || null,
    });
  }, [restaurant, form]);

  const onSubmit = async (values: RestaurantFormValues) => {
    setIsSubmitting(true);
    const { error } = await supabase
      .from('restaurants')
      .update(values)
      .eq('id', restaurant.id);

    if (error) {
      console.error('Error updating restaurant:', error);
      toast.error('Erro ao atualizar informações do restaurante.');
    } else {
      toast.success('Informações do restaurante atualizadas com sucesso!');
      onUpdate();
    }
    setIsSubmitting(false);
  };

  const restaurantCategories = [
    'Brasileira', 'Italiana', 'Japonesa', 'Mexicana', 'Chinesa', 'Indiana', 'Francesa',
    'Portuguesa', 'Árabe', 'Vegetariana', 'Vegana', 'Fast Food', 'Pizzaria', 'Hamburgueria',
    'Confeitaria', 'Cafeteria', 'Bar', 'Outros'
  ];

  const brazilianStates = [
    'AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA',
    'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'
  ];

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6 p-4 border rounded-lg shadow-sm bg-white dark:bg-gray-800">
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
        </div>
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
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="whatsapp_url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>URL WhatsApp</FormLabel>
                <FormControl>
                  <Input placeholder="https://wa.me/seunumerotelefone" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="ifood_url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>URL iFood</FormLabel>
                <FormControl>
                  <Input placeholder="https://www.ifood.com.br/delivery/seu-restaurante" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="other_url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Outra URL</FormLabel>
                <FormControl>
                  <Input placeholder="https://seusite.com" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="other_url_label"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Rótulo da Outra URL</FormLabel>
                <FormControl>
                  <Input placeholder="Ex: Nosso Site, Cardápio Online" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <h3 className="text-lg font-semibold mt-6">Endereço</h3>
        <FormField
          control={form.control}
          name="cep"
          render={({ field }) => (
            <FormItem>
              <FormLabel>CEP</FormLabel>
              <FormControl>
                <Input placeholder="XXXXX-XXX" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="address"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Endereço</FormLabel>
                <FormControl>
                  <Input placeholder="Rua, Avenida, etc." {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Número</FormLabel>
                <FormControl>
                  <Input placeholder="123" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <FormField
          control={form.control}
          name="neighborhood"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Bairro</FormLabel>
              <FormControl>
                <Input placeholder="Seu Bairro" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cidade</FormLabel>
                <FormControl>
                  <Input placeholder="Sua Cidade" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="state"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Estado</FormLabel>
                <Select onValueChange={field.onChange} defaultValue={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione um estado" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {brazilianStates.map((state) => (
                      <SelectItem key={state} value={state}>
                        {state}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="latitude"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Latitude</FormLabel>
                <FormControl>
                  <Input type="number" step="any" placeholder="-23.5505" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || null)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="longitude"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Longitude</FormLabel>
                <FormControl>
                  <Input type="number" step="any" placeholder="-46.6333" {...field} onChange={e => field.onChange(parseFloat(e.target.value) || null)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" className="w-full" disabled={isSubmitting}>
          {isSubmitting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Salvar Alterações
        </Button>
      </form>
    </Form>
  );
};

export default RestaurantForm;