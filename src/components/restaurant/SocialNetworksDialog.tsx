"use client";

import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Instagram, Facebook, Link, Globe } from 'lucide-react';
import { showSuccess, showError } from '@/utils/toast';
import { SocialNetworkLink } from '@/types/restaurant';

interface SocialNetworksDialogProps {
  isOpen: boolean;
  onClose: () => void;
  initialLinks: SocialNetworkLink[] | null;
  onSave: (links: SocialNetworkLink[]) => Promise<void>;
}

const socialTypes: SocialNetworkLink['type'][] = ['instagram', 'facebook', 'website', 'other'];

const getIcon = (type: SocialNetworkLink['type']) => {
  switch (type) {
    case 'instagram':
      return <Instagram className="w-4 h-4" />;
    case 'facebook':
      return <Facebook className="w-4 h-4" />;
    case 'website':
      return <Globe className="w-4 h-4" />;
    case 'other':
    default:
      return <Link className="w-4 h-4" />;
  }
};

const SocialNetworksDialog: React.FC<SocialNetworksDialogProps> = ({ isOpen, onClose, initialLinks, onSave }) => {
  const [links, setLinks] = useState<SocialNetworkLink[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setLinks(initialLinks || []);
  }, [initialLinks]);

  const handleAddLink = () => {
    setLinks([...links, { type: 'instagram', url: '' }]);
  };

  const handleRemoveLink = (index: number) => {
    setLinks(links.filter((_, i) => i !== index));
  };

  const handleLinkChange = (index: number, field: keyof SocialNetworkLink, value: string) => {
    const newLinks = [...links];
    // TypeScript requires explicit casting or checking here since value is string
    if (field === 'type') {
      newLinks[index] = { ...newLinks[index], type: value as SocialNetworkLink['type'] };
    } else {
      newLinks[index] = { ...newLinks[index], url: value };
    }
    setLinks(newLinks);
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Basic validation
      const validLinks = links.filter(link => link.url.trim() !== '');
      await onSave(validLinks);
      showSuccess('Redes sociais salvas com sucesso!');
      onClose();
    } catch (error) {
      console.error('Failed to save social networks:', error);
      showError('Erro ao salvar redes sociais.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Gerenciar Redes Sociais</DialogTitle>
        </DialogHeader>
        <div className="space-y-4 max-h-[60vh] overflow-y-auto p-1">
          {links.map((link, index) => (
            <div key={index} className="flex space-x-2 items-center">
              <div className="w-1/3">
                <Select
                  value={link.type}
                  onValueChange={(value) => handleLinkChange(index, 'type', value)}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {socialTypes.map(type => (
                      <SelectItem key={type} value={type}>
                        <div className="flex items-center space-x-2">
                          {getIcon(type)}
                          <span>{type.charAt(0).toUpperCase() + type.slice(1)}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <Input
                placeholder="URL (ex: https://instagram.com/perfil)"
                value={link.url}
                onChange={(e) => handleLinkChange(index, 'url', e.target.value)}
                className="flex-1"
              />
              <Button
                variant="destructive"
                size="icon"
                onClick={() => handleRemoveLink(index)}
              >
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          ))}
          <Button variant="outline" onClick={handleAddLink} className="w-full">
            <Plus className="w-4 h-4 mr-2" /> Adicionar Link
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