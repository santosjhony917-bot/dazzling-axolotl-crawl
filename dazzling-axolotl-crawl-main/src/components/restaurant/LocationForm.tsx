import React, { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2, Save } from 'lucide-react';
import { Restaurant } from '@/types/supabase';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';

// Esquema de validação
const LocationSchema = z.object({
  address: z.string().min(1, 'O endereço é obrigatório.'),
  number: z.string().optional(),
  neighborhood: z.string().min(1, 'O bairro é obrigatório.'),
  city: z.string().min(1, 'A cidade é obrigatória.'),
  state: z.string().min(1, 'O estado é obrigatório.'),
  cep: z.string().optional(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
});

type LocationFormData = z.infer<typeof LocationSchema>;

interface LocationFormProps {
  restaurant: Restaurant;
  refetch: () => void;
}

const LocationForm: React.FC<LocationFormProps> = ({ restaurant, refetch }) => {
  const [isSaving, setIsSaving] = useState(false);

  const form = useForm<LocationFormData>({
    resolver: zodResolver(LocationSchema),
    defaultValues: {
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

  const onSubmit = async (data: LocationFormData) => {
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('restaurants')
        .update({
          address: data.address,
          number: data.number,
          neighborhood: data.neighborhood,
          city: data.city,
          state: data.state,
          cep: data.cep,
          latitude: data.latitude,
          longitude: data.longitude,
        })
        .eq('id', restaurant.id);

      if (error) throw error;

      showSuccess('Localização atualizada com sucesso!');
      refetch();
    } catch (error) {
      console.error('Erro ao salvar localização:', error);
      showError('Falha ao atualizar a localização. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Endereço (Rua/Avenida)</FormLabel>
              <FormControl>
                <Input {...field} className="rounded-xl" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="number"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Número</FormLabel>
                <FormControl>
                  <Input {...field} className="rounded-xl" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="cep"
            render={({ field }) => (
              <FormItem>
                <FormLabel>CEP</FormLabel>
                <FormControl>
                  <Input {...field} className="rounded-xl" />
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
                <Input {...field} className="rounded-xl" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="city"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cidade</FormLabel>
                <FormControl>
                  <Input {...field} className="rounded-xl" />
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
                <FormControl>
                  <Input {...field} className="rounded-xl" />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>
        
        <div className="grid grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="latitude"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Latitude</FormLabel>
                <FormControl>
                  <Input 
                    {...field} 
                    type="number" 
                    step="any"
                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                    value={field.value === null ? '' : field.value}
                    className="rounded-xl" 
                  />
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
                  <Input 
                    {...field} 
                    type="number" 
                    step="any"
                    onChange={(e) => field.onChange(e.target.value ? parseFloat(e.target.value) : null)}
                    value={field.value === null ? '' : field.value}
                    className="rounded-xl" 
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" disabled={isSaving} className="w-full bg-highlight hover:bg-highlight/90 rounded-xl">
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Salvar Localização
        </Button>
      </form>
    </Form>
  );
};

export default LocationForm;