import React, { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, MapPin, Check } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { formatCEP, geocodeAddress } from '@/services/geocoding';
import { showError, showSuccess } from '@/utils/toast';
import { useUserSearchLocation } from '@/hooks/useUserSearchLocation';
import { GeocodedAddress } from '@/services/geolocation';
import axios from 'axios';
import { Label } from '@/components/ui/label';

interface UserLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAddress: string;
  onLocationSaved: () => void;
}

// Schema de validação para o endereço
const locationSchema = z.object({
  cep: z.string().regex(/^\d{5}-\d{3}$/, "CEP inválido"),
  address: z.string().min(3, "Rua/Avenida é obrigatória"),
  number: z.string().min(1, "Número é obrigatório"),
  neighborhood: z.string().min(3, "Bairro é obrigatório"),
  city: z.string().min(3, "Cidade é obrigatória"),
  state: z.string().length(2, "Estado (UF) inválido"),
});

type LocationFormValues = z.infer<typeof locationSchema>;

export default function UserLocationModal({ isOpen, onClose, currentAddress, onLocationSaved }: UserLocationModalProps) {
  const [loading, setLoading] = useState(false);
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  const { saveLocation, location: userLocation } = useUserSearchLocation();
  
  const { register, handleSubmit, setValue, watch, formState: { errors }, reset } = useForm<LocationFormValues>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      cep: '',
      address: '',
      number: '',
      neighborhood: '',
      city: '',
      state: '',
    },
  });

  const cepValue = watch('cep');

  // Efeito para buscar CEP automaticamente
  const fetchViaCEP = useCallback(async (cep: string) => {
    const cleanedCep = cep.replace(/\D/g, '');
    if (cleanedCep.length !== 8) return;

    setIsSearchingCep(true);
    
    try {
      const response = await axios.get(`https://viacep.com.br/ws/${cleanedCep}/json/`);
      const data = response.data;

      if (!data.erro) {
        setValue('address', data.logradouro || '', { shouldValidate: true });
        setValue('neighborhood', data.bairro || '', { shouldValidate: true });
        setValue('city', data.localidade || '', { shouldValidate: true });
        setValue('state', data.uf || '', { shouldValidate: true });
        showSuccess("Endereço preenchido via CEP!");
      } else {
        showError("CEP não encontrado.");
      }
    } catch (error) {
      showError("Erro ao buscar CEP.");
    } finally {
      setIsSearchingCep(false);
    }
  }, [setValue]);

  useEffect(() => {
    if (isOpen) {
      // Tenta preencher o CEP e endereço se já houver uma localização salva
      if (userLocation.address !== "Localização Padrão (João Pessoa)" && userLocation.cep) {
        reset({
          cep: formatCEP(userLocation.cep),
          address: userLocation.address.split(',')[0]?.trim() || '',
          // Outros campos não são facilmente extraíveis do formattedAddress, mas o CEP deve acionar a busca
        });
        // Aciona a busca de CEP para preencher o restante
        fetchViaCEP(userLocation.cep);
      } else {
        reset();
      }
    }
  }, [isOpen, userLocation, reset, fetchViaCEP]);

  // Efeito para monitorar a mudança do CEP e acionar a busca
  useEffect(() => {
    const cleanedCep = cepValue.replace(/\D/g, '');
    if (cleanedCep.length === 8 && !loading) {
      fetchViaCEP(cepValue);
    }
  }, [cepValue, loading, fetchViaCEP]);

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    setValue('cep', formatCEP(rawValue), { shouldValidate: true });
  };

  const onSubmit = async (data: LocationFormValues) => {
    setLoading(true);
    
    const fullAddress = `${data.address}, ${data.number}, ${data.neighborhood}, ${data.city}, ${data.state}, ${data.cep}`;
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
        setLoading(false);
        return;
      }

      // 2. Prepare data for saving
      const addressData: GeocodedAddress = {
        street: data.address,
        neighborhood: data.neighborhood,
        city: data.city,
        state: data.state,
        cep: data.cep,
        lat: lat,
        lon: lon,
        formattedAddress: fullAddress,
      };

      // 3. Save location
      const { error } = await saveLocation(addressData);
      
      if (!error) {
        showSuccess("Localização de busca salva!");
        onLocationSaved();
        onClose();
      } else {
        showError(error);
      }

    } catch (e) {
      showError((e as Error).message || "Falha ao salvar a localização.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] rounded-xl max-h-[90vh] overflow-y-auto shadow-soft-xl">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <MapPin className="h-6 w-6 text-primary" />
            <DialogTitle className="text-xl font-bold text-primary">Definir Localização de Busca</DialogTitle>
          </div>
          <DialogDescription>
            Insira seu CEP para preenchimento automático e defina sua localização.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          
          {/* CEP Input */}
          <div className="relative">
            <Label htmlFor="cep">CEP</Label>
            <Input
              {...register('cep')}
              id="cep"
              placeholder="CEP (Ex: 58039-000)"
              className="h-12 rounded-xl text-base pr-10 focus:border-highlight focus:ring-highlight"
              onChange={handleCepChange}
              maxLength={9}
              disabled={loading || isSearchingCep}
            />
            {isSearchingCep && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-highlight mt-4" />
            )}
            {errors.cep && <p className="text-sm text-destructive mt-1">{errors.cep.message}</p>}
          </div>

          {/* Rua / Avenida */}
          <div>
            <Label htmlFor="address">Rua / Avenida</Label>
            <Input
              {...register('address')}
              id="address"
              placeholder="Rua / Avenida"
              className="h-12 rounded-xl text-base focus:border-highlight focus:ring-highlight"
              disabled={loading || isSearchingCep}
            />
            {errors.address && <p className="text-sm text-destructive mt-1">{errors.address.message}</p>}
          </div>

          {/* Número */}
          <div>
            <Label htmlFor="number">Número</Label>
            <Input
              {...register('number')}
              id="number"
              placeholder="Número"
              className="h-12 rounded-xl text-base focus:border-highlight focus:ring-highlight"
              disabled={loading || isSearchingCep}
            />
            {errors.number && <p className="text-sm text-destructive mt-1">{errors.number.message}</p>}
          </div>

          {/* Bairro */}
          <div>
            <Label htmlFor="neighborhood">Bairro</Label>
            <Input
              {...register('neighborhood')}
              id="neighborhood"
              placeholder="Bairro"
              className="h-12 rounded-xl text-base focus:border-highlight focus:ring-highlight"
              disabled={loading || isSearchingCep}
            />
            {errors.neighborhood && <p className="text-sm text-destructive mt-1">{errors.neighborhood.message}</p>}
          </div>

          {/* Cidade e Estado */}
          <div className="flex gap-2">
            <div className="flex-1">
              <Label htmlFor="city">Cidade</Label>
              <Input
                {...register('city')}
                id="city"
                placeholder="Cidade"
                className="h-12 rounded-xl text-base flex-1 focus:border-highlight focus:ring-highlight"
                disabled={loading || isSearchingCep}
              />
            </div>
            <div className="w-20">
              <Label htmlFor="state">UF</Label>
              <Input
                {...register('state')}
                id="state"
                placeholder="UF"
                className="h-12 rounded-xl text-base focus:border-highlight focus:ring-highlight"
                maxLength={2}
                disabled={loading || isSearchingCep}
              />
            </div>
          </div>
          {(errors.city || errors.state) && <p className="text-sm text-destructive mt-1">Cidade e Estado são obrigatórios.</p>}

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading || isSearchingCep}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || isSearchingCep} variant="highlight">
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                "Salvar Localização"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}