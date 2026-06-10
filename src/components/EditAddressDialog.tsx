import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, MapPin, Check } from 'lucide-react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { supabase } from '@/integrations/supabase/client';
import { geocodeAddress, formatCEP } from '@/services/geocoding';
import { showError, showSuccess } from '@/utils/toast';
import axios from 'axios';

interface AddressData {
  address: string;
  city: string;
  state: string;
  cep: string;
  neighborhood: string;
  latitude: number | null;
  longitude: number | null;
}

interface EditAddressDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  restaurantId: string;
  currentAddress: AddressData;
  onSave: () => void;
}

const addressSchema = z.object({
  cep: z.string().regex(/^\d{5}-\d{3}$/, "CEP inválido"),
  address: z.string().min(3, "Rua/Avenida é obrigatória"),
  neighborhood: z.string().min(3, "Bairro é obrigatório"),
  city: z.string().min(3, "Cidade é obrigatória"),
  state: z.string().length(2, "Estado (UF) inválido"),
});

export function EditAddressDialog({ open, onOpenChange, restaurantId, currentAddress, onSave }: EditAddressDialogProps) {
  const [loading, setLoading] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<z.infer<typeof addressSchema>>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      cep: formatCEP(currentAddress.cep),
      address: currentAddress.address,
      neighborhood: currentAddress.neighborhood,
      city: currentAddress.city,
      state: currentAddress.state,
    },
  });

  const cepValue = watch('cep');

  // Effect to handle CEP lookup
  useEffect(() => {
    const cleanedCep = cepValue.replace(/\D/g, '');
    if (cleanedCep.length === 8 && !loading) {
      const lookupCep = async () => {
        setIsGeocoding(true);
        try {
          const response = await axios.get(`https://viacep.com.br/ws/${cleanedCep}/json/`);
          const data = response.data;

          if (!data.erro) {
            setValue('address', data.logradouro || '');
            setValue('neighborhood', data.bairro || '');
            setValue('city', data.localidade || '');
            setValue('state', data.uf || '');
            showSuccess("Endereço preenchido via CEP!");
          } else {
            showError("CEP não encontrado.");
          }
        } catch (error) {
          showError("Erro ao buscar CEP.");
        } finally {
          setIsGeocoding(false);
        }
      };
      lookupCep();
    }
  }, [cepValue, loading, setValue]);

  const onSubmit = async (data: z.infer<typeof addressSchema>) => {
    setLoading(true);
    setIsGeocoding(true);
    
    const fullAddress = `${data.address}, ${data.neighborhood}, ${data.city}, ${data.state}, ${data.cep}`;
    let lat = currentAddress.latitude;
    let lon = currentAddress.longitude;

    try {
      // 1. Geocode the address
      const geocoded = await geocodeAddress(fullAddress);
      if (geocoded) {
        lat = geocoded.lat;
        lon = geocoded.lon;
      } else {
        showError("Não foi possível encontrar as coordenadas do endereço. Verifique o endereço.");
        setLoading(false);
        setIsGeocoding(false);
        return;
      }

      // 2. Update Supabase
      const { error } = await supabase
        .from('restaurants')
        .update({
          address: data.address,
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

      showSuccess("Endereço e localização atualizados com sucesso!");
      onSave();
      onOpenChange(false);

    } catch (e) {
      showError((e as Error).message || "Falha ao salvar o endereço.");
    } finally {
      setLoading(false);
      setIsGeocoding(false);
    }
  };

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    setValue('cep', formatCEP(rawValue), { shouldValidate: true });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px] rounded-2xl shadow-none">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <MapPin className="h-6 w-6 text-primary" />
            <DialogTitle className="text-xl font-bold text-primary">Editar Endereço</DialogTitle>
          </div>
          <DialogDescription>
            Preencha o endereço completo para garantir a localização correta no mapa.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input
            {...register('cep')}
            placeholder="CEP (Ex: 58039-000)"
            className="h-12 rounded-2xl text-base focus:border-highlight focus:ring-highlight"
            onChange={handleCepChange}
            maxLength={9}
            disabled={loading || isGeocoding}
          />
          {errors.cep && <p className="text-sm text-destructive">{errors.cep.message}</p>}

          <Input
            {...register('address')}
            placeholder="Rua / Avenida"
            className="h-12 rounded-2xl text-base focus:border-highlight focus:ring-highlight"
            disabled={loading || isGeocoding}
          />
          {errors.address && <p className="text-sm text-destructive">{errors.address.message}</p>}

          <Input
            {...register('neighborhood')}
            placeholder="Bairro"
            className="h-12 rounded-2xl text-base focus:border-highlight focus:ring-highlight"
            disabled={loading || isGeocoding}
          />
          {errors.neighborhood && <p className="text-sm text-destructive">{errors.neighborhood.message}</p>}

          <div className="flex gap-2">
            <Input
              {...register('city')}
              placeholder="Cidade"
              className="h-12 rounded-2xl text-base focus:border-highlight focus:ring-highlight"
              disabled={loading || isGeocoding}
            />
            <Input
              {...register('state')}
              placeholder="UF"
              className="h-12 rounded-2xl text-base w-20 focus:border-highlight focus:ring-highlight"
              maxLength={2}
              disabled={loading || isGeocoding}
            />
          </div>
          {(errors.city || errors.state) && <p className="text-sm text-destructive">Cidade e Estado são obrigatórios.</p>}

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={loading || isGeocoding}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading || isGeocoding} variant="highlight">
              {loading || isGeocoding ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                "Salvar Endereço"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}