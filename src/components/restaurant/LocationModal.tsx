import React, { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, MapPin, Check } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import axios from 'axios';
import { formatCEP, geocodeAddress } from '@/services/geocoding';
import { showError, showSuccess } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';
import { saveLastRestaurantLocationInput, loadLastRestaurantLocationInput } from '@/services/localPersistence'; // Importando utilitários

interface LocationData {
  cep: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
}

interface LocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  restaurantId: string;
  currentLocation: LocationData;
  onSave: () => void;
}

const locationSchema = z.object({
  cep: z.string().regex(/^\d{5}-\d{3}$/, "CEP inválido"),
  street: z.string().min(3, "Rua/Avenida é obrigatória"),
  number: z.string().min(1, "Número é obrigatório"),
  neighborhood: z.string().min(3, "Bairro é obrigatório"),
  city: z.string().min(3, "Cidade é obrigatória"),
  state: z.string().length(2, "Estado (UF) inválido"),
});

export default function LocationModal({ isOpen, onClose, restaurantId, currentLocation, onSave }: LocationModalProps) {
  const [loading, setLoading] = useState(false);
  const [isSearchingCep, setIsSearchingCep] = useState(false);
  
  // Determina os valores iniciais, priorizando o DB, depois o localStorage
  const getInitialValues = useCallback(() => {
    // Se o DB tem dados (CEP ou Rua), usamos o DB
    if (currentLocation.cep || currentLocation.street) {
      return currentLocation;
    }
    
    // Caso contrário, tentamos carregar do localStorage
    const lastInput = loadLastRestaurantLocationInput();
    if (lastInput) {
      return {
        ...currentLocation, // Mantém city/state/number vazios se não vierem do DB
        cep: lastInput.cep,
        street: lastInput.street,
      };
    }
    
    // Fallback para valores vazios
    return currentLocation;
  }, [currentLocation]);
  
  const { register, handleSubmit, setValue, watch, formState: { errors }, reset } = useForm<z.infer<typeof locationSchema>>({
    resolver: zodResolver(locationSchema),
    defaultValues: getInitialValues(),
  });

  const cepValue = watch('cep');
  const streetValue = watch('street');

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      reset(getInitialValues());
    }
  }, [isOpen, getInitialValues, reset]);

  const fetchViaCEP = useCallback(async (cep: string) => {
    const cleanedCep = cep.replace(/\D/g, '');
    if (cleanedCep.length !== 8) return;

    setIsSearchingCep(true);
    
    try {
      const response = await axios.get(`https://viacep.com.br/ws/${cleanedCep}/json/`);
      const data = response.data;

      if (!data.erro) {
        setValue('street', data.logradouro || '', { shouldValidate: true });
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

  // Effect to handle CEP lookup
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

  const onSubmit = async (data: z.infer<typeof locationSchema>) => {
    setLoading(true);
    
    // 1. Geocode the address (using the service function)
    const fullAddress = `${data.street}, ${data.number}, ${data.neighborhood}, ${data.city}, ${data.state}, ${data.cep}`;
    let lat = null;
    let lon = null;

    try {
      const geocoded = await geocodeAddress(fullAddress);
      if (geocoded) {
        lat = geocoded.lat;
        lon = geocoded.lon;
      } else {
        showError("Não foi possível encontrar as coordenadas do endereço. Verifique o endereço.");
        setLoading(false);
        return;
      }

      // 2. Update Supabase
      const { error } = await supabase
        .from('restaurants')
        .update({
          address: data.street,
          number: data.number,
          city: data.city,
          state: data.state,
          cep: data.cep,
          neighborhood: data.neighborhood,
          latitude: lat,
          longitude: lon,
        })
        .eq('id', restaurantId);

      if (error) {
        throw new Error(error.message);
      }

      // 3. Salva o CEP e a Rua no localStorage (para persistência do input)
      saveLastRestaurantLocationInput({ cep: data.cep, street: data.street });

      showSuccess("Localização atualizada com sucesso!");
      onSave();
      onClose();

    } catch (e) {
      showError((e as Error).message || "Falha ao salvar a localização.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] rounded-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <MapPin className="h-6 w-6 text-primary" />
            <DialogTitle className="text-xl font-bold text-primary">Atualizar Localização</DialogTitle>
          </div>
          <DialogDescription>
            Insira o CEP para preenchimento automático e confirme o endereço principal do seu restaurante.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          
          {/* CEP Input */}
          <div className="relative">
            <Input
              {...register('cep')}
              placeholder="CEP (Ex: 58039-000)"
              className="h-12 rounded-xl text-base pr-10"
              onChange={handleCepChange}
              maxLength={9}
              disabled={loading || isSearchingCep}
            />
            {isSearchingCep && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-highlight" />
            )}
            {errors.cep && <p className="text-sm text-destructive mt-1">{errors.cep.message}</p>}
          </div>

          {/* Rua / Avenida */}
          <Input
            {...register('street')}
            placeholder="Rua / Avenida"
            className="h-12 rounded-xl text-base"
            disabled={loading || isSearchingCep}
          />
          {errors.street && <p className="text-sm text-destructive mt-1">{errors.street.message}</p>}

          {/* Número */}
          <Input
            {...register('number')}
            placeholder="Número"
            className="h-12 rounded-xl text-base"
            disabled={loading || isSearchingCep}
          />
          {errors.number && <p className="text-sm text-destructive mt-1">{errors.number.message}</p>}

          {/* Bairro */}
          <Input
            {...register('neighborhood')}
            placeholder="Bairro"
            className="h-12 rounded-xl text-base"
            disabled={loading || isSearchingCep}
          />
          {errors.neighborhood && <p className="text-sm text-destructive mt-1">{errors.neighborhood.message}</p>}

          {/* Cidade e Estado */}
          <div className="flex gap-2">
            <Input
              {...register('city')}
              placeholder="Cidade"
              className="h-12 rounded-xl text-base flex-1"
              disabled={loading || isSearchingCep}
            />
            <Input
              {...register('state')}
              placeholder="UF"
              className="h-12 rounded-xl text-base w-20"
              maxLength={2}
              disabled={loading || isSearchingCep}
            />
          </div>
          {(errors.city || errors.state) && <p className="text-sm text-destructive mt-1">Cidade e Estado são obrigatórios.</p>}

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading || isSearchingCep}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || isSearchingCep}>
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