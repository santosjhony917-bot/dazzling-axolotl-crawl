import React from 'react';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Trash2, PlusCircle } from 'lucide-react';
import { SocialNetwork } from '@/types';

interface SocialNetworksEditorProps {
  socialNetworks: SocialNetwork[];
  onChange: (networks: SocialNetwork[]) => void;
}

export const SocialNetworksEditor: React.FC<SocialNetworksEditorProps> = ({ socialNetworks, onChange }) => {
  const handleAdd = () => {
    onChange([...socialNetworks, { platform: '', url: '' }]);
  };

  const handleRemove = (index: number) => {
    onChange(socialNetworks.filter((_, i) => i !== index));
  };

  const handleChange = (index: number, field: 'platform' | 'url', value: string) => {
    const updated = [...socialNetworks];
    updated[index] = { ...updated[index], [field]: value };
    onChange(updated);
  };

  return (
    <div className="space-y-4">
      {socialNetworks.map((network, index) => (
        <div key={index} className="flex items-center gap-2">
          <Input
            placeholder="Ex: Instagram"
            value={network.platform}
            onChange={(e) => handleChange(index, 'platform', e.target.value)}
          />
          <Input
            placeholder="URL do perfil"
            value={network.url}
            onChange={(e) => handleChange(index, 'url', e.target.value)}
          />
          <Button variant="ghost" size="icon" onClick={() => handleRemove(index)}>
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button variant="outline" size="sm" onClick={handleAdd} className="w-full">
        <PlusCircle className="mr-2 h-4 w-4" /> Adicionar Rede Social
      </Button>
    </div>
  );
};