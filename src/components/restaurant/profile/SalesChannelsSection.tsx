import React, { useState } from 'react';
import { PublicRestaurantData } from '@/types/restaurant';
import InfoCardItem from '@/components/InfoCardItem';
import EditFieldDialog from '@/components/EditFieldDialog';
import { useRestaurantUpdate } from '@/hooks/useRestaurantUpdate';
import { toast } from 'react-hot-toast';
import { MessageSquare, Utensils, Globe } from 'lucide-react'; // Removido LinkIcon

interface SalesChannelsSectionProps {
  restaurant: PublicRestaurantData;
}

const SalesChannelsSection: React.FC<SalesChannelsSectionProps> = ({ restaurant }) => {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentField, setCurrentField] = useState<{ 
    name: keyof PublicRestaurantData; 
    title: string; 
    description: string; 
    inputType: 'text' | 'textarea' | 'number' | 'url';
  } | null>(null);

  // CORREÇÃO 1: Usando isPending em vez de isLoading
  const { mutate: updateRestaurant, isPending: isLoading } = useRestaurantUpdate();

  const openDialog = (
    name: keyof PublicRestaurantData, 
    title: string, 
    description: string, 
    inputType: 'text' | 'textarea' | 'number' | 'url' = 'text'
  ) => {
    setCurrentField({ name, title, description, inputType });
    setIsDialogOpen(true);
  };

  const handleSave = async (fieldName: string, value: string | number) => {
    if (!restaurant.id) {
      toast.error("ID do restaurante não encontrado.");
      return;
    }

    const payload = { [fieldName]: value };
    
    const updatePromise = new Promise<void>((resolve, reject) => {
      updateRestaurant(
        { restaurantId: restaurant.id, data: payload },
        {
          onSuccess: () => {
            toast.success(`${currentField?.title} atualizado com sucesso!`);
            resolve();
          },
          onError: (error) => {
            console.error("Erro ao atualizar o restaurante:", error);
            toast.error(`Falha ao atualizar ${currentField?.title}.`);
            reject(error);
          },
        }
      );
    });

    try {
      await updatePromise;
      setIsDialogOpen(false);
      setCurrentField(null);
    } catch (e) {
      // O erro já foi tratado no onError do useRestaurantUpdate
    }
  };

  // CORREÇÃO 2, 3, 4: Garantindo que o retorno seja sempre string
  const getDisplayValue = (value: string | number | null | undefined): string => {
    if (typeof value === 'string' && value.startsWith('http')) {
      return value.length > 40 ? value.substring(0, 37) + '...' : value;
    }
    if (value === null || value === undefined) {
        return 'Não definido';
    }
    return String(value);
  };

  return (
    <div className="w-full space-y-3">
      <h2 className="text-xl font-bold text-slate-800 px-1 mb-4">Canais de Venda e Links</h2>
      
      <InfoCardItem 
        label="Link do WhatsApp" 
        value={getDisplayValue(restaurant.whatsapp_url)}
        icon={MessageSquare}
        onClick={() => openDialog(
          'whatsapp_url', 
          'Link do WhatsApp', 
          'Insira o link direto para o seu WhatsApp (Ex: https://wa.me/5511999999999).',
          'url'
        )}
      />
      
      <InfoCardItem 
        label="Link do iFood" 
        value={getDisplayValue(restaurant.ifood_url)}
        icon={Utensils}
        onClick={() => openDialog(
          'ifood_url', 
          'Link do iFood', 
          'Insira o link da sua loja no iFood.',
          'url'
        )}
      />
      
      <InfoCardItem 
        label="Site Próprio / Outro Link" 
        value={getDisplayValue(restaurant.other_url)}
        icon={Globe}
        onClick={() => openDialog(
          'other_url', 
          'Site Próprio / Outro Link', 
          'Insira o link para seu site próprio, Goomer, ou qualquer outro canal de venda.',
          'url'
        )}
      />

      {currentField && (
        <EditFieldDialog
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          title={currentField.title}
          description={currentField.description}
          fieldName={currentField.name}
          initialValue={restaurant[currentField.name] as string | number | undefined}
          inputType={currentField.inputType}
          onSave={handleSave}
          loading={isLoading}
        />
      )}
    </div>
  );
};

export default SalesChannelsSection;