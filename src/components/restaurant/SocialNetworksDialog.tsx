import React, { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Link, Plus, Instagram, Facebook, Globe, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { showSuccess, showError } from '@/utils/toast';
import { SocialNetworkLink } from '@/types/restaurant';

interface SocialNetworksDialogProps {
  isOpen: boolean;
  onClose: () => void;
  currentLinks: SocialNetworkLink[];
  onSave: (links: SocialNetworkLink[]) => Promise<void>;
  isLoading: boolean;
}

const predefinedPlatforms = [
  { platform: 'Instagram', icon: Instagram, placeholder: 'https://instagram.com/seuuser' },
  { platform: 'Facebook', icon: Facebook, placeholder: 'https://facebook.com/suapagina' },
  { platform: 'Website', icon: Globe, placeholder: 'https://seusite.com.br' },
];

const SocialNetworksDialog: React.FC<SocialNetworksDialogProps> = ({ isOpen, onClose, currentLinks, onSave, isLoading }) => {
  const [links, setLinks] = useState<SocialNetworkLink[]>(currentLinks);
  const [customPlatform, setCustomPlatform] = useState('');
  const [customUrl, setCustomUrl] = useState('');

  useEffect(() => {
    // Filtra links nulos ou inválidos e garante que os links iniciais sejam carregados
    setLinks(currentLinks.filter(link => link.platform && link.url));
  }, [currentLinks]);

  const handleUpdateLink = useCallback((platform: string, url: string) => {
    setLinks(prev => {
      const existingIndex = prev.findIndex(link => link.platform === platform);
      if (url.trim()) {
        const newLink = { platform, url };
        if (existingIndex !== -1) {
          // Update existing
          return prev.map((link, index) => index === existingIndex ? newLink : link);
        } else {
          // Add new
          return [...prev, newLink];
        }
      } else {
        // Remove if URL is empty
        return prev.filter(link => link.platform !== platform);
      }
    });
  }, []);

  const handleAddCustomLink = useCallback(() => {
    const trimmedPlatform = customPlatform.trim();
    const trimmedUrl = customUrl.trim();
    
    if (!trimmedPlatform || !trimmedUrl) {
      showError("Preencha a plataforma e a URL.");
      return;
    }
    
    if (links.some(link => link.platform.toLowerCase() === trimmedPlatform.toLowerCase())) {
      showError("Esta plataforma já foi adicionada.");
      return;
    }
    
    handleUpdateLink(trimmedPlatform, trimmedUrl);
    setCustomPlatform('');
    setCustomUrl('');
  }, [customPlatform, customUrl, links, handleUpdateLink]);

  const handleSave = async () => {
    // Validação final: garante que todas as URLs sejam válidas (opcional, mas bom)
    const validLinks = links.filter(link => {
        try {
            new URL(link.url);
            return true;
        } catch {
            return false;
        }
    });
    
    if (validLinks.length !== links.length) {
        showError("Algumas URLs são inválidas. Por favor, corrija ou remova.");
        return;
    }
    
    try {
      await onSave(validLinks);
      showSuccess("Redes sociais salvas com sucesso!");
      onClose();
    } catch (error) {
      showError("Erro ao salvar redes sociais.");
      console.error("Save social networks error:", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <Link className="mr-2 h-5 w-5" /> Gerenciar Outras Redes
          </DialogTitle>
          <DialogDescription>
            Adicione links para suas redes sociais e site.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4 max-h-[60vh] overflow-y-auto pr-2">
          <h3 className="text-lg font-semibold text-gray-700">Redes Comuns</h3>
          <div className="space-y-3">
            {predefinedPlatforms.map(({ platform, icon: Icon, placeholder }) => {
              const currentLink = links.find(link => link.platform === platform)?.url || '';
              return (
                <div key={platform} className="flex items-center space-x-2">
                  <Icon className="h-5 w-5 text-primary shrink-0" />
                  <Input
                    placeholder={placeholder}
                    value={currentLink}
                    onChange={(e) => handleUpdateLink(platform, e.target.value)}
                    className="h-10 rounded-lg"
                    type="url"
                  />
                </div>
              );
            })}
          </div>

          <h3 className="text-lg font-semibold text-gray-700 mt-4">Links Personalizados</h3>
          <div className="space-y-3">
            {links
              .filter(link => !predefinedPlatforms.some(p => p.platform === link.platform))
              .map(link => (
                <div key={link.platform} className="flex items-center space-x-2 p-2 bg-gray-50 rounded-md border">
                  <span className="text-sm font-medium w-20 truncate">{link.platform}</span>
                  <Input
                    value={link.url}
                    onChange={(e) => handleUpdateLink(link.platform, e.target.value)}
                    className="h-9 text-sm flex-1"
                    type="url"
                  />
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleUpdateLink(link.platform, '')}
                    className="text-red-500 hover:bg-red-100 h-8 w-8"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              ))}
          </div>

          <div className="flex flex-col space-y-2 mt-2 p-3 border rounded-lg bg-gray-50">
            <Input
              placeholder="Nome da Plataforma (Ex: TikTok)"
              value={customPlatform}
              onChange={(e) => setCustomPlatform(e.target.value)}
              className="h-10"
            />
            <Input
              placeholder="URL Completa (Ex: https://tiktok.com/...)"
              value={customUrl}
              onChange={(e) => setCustomUrl(e.target.value)}
              type="url"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleAddCustomLink();
                }
              }}
            />
            <Button onClick={handleAddCustomLink} type="button" variant="outline" size="sm" disabled={!customPlatform.trim() || !customUrl.trim()}>
              <Plus className="h-4 w-4 mr-1" /> Adicionar Link
            </Button>
          </div>
        </div>

        <DialogFooter>
          <Button type="button" onClick={onClose} variant="outline">
            Cancelar
          </Button>
          <Button type="button" onClick={handleSave} disabled={isLoading} variant="highlight">
            {isLoading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              'Salvar Redes'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SocialNetworksDialog;