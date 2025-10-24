import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, MapPin } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { geocodeAddress } from '@/services/geocoding';
import { showError } from '@/utils/toast';
import { useUserSearchLocation } from '@/hooks/useUserSearchLocation';

interface UserLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAddress: string;
  onLocationSaved: () => void;
}

const locationSchema = z.object({
  address: z.string().min(10, "O endereço completo é obrigatório."),
});

export default function UserLocationModal({ isOpen, onClose, currentAddress, onLocationSaved }: UserLocationModalProps) {
  const { saveLocation } = useUserSearchLocation();
  const [loading, setLoading] = useState(false);
  
  const { register, handleSubmit, formState: { errors }, reset } = useForm<z.infer<typeof locationSchema>>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      address: currentAddress === "Localização não definida" ? "" : currentAddress,
    },
  });

  useEffect(() => {
    if (isOpen) {
      reset({ address: currentAddress === "Localização não definida" ? "" : currentAddress });
    }
  }, [isOpen, currentAddress, reset]);

  const onSubmit = async (data: z.infer<typeof locationSchema>) => {
    setLoading(true);
    
    try {
      // 1. Geocode the address
      const geocoded = await geocodeAddress(data.address);
      
      if (!geocoded) {
        showError("Não foi possível encontrar as coordenadas do endereço. Verifique o endereço.");
        setLoading(false);
        return;
      }

      // 2. Save to DB via hook
      const success = await saveLocation({
        formattedAddress: data.address,
        lat: geocoded.lat,
        lon: geocoded.lon,
      });

      if (success) {
        onLocationSaved();
        onClose();
      }

    } catch (e) {
      showError("Falha ao processar a localização.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px] rounded-xl">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <MapPin className="h-6 w-6 text-primary" />
            <DialogTitle className="text-xl font-bold text-primary">Definir Localização de Busca</DialogTitle>
          </div>
          <DialogDescription>
            Esta localização será usada para buscar outros restaurantes próximos a você. Ela é salva no banco de dados e persiste entre sessões.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          
          {/* Address Input */}
          <div className="relative">
            <Input
              {...register('address')}
              placeholder="Endereço completo (Rua, Número, Cidade, Estado)"
              className="h-12 rounded-xl text-base"
              disabled={loading}
            />
            {errors.address && <p className="text-sm text-destructive mt-1">{errors.address.message}</p>}
          </div>

          <DialogFooter className="mt-6">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                "Salvar Localização de Busca"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}