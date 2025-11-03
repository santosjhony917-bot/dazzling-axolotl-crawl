import React, { useState } from 'react';
import { RestaurantProfile } from '@/types/restaurant'; // Corrigido para RestaurantProfile
import InfoCardItem from '@/components/InfoCardItem';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/components/ui/use-toast';

interface SalesChannelsSectionProps {
  restaurant: RestaurantProfile;
  isEditing: boolean;
  onEditToggle: () => void;
}

const SalesChannelsSection: React.FC<SalesChannelsSectionProps> = ({ restaurant, isEditing, onEditToggle }) => {
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const [formData, setFormData] = useState({
    whatsapp_url: restaurant.whatsapp_url || '',
    ifood_url: restaurant.ifood_url || '',
    other_url: restaurant.other_url || '',
    other_url_label: restaurant.other_url_label || '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const updateRestaurantMutation = useMutation({
    mutationFn: async (updates: Partial<RestaurantProfile>) => {
      const { data, error } = await supabase
        .from('restaurants')
        .update(updates)
        .eq('id', restaurant.id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['restaurantProfile', restaurant.id]);
      toast({
        title: "Sucesso",
        description: "Canais de venda atualizados com sucesso.",
      });
      onEditToggle();
    },
    onError: (error) => {
      toast({
        title: "Erro",
        description: `Falha ao atualizar canais de venda: ${error.message}`,
        variant: "destructive",
      });
    },
  });

  const handleSave = () => {
    updateRestaurantMutation.mutate(formData);
  };

  const fields = [
    { name: 'whatsapp_url', label: 'WhatsApp URL', description: 'Link direto para o WhatsApp do restaurante.' },
    { name: 'ifood_url', label: 'iFood URL', description: 'Link para o perfil do restaurante no iFood.' },
    { name: 'other_url', label: 'Outro Link URL', description: 'Um link adicional para pedidos ou informações.' },
    { name: 'other_url_label', label: 'Rótulo do Outro Link', description: 'Texto que aparecerá para o "Outro Link".' },
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-semibold">Canais de Venda</h3>
      {isEditing ? (
        <div className="space-y-4">
          {fields.map((field) => (
            <div key={field.name} className="space-y-2">
              <Label htmlFor={field.name}>{field.label}</Label>
              {field.name === 'other_url_label' ? (
                <Input
                  id={field.name}
                  name={field.name}
                  value={formData[field.name as keyof typeof formData]}
                  onChange={handleChange}
                  placeholder={field.description}
                />
              ) : (
                <Input
                  id={field.name}
                  name={field.name}
                  value={formData[field.name as keyof typeof formData]}
                  onChange={handleChange}
                  placeholder={field.description}
                />
              )}
            </div>
          ))}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={onEditToggle}>Cancelar</Button>
            <Button onClick={handleSave} disabled={updateRestaurantMutation.isPending}>
              {updateRestaurantMutation.isPending ? 'Salvando...' : 'Salvar'}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          {fields.map((field) => (
            <InfoCardItem
              key={field.name}
              label={field.label}
              description={field.description}
              fieldName={field.name as string} // Cast para string
              initialValue={restaurant[field.name as keyof RestaurantProfile] as string | number | undefined}
            />
          ))}
          <div className="flex justify-end">
            <Button variant="outline" onClick={onEditToggle}>Editar Canais</Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default SalesChannelsSection;