import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, Save } from 'lucide-react';
import { Restaurant } from '@/types/supabase';
import { supabase } from '@/integrations/supabase/client';
import { showError, showSuccess } from '@/utils/toast';
import { formatCEP, geocodeAddress } from '@/services/geocoding';
import axios from 'axios';

interface LocationFormProps {
  restaurant: Restaurant;
  refetch: () => void;
}

const LocationForm: React.FC<LocationFormProps> = ({ restaurant, refetch }) => {
  const [formData, setFormData] = useState({
    cep: restaurant.cep || '',
    address: restaurant.address || '',
    number: restaurant.number || '',
    neighborhood: restaurant.neighborhood || '',
    city: restaurant.city || '',
    state: restaurant.state || '',
  });
  const [isSaving, setIsSaving] = useState(false);
  const [isSearchingCep, setIsSearchingCep] = useState(false);

  useEffect(() => {
    setFormData({
      cep: restaurant.cep || '',
      address: restaurant.address || '',
      number: restaurant.number || '',
      neighborhood: restaurant.neighborhood || '',
      city: restaurant.city || '',
      state: restaurant.state || '',
    });
  }, [restaurant]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    if (id === 'cep') {
      setFormData(prev => ({ ...prev, cep: formatCEP(value) }));
    } else {
      setFormData(prev => ({ ...prev, [id]: value }));
    }
  };

  const fetchViaCEP = async (cep: string) => {
    const cleanedCep = cep.replace(/\D/g, '');
    if (cleanedCep.length !== 8) return;

    setIsSearchingCep(true);
    try {
      const response = await axios.get(`https://viacep.com.br/ws/${cleanedCep}/json/`);
      const data = response.data;

      if (!data.erro) {
        setFormData(prev => ({
          ...prev,
          address: data.logradouro || prev.address,
          neighborhood: data.bairro || prev.neighborhood,
          city: data.localidade || prev.city,
          state: data.uf || prev.state,
        }));
        showSuccess("Endereço preenchido via CEP!");
      } else {
        showError("CEP não encontrado.");
      }
    } catch (error) {
      showError("Erro ao buscar CEP.");
    } finally {
      setIsSearchingCep(false);
    }
  };

  useEffect(() => {
    const cleanedCep = formData.cep.replace(/\D/g, '');
    if (cleanedCep.length === 8 && !isSaving) {
      fetchViaCEP(formData.cep);
    }
  }, [formData.cep, isSaving]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurant.id) return;

    setIsSaving(true);
    
    const fullAddress = `${formData.address}, ${formData.number}, ${formData.neighborhood}, ${formData.city}, ${formData.state}, ${formData.cep}`;
    let lat = null;
    let lon = null;

    try {
      // 1. Geocode the address
      const geocoded = await geocodeAddress(fullAddress);
      if (geocoded) {
        lat = geocoded.lat;
        lon = geocoded.lon;
      } else {
        showError("Não foi possível encontrar as coordenadas do endereço. Verifique o endereço.");
        setIsSaving(false);
        return;
      }

      // 2. Update Supabase
      const { error } = await supabase
        .from('restaurants')
        .update({
          address: formData.address,
          number: formData.number,
          city: formData.city,
          state: formData.state,
          cep: formData.cep,
          neighborhood: formData.neighborhood,
          latitude: lat,
          longitude: lon,
        })
        .eq('id', restaurant.id);

      if (error) throw error;

      showSuccess("Localização atualizada com sucesso!");
      refetch();

    } catch (e) {
      showError((e as Error).message || "Falha ao salvar a localização.");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <form onSubmit={handleSave} className="space-y-4">
      <div>
        <Label htmlFor="cep">CEP</Label>
        <Input id="cep" value={formData.cep} onChange={handleChange} maxLength={9} disabled={isSaving || isSearchingCep} className="rounded-xl" />
      </div>
      <div>
        <Label htmlFor="address">Rua / Avenida</Label>
        <Input id="address" value={formData.address} onChange={handleChange} required disabled={isSaving || isSearchingCep} className="rounded-xl" />
      </div>
      <div className="flex gap-4">
        <div className="flex-1">
          <Label htmlFor="number">Número</Label>
          <Input id="number" value={formData.number} onChange={handleChange} required disabled={isSaving || isSearchingCep} className="rounded-xl" />
        </div>
        <div className="flex-1">
          <Label htmlFor="neighborhood">Bairro</Label>
          <Input id="neighborhood" value={formData.neighborhood} onChange={handleChange} required disabled={isSaving || isSearchingCep} className="rounded-xl" />
        </div>
      </div>
      <div className="flex gap-4">
        <div className="flex-1">
          <Label htmlFor="city">Cidade</Label>
          <Input id="city" value={formData.city} onChange={handleChange} required disabled={isSaving || isSearchingCep} className="rounded-xl" />
        </div>
        <div className="w-20">
          <Label htmlFor="state">UF</Label>
          <Input id="state" value={formData.state} onChange={handleChange} required maxLength={2} disabled={isSaving || isSearchingCep} className="rounded-xl" />
        </div>
      </div>
      
      <Button type="submit" disabled={isSaving || isSearchingCep} className="w-full bg-highlight hover:bg-highlight/90 rounded-xl">
        {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
        Salvar Localização
      </Button>
    </form>
  );
};

export default LocationForm;