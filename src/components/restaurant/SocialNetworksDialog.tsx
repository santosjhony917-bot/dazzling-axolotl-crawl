import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { showSuccess, showError } from '@/utils/toast';
import { SocialNetworkLink } from '@/types/restaurant'; // Corrigido para SocialNetworkLink
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { RestaurantProfile } from '@/types/restaurant';

interface SocialNetworksDialogProps {
  isOpen: boolean;
  onClose: () => void;
  restaurantId: string;
  initialSocialNetworks: SocialNetworkLink[];
}

const SocialNetworksDialog: React.FC<SocialNetworksDialogProps> = ({
  isOpen,
  onClose,
  restaurantId,
  initialSocialNetworks,
}) => {
  const queryClient = useQueryClient();
  const [socialNetworks, setSocialNetworks] = useState<SocialNetworkLink[]>(initialSocialNetworks);
  const [newLink, setNewLink] = useState<SocialNetworkLink>({ platform: '', url: '' });

  useEffect(() => {
    setSocialNetworks(initialSocialNetworks);
  }, [initialSocialNetworks]);

  const handleAddLink = () => {
    if (newLink.platform && newLink.url) {
      setSocialNetworks([...socialNetworks, newLink]);
      setNewLink({ platform: '', url: '' });
    } else {
      showError('Por favor, preencha a plataforma e a URL.');
    }
  };

  const handleRemoveLink = (index: number) => {
    setSocialNetworks(socialNetworks.filter((_, i) => i !== index));
  };

  const updateSocialNetworksMutation = useMutation({
    mutationFn: async (updatedLinks: SocialNetworkLink[]) => {
      const { data, error } = await supabase
        .from('restaurants')
        .update({ social_networks: updatedLinks as any }) // Cast para any devido ao tipo Jsonb
        .eq('id', restaurantId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries(['restaurantProfile', restaurantId]);
      showSuccess('Redes sociais atualizadas com sucesso!');
      onClose();
    },
    onError: (error) => {
      showError(`Erro ao atualizar redes sociais: ${error.message}`);
    },
  });

  const handleSave = () => {
    updateSocialNetworksMutation.mutate(socialNetworks);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Gerenciar Redes Sociais</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          {socialNetworks.map((link, index) => (
            <div key={index} className="flex items-center gap-2">
              <span className="flex-grow">{link.platform}: {link.url}</span>
              <Button variant="destructive" size="sm" onClick={() => handleRemoveLink(index)}>
                Remover
              </Button>
            </div>
          ))}
          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="platform" className="text-right">
              Plataforma
            </Label>
            <Select
              value={newLink.platform}
              onValueChange={(value) => setNewLink((prev) => ({ ...prev, platform: value }))}
            >
              <SelectTrigger className="col-span-2">
                <SelectValue placeholder="Selecione" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="facebook">Facebook</SelectItem>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="twitter">Twitter</SelectItem>
                <SelectItem value="linkedin">LinkedIn</SelectItem>
                <SelectItem value="website">Website</SelectItem>
                <SelectItem value="other">Outro</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-3 items-center gap-4">
            <Label htmlFor="url" className="text-right">
              URL
            </Label>
            <Input
              id="url"
              value={newLink.url}
              onChange={(e) => setNewLink((prev) => ({ ...prev, url: e.target.value }))}
              className="col-span-2"
            />
          </div>
          <Button onClick={handleAddLink}>Adicionar Link</Button>
        </div>
        <DialogFooter>
          <Button onClick={handleSave} disabled={updateSocialNetworksMutation.isPending}>
            {updateSocialNetworksMutation.isPending ? 'Salvando...' : 'Salvar alterações'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SocialNetworksDialog;