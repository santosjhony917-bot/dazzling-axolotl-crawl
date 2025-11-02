import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Instagram, Facebook, Globe } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { SocialNetwork } from '@/types/restaurant'; // Importar SocialNetwork

interface SocialNetworksDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initialSocialNetworks: SocialNetwork[];
  onSave: (socialNetworks: SocialNetwork[]) => void;
}

const SocialNetworksDialog: React.FC<SocialNetworksDialogProps> = ({
  isOpen,
  onClose,
  initialSocialNetworks,
  onSave,
}) => {
  const [socialNetworks, setSocialNetworks] = useState<SocialNetwork[]>(initialSocialNetworks);

  useEffect(() => {
    setSocialNetworks(initialSocialNetworks);
  }, [initialSocialNetworks, isOpen]);

  const addSocialNetwork = () => {
    setSocialNetworks([...socialNetworks, { platform: 'instagram', url: '' }]);
  };

  const updateSocialNetwork = (index: number, field: keyof SocialNetwork, value: string) => {
    const newSocialNetworks = [...socialNetworks];
    newSocialNetworks[index] = { ...newSocialNetworks[index], [field]: value };
    setSocialNetworks(newSocialNetworks);
  };

  const removeSocialNetwork = (index: number) => {
    const newSocialNetworks = socialNetworks.filter((_, i) => i !== index);
    setSocialNetworks(newSocialNetworks);
  };

  const handleSave = () => {
    // Basic validation
    const isValid = socialNetworks.every(sn => sn.platform && sn.url);
    if (!isValid) {
      showError('Por favor, preencha todos os campos de plataforma e URL.');
      return;
    }
    onSave(socialNetworks);
    onClose();
  };

  const getPlatformIcon = (platform: string) => {
    switch (platform) {
      case 'instagram': return <Instagram className="w-4 h-4" />;
      case 'facebook': return <Facebook className="w-4 h-4" />;
      case 'website': return <Globe className="w-4 h-4" />;
      default: return <Globe className="w-4 h-4" />;
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Gerenciar Redes Sociais</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {socialNetworks.map((social, index) => (
            <div key={index} className="flex items-end gap-2">
              <div className="grid gap-2 flex-grow">
                <Label htmlFor={`platform-${index}`}>Plataforma</Label>
                <Select
                  value={social.platform}
                  onValueChange={(value) => updateSocialNetwork(index, 'platform', value)}
                >
                  <SelectTrigger className="flex-grow">
                    <SelectValue placeholder="Selecione a plataforma" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="instagram">Instagram</SelectItem>
                    <SelectItem value="facebook">Facebook</SelectItem>
                    <SelectItem value="website">Website</SelectItem>
                    {/* Adicione outras plataformas conforme necessário */}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2 flex-grow-[2]">
                <Label htmlFor={`url-${index}`}>URL</Label>
                <Input
                  id={`url-${index}`}
                  value={social.url}
                  onChange={(e) => updateSocialNetwork(index, 'url', e.target.value)}
                  placeholder="https://..."
                />
              </div>
              <Button variant="destructive" size="icon" onClick={() => removeSocialNetwork(index)}>
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" onClick={addSocialNetwork} className="mt-2">
            <Plus className="mr-2 h-4 w-4" /> Adicionar Rede Social
          </Button>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave}>Salvar Alterações</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SocialNetworksDialog;