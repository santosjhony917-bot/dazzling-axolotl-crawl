"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { showSuccess, showError } from '@/utils/toast';
import { SocialNetworkLink } from '@/types/restaurant'; // Assuming SocialNetworkLink type is available
import { Loader2 } from 'lucide-react';

interface SocialNetworksDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialData: SocialNetworkLink[];
  onSave: (socialNetworks: SocialNetworkLink[]) => Promise<void>;
  isSaving: boolean;
}

const SocialNetworksDialog: React.FC<SocialNetworksDialogProps> = ({
  open,
  onOpenChange,
  initialData,
  onSave,
  isSaving,
}) => {
  const [socialNetworks, setSocialNetworks] = useState<SocialNetworkLink[]>(initialData);

  useEffect(() => {
    setSocialNetworks(initialData);
  }, [initialData, open]);

  const handleAddNetwork = () => {
    setSocialNetworks([...socialNetworks, { platform: '', url: '' }]);
  };

  const handleUpdateNetwork = (index: number, field: keyof SocialNetworkLink, value: string) => {
    const newNetworks = [...socialNetworks];
    newNetworks[index] = { ...newNetworks[index], [field]: value };
    setSocialNetworks(newNetworks);
  };

  const handleRemoveNetwork = (index: number) => {
    const newNetworks = socialNetworks.filter((_, i) => i !== index);
    setSocialNetworks(newNetworks);
  };

  const handleSave = async () => {
    try {
      await onSave(socialNetworks);
      onOpenChange(false);
      showSuccess('Redes sociais atualizadas com sucesso!');
    } catch (error) {
      console.error('Erro ao salvar redes sociais:', error);
      showError('Erro ao salvar redes sociais. Tente novamente.');
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Gerenciar Redes Sociais</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 py-4">
          {socialNetworks.map((network, index) => (
            <div key={index} className="flex items-end space-x-2">
              <div className="flex-1">
                <Label htmlFor={`platform-${index}`}>Plataforma</Label>
                <Select
                  value={network.platform}
                  onValueChange={(value) => handleUpdateNetwork(index, 'platform', value)}
                >
                  <SelectTrigger id={`platform-${index}`}>
                    <SelectValue placeholder="Selecione a plataforma" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="facebook">Facebook</SelectItem>
                    <SelectItem value="twitter">Twitter</SelectItem>
                    <SelectItem value="linkedin">LinkedIn</SelectItem>
                    <SelectItem value="website">Website</SelectItem>
                    <SelectItem value="other">Outro</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex-2">
                <Label htmlFor={`url-${index}`}>URL</Label>
                <Input
                  id={`url-${index}`}
                  value={network.url}
                  onChange={(e) => handleUpdateNetwork(index, 'url', e.target.value)}
                  placeholder="https://..."
                />
              </div>
              <Button variant="destructive" onClick={() => handleRemoveNetwork(index)}>
                Remover
              </Button>
            </div>
          ))}
          <Button variant="outline" onClick={handleAddNetwork} className="w-full">
            Adicionar Rede Social
          </Button>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Salvar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SocialNetworksDialog;