import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Loader2, Lock, Save } from 'lucide-react';
import { Restaurant } from '@/types/supabase';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';

// Schema de validação para URLs (opcional, mas bom para consistência)
const urlSchema = z.string().url({ message: "URL inválida" }).or(z.literal("")).optional();

const formSchema = z.object({
  whatsapp_url: urlSchema,
  ifood_url: urlSchema,
  other_url: urlSchema,
});

type LinksFormValues = z.infer<typeof formSchema>;

interface RestaurantLinksFormProps {
  restaurant: Restaurant;
}

export function RestaurantLinksForm({ restaurant }: RestaurantLinksFormProps) {
  const queryClient = useQueryClient();
  
  // Define se o plano é Premium (incluindo cortesia)
  const isPremium = restaurant.plan === 'premium' || restaurant.plan === 'premium_gift';
  // Desabilita se não for Premium (ou seja, se for 'free')
  const isDisabled = !isPremium; 

  const form = useForm<LinksFormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      whatsapp_url: restaurant.whatsapp_url || '',
      ifood_url: restaurant.ifood_url || '',
      other_url: restaurant.other_url || '',
    },
    mode: 'onChange',
  });

  const updateLinksMutation = useMutation({
    mutationFn: async (data: LinksFormValues) => {
      const { error } = await supabase
        .from('restaurants')
        .update(data)
        .eq('id', restaurant.id);

      if (error) throw error;
    },
    onSuccess: () => {
      showSuccess('Links atualizados com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['restaurantProfile', restaurant.id] });
    },
    onError: (error) => {
      showError(`Erro ao atualizar links: ${error.message}`);
    },
  });

  const onSubmit = (values: LinksFormValues) => {
    if (isDisabled) {
        showError("Esta funcionalidade está disponível apenas para planos Premium.");
        return;
    }
    updateLinksMutation.mutate(values);
  };

  // Função auxiliar para renderizar o campo de link
  const renderLinkField = (name: keyof LinksFormValues, label: string, placeholder: string) => (
    <FormField
      control={form.control}
      name={name}
      render={({ field }) => (
        <FormItem>
          <FormLabel className={isDisabled ? "text-gray-500" : ""}>
            {label} {isDisabled && <Lock className="inline h-4 w-4 ml-1 text-red-500" />}
          </FormLabel>
          <div className="relative">
            <FormControl>
              <Input 
                placeholder={placeholder} 
                {...field} 
                disabled={isDisabled || updateLinksMutation.isPending}
                className={isDisabled ? "bg-gray-100 cursor-not-allowed" : ""}
              />
            </FormControl>
            {isDisabled && (
              <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
                <Lock className="h-4 w-4 text-gray-400" />
              </div>
            )}
          </div>
          <FormMessage />
        </FormItem>
      )}
    />
  );

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        
        {/* WhatsApp URL Field - AGORA BLOQUEADO PARA FREE */}
        {renderLinkField(
          "whatsapp_url", 
          "Link do WhatsApp", 
          "Ex: https://wa.me/5511999999999"
        )}

        {/* iFood URL Field */}
        {renderLinkField(
          "ifood_url", 
          "Link do iFood", 
          "Ex: https://www.ifood.com.br/restaurante/..."
        )}

        {/* Other URL Field */}
        {renderLinkField(
          "other_url", 
          "Outro Link (Ex: Site Próprio)", 
          "Ex: https://www.meusite.com.br"
        )}

        <Button 
          type="submit" 
          className="w-full bg-primary hover:bg-primary/90"
          disabled={updateLinksMutation.isPending || isDisabled}
        >
          {updateLinksMutation.isPending ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Save className="mr-2 h-4 w-4" />
          )}
          Salvar Links
        </Button>
        
        {isDisabled && (
            <p className="text-sm text-center text-red-500 mt-4 flex items-center justify-center p-2 border border-red-200 rounded-md bg-red-50">
                <Lock className="h-4 w-4 mr-1" /> Esta funcionalidade de links externos é exclusiva para planos Premium.
            </p>
        )}
      </form>
    </Form>
  );
}