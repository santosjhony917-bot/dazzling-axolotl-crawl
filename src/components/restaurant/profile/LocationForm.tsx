import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Save, MapPin } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';
import { Restaurant } from '@/types/supabase';
import { useQueryClient } from '@tanstack/react-query';
import { Separator } from '@/components/ui/separator'; // Adicionado import do Separator

interface LocationFormProps {
  restaurant: Restaurant;
  refetch: () => void;
}

const LocationForm: React.FC<LocationFormProps> = ({ restaurant, refetch }) => {
  const queryClient = useQueryClient();
  const [addressData, setAddressData] = useState({
    address: restaurant.address || '',
    number: restaurant.number || '',
    neighborhood: restaurant.neighborhood || '',
    city: restaurant.city || '',
    state: restaurant.state || '',
    cep: restaurant.cep || '',
    latitude: restaurant.latitude || '',
    longitude: restaurant.longitude || '',
  });
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    setAddressData({
      address: restaurant.address || '',
      number: restaurant.number || '',
      neighborhood: restaurant.neighborhood || '',
      city: restaurant.city || '',
      state: restaurant.state || '',
      cep: restaurant.cep || '',
      latitude: restaurant.latitude || '',
      longitude: restaurant.longitude || '',
    });
  }, [restaurant]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setAddressData(prev => ({ ...prev, [id]: value }));
  };

  const handleSaveLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);

    try {
      const payload = {
        ...addressData,
        latitude: addressData.latitude ? parseFloat(addressData.latitude as string) : null,
        longitude: addressData.longitude ? parseFloat(addressData.longitude as string) : null,
      };

      const { error } = await supabase
        .from('restaurants')
        .update(payload)
        .eq('id', restaurant.id);

      if (error) throw error;

      showSuccess('Localização atualizada com sucesso!');
      refetch();
      queryClient.invalidateQueries({ queryKey: ['restaurant', restaurant.id] });
    } catch (error) {
      console.error('Erro ao salvar localização:', error);
      showError('Falha ao atualizar a localização. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSaveLocation} className="space-y-4">
      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <Label htmlFor="address">Rua/Avenida</Label>
          <Input id="address" value={addressData.address} onChange={handleChange} className="rounded-xl" />
        </div>
        <div>
          <Label htmlFor="number">Número</Label>
          <Input id="number" value={addressData.number} onChange={handleChange} className="rounded-xl" />
        </div>
      </div>
      
      <div>
        <Label htmlFor="neighborhood">Bairro</Label>
        <Input id="neighborhood" value={addressData.neighborhood} onChange={handleChange} className="rounded-xl" />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="col-span-2">
          <Label htmlFor="city">Cidade</Label>
          <Input id="city" value={addressData.city} onChange={handleChange} className="rounded-xl" />
        </div>
        <div>
          <Label htmlFor="state">Estado (UF)</Label>
          <Input id="state" value={addressData.state} onChange={handleChange} className="rounded-xl" />
        </div>
      </div>
      
      <div>
        <Label htmlFor="cep">CEP</Label>
        <Input id="cep" value={addressData.cep} onChange={handleChange} className="rounded-xl" />
      </div>

      <Separator />

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="latitude">Latitude</Label>
          <Input id="latitude" type="number" step="any" value={addressData.latitude || ''} onChange={handleChange} className="rounded-xl" placeholder="-23.5505" />
        </div>
        <div>
          <Label htmlFor="longitude">Longitude</Label>
          <Input id="longitude" type="number" step="any" value={addressData.longitude || ''} onChange={handleChange} className="rounded-xl" placeholder="-46.6333" />
        </div>
      </div>

      <Button type="submit" disabled={isSaving} className="w-full bg-highlight hover:bg-highlight/90 rounded-xl">
        {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
        Salvar Localização
      </Button>
    </form>
  );
};

export default LocationForm;