"use client";

import React from 'react';
import PageHelmet from '@/components/PageHelmet';
import { useParams, useNavigate } from 'react-router-dom';
import { useRestaurant } from '@/hooks/useRestaurant';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { Skeleton } from '@/components/ui/skeleton';
import { PageHeader } from '@/components/PageHeader';
import { ImageUploadButton } from '@/components/ImageUploadButton';
import { RESTAURANT_IMAGES_BUCKET } from '@/integrations/supabase/storage';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { restaurantCategories } from '@/config/restaurant-categories';

const basicInfoSchema = z.object({
  name: z.string().min(2, 'O nome deve ter pelo menos 2 caracteres.'),
  category: z.string().min(1, 'A categoria é obrigatória.'),
  image_url: z.string().optional(),
});

const EditBasicInfoPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { restaurant, isLoading, mutate } = useRestaurant(id);

  const form = useForm<z.infer<typeof basicInfoSchema>>({
    resolver: zodResolver(basicInfoSchema),
    defaultValues: {
      name: '',
      category: '',
      image_url: '',
    },
  });

  React.useEffect(() => {
    if (restaurant) {
      form.reset({
        name: restaurant.name || '',
        category: restaurant.category || '',
        image_url: restaurant.image_url || '',
      });
    }
  }, [restaurant, form]);

  const onSubmit = async (values: z.infer<typeof basicInfoSchema>) => {
    if (!id) return;
    try {
      const { error } = await supabase
        .from('restaurants')
        .update({
          name: values.name,
          category: values.category,
          image_url: values.image_url,
        })
        .eq('id', id);

      if (error) throw error;

      toast.success('Informações atualizadas com sucesso!');
      mutate();
      navigate(`/restaurant/${id}/settings`);
    } catch (error) {
      console.error('Erro ao atualizar informações:', error);
      toast.error('Não foi possível atualizar as informações.');
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Skeleton className="h-8 w-1/2 mb-4" />
        <Skeleton className="h-32 w-32 rounded-full mx-auto mb-6" />
        <Skeleton className="h-10 w-full mb-4" />
        <Skeleton className="h-10 w-full mb-4" />
        <Skeleton className="h-10 w-full" />
      </div>
    );
  }

  return (
    <>
      <PageHelmet title={`Editar Informações Básicas - ${restaurant?.name || 'Restaurante'}`} />
      <PageHeader title="Nome e Categoria" backLink={`/restaurant/${id}/settings`} />
      <div className="container mx-auto px-4 py-8">
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="relative z-0 w-32 h-32 mx-auto mb-6">
              <img
                src={form.watch('image_url') || 'https://via.placeholder.com/150'}
                alt="Avatar do Restaurante"
                className="w-full h-full rounded-full object-cover"
              />
              <ImageUploadButton
                onUploadComplete={(url) => form.setValue('image_url', url, { shouldDirty: true })}
                bucketName={RESTAURANT_IMAGES_BUCKET}
                folderPath={`${id}/profile`}
              />
            </div>

            <FormField
              control={form.control}
              name="name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome do Restaurante</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
                      {restaurantCategories.map((cat) => (
                        <SelectItem key={cat.value} value={cat.value}>
                          {cat.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit" className="w-full" disabled={form.formState.isSubmitting || !form.formState.isDirty}>
              {form.formState.isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </form>
        </Form>
      </div>
    </>
  );
};

export default EditBasicInfoPage;