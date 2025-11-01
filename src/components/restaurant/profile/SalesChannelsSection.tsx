"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { MessageSquare, Phone, Mail, Globe, ExternalLink, UtensilsCrossed } from 'lucide-react';
import { PublicRestaurantData } from '@/types/restaurant';
import { useRestaurantProfile } from '@/hooks/useRestaurantProfile';
import { showError, showSuccess } from '@/utils/toast';
import { useAuthData } from '@/context/AuthContext';

interface SalesChannelsSectionProps {
  restaurant: PublicRestaurantData;
}

type ChannelKey = 'whatsapp_url' | 'phone' | 'email' | 'ifood_url' | 'other_url' | 'external_url';

const SalesChannelsSection: React.FC<SalesChannelsSectionProps> = ({ restaurant }) => {
  const { updateRestaurant } = useRestaurantProfile(restaurant);
  const { refetchProfile } = useAuthData();

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentField, setCurrentField] = useState<ChannelKey | null>(null);
  const [currentValue, setCurrentValue] = useState('');
  const [dialogTitle, setDialogTitle] = useState('');

  const getDisplayValue = (value: string | null | undefined) => value || 'Não informado';

  const openDialog = (field: ChannelKey, title: string) => {
    setCurrentField(field);
    setCurrentValue(restaurant[field] || '');
    setDialogTitle(title);
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!currentField) return;

    try {
      await updateRestaurant({ [currentField]: currentValue === '' ? null : currentValue });
      await refetchProfile();
      showSuccess('Canal de venda atualizado com sucesso!');
      setIsDialogOpen(false);
    } catch (error) {
      console.error('Erro ao atualizar canal de venda:', error);
      showError('Erro ao atualizar canal de venda. Tente novamente.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between p-3 border rounded-md">
        <div className="flex items-center">
          <MessageSquare className="h-5 w-5 mr-3 text-green-600" />
          <div>
            <p className="font-medium">WhatsApp</p>
            <p className="text-sm text-gray-600">{getDisplayValue(restaurant.whatsapp_url)}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => openDialog('whatsapp_url', 'Link do WhatsApp')}>
          Editar
        </Button>
      </div>

      <div className="flex items-center justify-between p-3 border rounded-md">
        <div className="flex items-center">
          <Phone className="h-5 w-5 mr-3 text-blue-600" />
          <div>
            <p className="font-medium">Telefone</p>
            <p className="text-sm text-gray-600">{getDisplayValue(restaurant.phone)}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => openDialog('phone', 'Número de Telefone')}>
          Editar
        </Button>
      </div>

      <div className="flex items-center justify-between p-3 border rounded-md">
        <div className="flex items-center">
          <Mail className="h-5 w-5 mr-3 text-red-600" />
          <div>
            <p className="font-medium">Email</p>
            <p className="text-sm text-gray-600">{getDisplayValue(restaurant.email)}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => openDialog('email', 'Endereço de Email')}>
          Editar
        </Button>
      </div>

      <div className="flex items-center justify-between p-3 border rounded-md">
        <div className="flex items-center">
          <UtensilsCrossed className="h-5 w-5 mr-3 text-red-700" />
          <div>
            <p className="font-medium">iFood</p>
            <p className="text-sm text-gray-600">{getDisplayValue(restaurant.ifood_url)}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => openDialog('ifood_url', 'Link do iFood')}>
          Editar
        </Button>
      </div>

      <div className="flex items-center justify-between p-3 border rounded-md">
        <div className="flex items-center">
          <ExternalLink className="h-5 w-5 mr-3 text-gray-600" />
          <div>
            <p className="font-medium">Outro Link</p>
            <p className="text-sm text-gray-600">{getDisplayValue(restaurant.other_url)}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => openDialog('other_url', 'Outro Link de Pedido')}>
          Editar
        </Button>
      </div>

      <div className="flex items-center justify-between p-3 border rounded-md">
        <div className="flex items-center">
          <Globe className="h-5 w-5 mr-3 text-purple-600" />
          <div>
            <p className="font-medium">Site Externo</p>
            <p className="text-sm text-gray-600">{getDisplayValue(restaurant.external_url)}</p>
          </div>
        </div>
        <Button variant="outline" size="sm" onClick={() => openDialog('external_url', 'Link do Site Externo')}>
          Editar
        </Button>
      </div>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="value" className="text-right">
                Link
              </Label>
              <Input
                id="value"
                value={currentValue}
                onChange={(e) => setCurrentValue(e.target.value)}
                className="col-span-3"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave}>Salvar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default SalesChannelsSection;