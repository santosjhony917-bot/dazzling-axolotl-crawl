"use client";

import React, { useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useRestaurantProfile } from '@/hooks/useRestaurantProfile';
import { useAuth } from '@/hooks/useAuth';
import { toast } from 'sonner';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RestaurantProfileFormValues, WeekSchedule } from '@/types/restaurant';
import { useQueryClient } from '@tanstack/react-query';
import ImageUpload from '@/components/ImageUpload';
import OpeningHoursForm from '@/components/restaurant/OpeningHoursForm'; // Updated import path

// Schema de validação (simplificado para o exemplo)
const profileSchema = z.object({
  name: z.string().min(1, 'O nome é obrigatório.'),
  description: z.string().nullable(),
  category: z.string().nullable(),
  phone: z.string().nullable(),
  email: z.string().email('Email inválido.').nullable(),
  cnpj: z.string().nullable(),
  whatsapp_url: z.string().url('URL inválida.').nullable().or(z.literal('')),
  ifood_url: z.string().url('URL inválida.').nullable().or(z.literal('')),
  other_url: z.string().url('URL inválida.').nullable().or(z.literal('')),
  address: z.string().nullable(),
  number: z.string().nullable(),
  neighborhood: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  cep: z.string().nullable(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
  opening_hours: z.any().refine((val) => val !== undefined, 'Horário de funcionamento é obrigatório.'),
  image_url: z.string().nullable(),
  cover_image_url: z.string().nullable(),
  image_file: z.any().optional(),
  cover_image_file: z.any().optional(),
  external_url: z.string().url('URL inválida.').nullable().or(z.literal('')),
});

const defaultOpeningHours: WeekSchedule = {
  monday: [],
  tuesday: [],
  wednesday: [],
  thursday: [],
  friday: [],
  saturday: [],
  sunday: [],
};

const ProfileSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  // Chamando useRestaurantProfile sem argumentos, pois ele agora aceita opcionalmente
  const { restaurant, isLoading: isRestaurantLoading, refetchProfile, updateRestaurant } = useRestaurantProfile();
  const queryClient = useQueryClient();

  const defaultValues = useMemo<RestaurantProfileFormValues>(() => ({
    name: restaurant?.name || '',
    description: restaurant?.description || null,
    category: restaurant?.category || null,
    phone: restaurant?.phone || null,
    email: restaurant?.email || null,
    cnpj: restaurant?.cnpj || null,
    whatsapp_url: restaurant?.whatsapp_url || null,
    ifood_url: restaurant?.ifood_url || null,
    other_url: restaurant?.other_url || null,
    address: restaurant?.address || null,
    number: restaurant?.number || null,
    neighborhood: restaurant?.neighborhood || null,
    city: restaurant?.city || null,
    state: restaurant?.state || null,
    cep: restaurant?.cep || null,
    latitude: restaurant?.latitude || null,
    longitude: restaurant?.longitude || null,
    opening_hours: (restaurant?.opening_hours as WeekSchedule) || defaultOpeningHours,
    image_url: restaurant?.image_url || null,
    cover_image_url: restaurant?.cover_image_url || null,
    external_url: restaurant?.external_url || null,
  }), [restaurant]);

  const form = useForm<RestaurantProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: defaultValues,
    mode: 'onChange',
  });

  const { handleSubmit, control, reset, formState: { isSubmitting } } = form;

  useEffect(() => {
    if (restaurant) {
      reset(defaultValues);
    } else if (user) {
      // If no restaurant data, try to fetch it
      refetchProfile();
    }
  }, [restaurant, defaultValues, reset, user, refetchProfile]);

  const onSubmit = async (data: RestaurantProfileFormValues) => {
    if (!restaurant) {
      toast.error('Restaurante não carregado. Tente novamente.');
      return;
    }

    await updateRestaurant(data);
    queryClient.invalidateQueries({ queryKey: ['restaurantProfile'] });
  };

  if (isRestaurantLoading || !restaurant) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 sm:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center mb-6">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="mr-2">
            <ArrowLeft className="h-5 w-5" />
          </Button>
          <h1 className="text-2xl font-bold text-gray-800">Configurações do Perfil</h1>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Seção de Imagens */}
          <Card>
            <CardHeader>
              <CardTitle>Imagens do Restaurante</CardTitle>
              <CardDescription>Gerencie a imagem de perfil e a capa do seu restaurante.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-6 md:grid-cols-2">
              {/* Imagem de Perfil */}
              <div>
                <Label htmlFor="image_url">Imagem de Perfil (Logo)</Label>
                <Controller
                  name="image_url"
                  control={control}
                  render={({ field }) => (
                    <ImageUpload
                      bucket="restaurant_images"
                      currentImageUrl={field.value}
                      onUploadSuccess={async (url) => {
                        field.onChange(url);
                        // Submitting the form immediately after upload is optional, but we update the field value
                      }}
                      onRemove={async () => {
                        field.onChange(null);
                      }}
                      folderPath={`restaurant_images/${restaurant.id}/profile`}
                      className="mt-2"
                    />
                  )}
                />
              </div>

              {/* Imagem de Capa */}
              <div>
                <Label htmlFor="cover_image_url">Imagem de Capa</Label>
                <Controller
                  name="cover_image_url"
                  control={control}
                  render={({ field }) => (
                    <ImageUpload
                      bucket="restaurant_images"
                      currentImageUrl={field.value}
                      onUploadSuccess={async (url) => {
                        field.onChange(url);
                      }}
                      onRemove={async () => {
                        field.onChange(null);
                      }}
                      folderPath={`restaurant_images/${restaurant.id}/cover`}
                      className="mt-2"
                    />
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Seção de Informações Básicas */}
          <Card>
            <CardHeader>
              <CardTitle>Informações Básicas</CardTitle>
              <CardDescription>Nome, descrição e categoria do seu estabelecimento.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-2">
                <Label htmlFor="name">Nome do Restaurante</Label>
                <Input id="name" {...form.register('name')} />
                {form.formState.errors.name && <p className="text-sm text-red-500">{form.formState.errors.name.message}</p>}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="description">Descrição</Label>
                <Textarea id="description" {...form.register('description')} rows={3} />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="category">Categoria</Label>
                <Controller
                  name="category"
                  control={control}
                  render={({ field }) => (
                    <Select onValueChange={field.onChange} value={field.value || ''}>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione a Categoria" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Italiana">Italiana</SelectItem>
                        <SelectItem value="Japonesa">Japonesa</SelectItem>
                        <SelectItem value="Brasileira">Brasileira</SelectItem>
                        <SelectItem value="Fast Food">Fast Food</SelectItem>
                        <SelectItem value="Vegetariana">Vegetariana</SelectItem>
                        <SelectItem value="Outra">Outra</SelectItem>
                      </SelectContent>
                    </Select>
                  )}
                />
              </div>
            </CardContent>
          </Card>

          {/* Seção de Contato e Documentos */}
          <Card>
            <CardHeader>
              <CardTitle>Contato e Links</CardTitle>
              <CardDescription>Informações de contato e links externos.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="phone">Telefone</Label>
                  <Input id="phone" {...form.register('phone')} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" type="email" {...form.register('email')} />
                  {form.formState.errors.email && <p className="text-sm text-red-500">{form.formState.errors.email.message}</p>}
                </div>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="cnpj">CNPJ</Label>
                <Input id="cnpj" {...form.register('cnpj')} />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="whatsapp_url">Link do WhatsApp</Label>
                <Input id="whatsapp_url" {...form.register('whatsapp_url')} placeholder="https://wa.me/..." />
                {form.formState.errors.whatsapp_url && <p className="text-sm text-red-500">{form.formState.errors.whatsapp_url.message}</p>}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="ifood_url">Link do iFood</Label>
                <Input id="ifood_url" {...form.register('ifood_url')} placeholder="https://www.ifood.com.br/..." />
                {form.formState.errors.ifood_url && <p className="text-sm text-red-500">{form.formState.errors.ifood_url.message}</p>}
              </div>

              <div className="grid gap-2">
                <Label htmlFor="external_url">Link Externo (Site, Instagram, etc.)</Label>
                <Input id="external_url" {...form.register('external_url')} placeholder="https://seusite.com" />
                {form.formState.errors.external_url && <p className="text-sm text-red-500">{form.formState.errors.external_url.message}</p>}
              </div>
            </CardContent>
          </Card>

          {/* Seção de Endereço e Localização */}
          <Card>
            <CardHeader>
              <CardTitle>Endereço e Localização</CardTitle>
              <CardDescription>Detalhes do endereço físico do restaurante.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="cep">CEP</Label>
                  <Input id="cep" {...form.register('cep')} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="address">Rua/Avenida</Label>
                  <Input id="address" {...form.register('address')} />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="number">Número</Label>
                  <Input id="number" {...form.register('number')} />
                </div>
                <div className="grid gap-2 col-span-2">
                  <Label htmlFor="neighborhood">Bairro</Label>
                  <Input id="neighborhood" {...form.register('neighborhood')} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="city">Cidade</Label>
                  <Input id="city" {...form.register('city')} />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="state">Estado</Label>
                  <Input id="state" {...form.register('state')} />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="grid gap-2">
                  <Label htmlFor="latitude">Latitude</Label>
                  <Input 
                    id="latitude" 
                    type="number" 
                    step="any" 
                    {...form.register('latitude', { valueAsNumber: true })} 
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="longitude">Longitude</Label>
                  <Input 
                    id="longitude" 
                    type="number" 
                    step="any" 
                    {...form.register('longitude', { valueAsNumber: true })} 
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Seção de Horário de Funcionamento */}
          <Card>
            <CardHeader>
              <CardTitle>Horário de Funcionamento</CardTitle>
              <CardDescription>Defina os horários de abertura e fechamento para cada dia da semana.</CardDescription>
            </CardHeader>
            <CardContent>
              <Controller
                name="opening_hours"
                control={control}
                render={({ field }) => (
                  <OpeningHoursForm 
                    schedule={field.value as WeekSchedule} 
                    onChange={field.onChange} 
                  />
                )}
              />
              {form.formState.errors.opening_hours && <p className="text-sm text-red-500 mt-2">{form.formState.errors.opening_hours.message}</p>}
            </CardContent>
          </Card>

          <div className="flex justify-end">
            <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
              {isSubmitting ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                'Salvar Alterações'
              )}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ProfileSettingsPage;