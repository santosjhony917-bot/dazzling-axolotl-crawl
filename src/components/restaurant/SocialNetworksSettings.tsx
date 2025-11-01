import React, { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, Plus, Trash2, Instagram, Facebook, Twitter, Link, Save } from 'lucide-react';
import { useAuthData } from '@/context/AuthContext';
import { useRestaurantUpdate } from '@/hooks/useRestaurantUpdate';
import { showError, showSuccess } from '@/utils/toast';
import { SocialNetworkLink } from '@/types/restaurant';
import { Skeleton } from '@/components/ui/skeleton';

const availableNetworks = [
  { type: 'Instagram', icon: Instagram },
  { type: 'Facebook', icon: Facebook },
  { type: 'Twitter', icon: Twitter },
  { type: 'TikTok', icon: Link }, // Usando Link como fallback para TikTok
  { type: 'Outro', icon: Link },
];

const getIcon = (type: string) => {
    return availableNetworks.find(n => n.type.toLowerCase() === type.toLowerCase())?.icon || Link;
};

const SocialNetworksSettings: React.FC = () => {
  const { restaurant, isLoading: authLoading, refetchProfile } = useAuthData();
  const restaurantId = restaurant?.id;
  
  // Inicializa o estado com os dados do restaurante ou array vazio
  const [networks, setNetworks] = useState<SocialNetworkLink[]>(
    (restaurant?.social_networks as SocialNetworkLink[] || [])
  );
  const [newLink, setNewLink] = useState<{ type: string, url: string }>({ type: 'Instagram', url: '' });

  const { mutateAsync: updateRestaurant, isPending: isSaving } = useRestaurantUpdate();

  useEffect(() => {
    if (restaurant?.social_networks) {
      setNetworks(restaurant.social_networks as SocialNetworkLink[]);
    }
  }, [restaurant?.social_networks]);

  const handleAddLink = () => {
    if (newLink.url.trim() && newLink.type.trim()) {
      // Validação básica de URL
      if (!newLink.url.startsWith('http')) {
        showError("A URL deve começar com http:// ou https://");
        return;
      }
      
      setNetworks(prev => [...prev, { type: newLink.type, url: newLink.url.trim() }]);
      setNewLink({ type: 'Instagram', url: '' });
    }
  };

  const handleRemoveLink = (index: number) => {
    setNetworks(prev => prev.filter((_, i) => i !== index));
  };

  const handleSave = async () => {
    if (!restaurantId) {
      showError("ID do restaurante não encontrado.");
      return;
    }
    
    // Filtra links vazios antes de salvar
    const validNetworks = networks.filter(n => n.url.trim());

    try {
        await updateRestaurant({ 
          restaurantId, 
          data: { social_networks: validNetworks as any } // Casting para Jsonb
        });
        showSuccess("Redes sociais atualizadas com sucesso!");
        refetchProfile();
    } catch (error) {
        showError((error as Error).message || "Falha ao salvar redes sociais.");
    }
  };

  if (authLoading) {
    return <Skeleton className="h-64 w-full rounded-xl" />;
  }

  return (
    <Card className="shadow-soft-lg border-none rounded-xl bg-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl text-[#022D68]">
          <Link className="w-6 h-6" /> Outras Redes
        </CardTitle>
        <CardDescription>Adicione links para suas redes sociais (Instagram, Facebook, etc.) que aparecerão no perfil público.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        
        {/* Lista de Links Atuais */}
        <div className="space-y-3">
          {networks.length === 0 ? (
            <p className="text-gray-500 italic">Nenhuma rede social adicionada.</p>
          ) : (
            networks.map((network, index) => {
              const Icon = getIcon(network.type);
              return (
                <div key={index} className="flex items-center gap-3 p-3 border rounded-lg bg-gray-50">
                  <Icon className="w-5 h-5 text-primary shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-sm truncate">{network.type}</p>
                    <a href={network.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-500 truncate hover:underline block">{network.url}</a>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    onClick={() => handleRemoveLink(index)}
                    disabled={isSaving}
                    className="h-8 w-8 text-red-500 hover:bg-red-50 shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              );
            })
          )}
        </div>

        {/* Adicionar Novo Link */}
        <div className="space-y-3 border-t pt-4 border-gray-100">
          <h3 className="text-lg font-semibold text-gray-700">Adicionar Novo Link</h3>
          <div className="flex gap-2">
            <Select 
              value={newLink.type} 
              onValueChange={(value) => setNewLink(prev => ({ ...prev, type: value }))}
              disabled={isSaving}
            >
              <SelectTrigger className="w-[120px] h-10 rounded-xl shrink-0">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                {availableNetworks.map(net => (
                  <SelectItem key={net.type} value={net.type}>{net.type}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Input
              type="url"
              placeholder="URL Completa (Ex: https://instagram.com/seuuser)"
              value={newLink.url}
              onChange={(e) => setNewLink(prev => ({ ...prev, url: e.target.value }))}
              className="h-10 rounded-xl flex-1"
              disabled={isSaving}
            />
          </div>
          <Button 
            onClick={handleAddLink}
            disabled={!newLink.url.trim() || isSaving}
            className="w-full bg-primary hover:bg-primary/90"
          >
            <Plus className="h-4 w-4 mr-2" /> Adicionar à Lista
          </Button>
        </div>

        {/* Botão Salvar */}
        <Button 
          onClick={handleSave}
          disabled={isSaving}
          variant="highlight"
          className="w-full h-12 text-lg font-bold shadow-highlight-glow"
        >
          {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
          Salvar Redes Sociais
        </Button>
      </CardContent>
    </Card>
  );
};

export default SocialNetworksSettings;