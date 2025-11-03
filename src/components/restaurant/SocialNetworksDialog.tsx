"use client";

import React, { useState, useEffect } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { PlusCircle, Trash2 } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { SocialNetworkLink } from '@/types/restaurant'; // Importando SocialNetworkLink
import { Restaurant } from '@/types/restaurant'; // Importando Restaurant
import { updateRestaurant } from '@/integrations/supabase/restaurants';

interface SocialNetworksDialogProps {
  isOpen: boolean;
  onClose: () => void;
  restaurant: Restaurant;
  onSaveSuccess: (updatedSocialNetworks: SocialNetworkLink[]) => void;
}

const SocialNetworksDialog: React.FC<SocialNetworksDialogProps> = ({
  isOpen,
  onClose,
  restaurant,
  onSaveSuccess,
}) => {
  const [socialNetworks, setSocialNetworks] = useState<SocialNetworkLink[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (isOpen && restaurant.social_networks) {
      setSocialNetworks(restaurant.social_networks);
    } else if (isOpen) {
      setSocialNetworks([]);
    }
  }, [isOpen, restaurant.social_networks]);

  const addSocialNetwork = () => {
    setSocialNetworks([...socialNetworks, { platform: '', url: '' }]);
  };

  const updateSocialNetwork = (index: number, field: keyof SocialNetworkLink, value: string) => {
    const newSocialNetworks = [...socialNetworks];
    newSocialNetworks[index] = { ...newSocialNetworks[index], [field]: value };
    setSocialNetworks(newSocialNetworks);
  };

  const removeSocialNetwork = (index: number) => {
    setSocialNetworks(socialNetworks.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      const validSocialNetworks = socialNetworks.filter(
        (sn) => sn.platform && sn.url && sn.url.startsWith('http')
      );

      const { error } = await updateRestaurant(restaurant.id, {
        social_networks: validSocialNetworks,
      });

      if (error) {
        throw new Error(error.message);
      }

      showSuccess('Redes sociais atualizadas com sucesso!');
      onSaveSuccess(validSocialNetworks);
      onClose();
    } catch (err: any) {
      console.error('Failed to save social networks:', err);
      showError(`Erro ao salvar redes sociais: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Redes Sociais</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {socialNetworks.map((sn, index) => (
            <div key={index} className="flex items-end gap-2">
              <div className="grid gap-2 flex-grow">
                <Label htmlFor={`platform-${index}`}>Plataforma</Label>
                <Select
                  value={sn.platform}
                  onValueChange={(value) => updateSocialNetwork(index, 'platform', value)}
                >
                  <SelectTrigger id={`platform-${index}`}>
                    <SelectValue placeholder="Selecione a plataforma" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="facebook">Facebook</SelectItem>
                    <SelectItem value="twitter">Twitter/X</SelectItem>
                    <SelectItem value="linkedin">LinkedIn</SelectItem>
                    <SelectItem value="youtube">YouTube</SelectItem>
                    <SelectItem value="tiktok">TikTok</SelectItem>
                    <SelectItem value="website">Website</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2 flex-grow-[2]">
                <Label htmlFor={`url-${index}`}>URL</Label>
                <Input
                  id={`url-${index}`}
                  value={sn.url}
                  onChange={(e) => updateSocialNetwork(index, 'url', e.target.value)}
                  placeholder="https://..."
                />
              </div>
              <Button
                variant="destructive"
                size="icon"
                onClick={() => removeSocialNetwork(index)}
                className="flex-shrink-0"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" onClick={addSocialNetwork} className="mt-2">
            <PlusCircle className="h-4 w-4 mr-2" /> Adicionar Rede Social
          </Button>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? 'Salvando...' : 'Salvar Alterações'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SocialNetworksDialog;