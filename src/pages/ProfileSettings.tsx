"use client";

import React from 'react';
import { Helmet } from 'react-helmet-async';
import { useUser } from '../hooks/useUser';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '../components/ui/form';
import { toast } from 'sonner';
import { supabase } from '../integrations/supabase/client';
import { ImageUploadButton } from '../components/ImageUploadButton';
import { USER_AVATAR_BUCKET } from '@/integrations/supabase/storage';

const profileSchema = z.object({
  first_name: z.string().min(1, 'Nome é obrigatório'),
  last_name: z.string().min(1, 'Sobrenome é obrigatório'),
  phone: z.string().optional(),
  avatar_url: z.string().optional(),
});

const ProfileSettings = () => {
  const { user, isLoading, mutate } = useUser();

  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      first_name: user?.user_metadata?.first_name || '',
      last_name: user?.user_metadata?.last_name || '',
      phone: user?.user_metadata?.phone || '',
      avatar_url: user?.user_metadata?.avatar_url || '',
    },
  });

  React.useEffect(() => {
    if (user) {
      form.reset({
        first_name: user.user_metadata?.first_name || '',
        last_name: user.user_metadata?.last_name || '',
        phone: user.user_metadata?.phone || '',
        avatar_url: user.user_metadata?.avatar_url || '',
      });
    }
  }, [user, form]);

  const onSubmit = async (values: z.infer<typeof profileSchema>) => {
    try {
      const { error } = await supabase.auth.updateUser({
        data: {
          first_name: values.first_name,
          last_name: values.last_name,
          phone: values.phone,
          avatar_url: values.avatar_url,
        },
      });

      if (error) {
        throw error;
      }

      toast.success('Perfil atualizado com sucesso!');
      mutate(); // Revalidate user data
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
      toast.error('Erro ao atualizar perfil.');
    }
  };

  if (isLoading) {
    return <div>Carregando...</div>;
  }

  return (
    <>
      <Helmet>
        <title>Configurações do Perfil - Restaurantes</title>
      </Helmet>
      <div className="container mx-auto px-4 py-8">
        <div className="sticky top-0 z-[100] bg-white pb-4">
          <h1 className="text-3xl font-bold">Configurações do Perfil</h1>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="relative w-32 h-32 mx-auto mb-6">
              <img
                src={form.watch('avatar_url') || 'https://via.placeholder.com/150'}
                alt="Avatar"
                className="w-full h-full rounded-full object-cover"
              />
              <ImageUploadButton
                onUploadComplete={(url) => form.setValue('avatar_url', url)}
                currentImageUrl={form.watch('avatar_url') || undefined}
                bucketName={USER_AVATAR_BUCKET}
                folderPath="avatars"
              />
            </div>

            <FormField
              control={form.control}
              name="first_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nome</FormLabel>
                  <FormControl>
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="last_name"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Sobrenome</FormLabel>
                  <FormControl>
                    <Input {...field} />
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
                    <Input {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? 'Salvando...' : 'Salvar Alterações'}
            </Button>
          </form>
        </Form>
      </div>
    </>
  );
};

export default ProfileSettings;