import React, { useState, useCallback, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, MapPin } from 'lucide-react';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { fetchAddressSuggestions, AddressSuggestion } from '@/services/geocoding';
import { showError, showSuccess } from '@/utils/toast';
import { useUserSearchLocation } from '@/hooks/useUserSearchLocation';
import { GeocodedAddress } from '@/services/geolocation';

interface UserLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAddress: string;
  onLocationSaved: () => void;
}

const locationSchema = z.object({
  search: z.string().min(3, "Digite pelo menos 3 caracteres para buscar"),
});

export default function UserLocationModal({ isOpen, onClose, currentAddress, onLocationSaved }: UserLocationModalProps) {
  const [loading, setLoading] = useState(false);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const { saveLocation } = useUserSearchLocation();
  
  const { register, handleSubmit, setValue, watch, formState: { errors }, reset } = useForm<z.infer<typeof locationSchema>>({
    resolver: zodResolver(locationSchema),
    defaultValues: {
      search: currentAddress === "Localização Padrão (João Pessoa)" ? "" : currentAddress,
    },
  });

  const searchValue = watch('search');

  // Effect to handle address suggestions
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchValue.length > 2) {
        handleFetchSuggestions(searchValue);
      } else {
        setSuggestions([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchValue]);

  const handleFetchSuggestions = useCallback(async (query: string) => {
    setLoading(true);
    try {
      const results = await fetchAddressSuggestions(query);
      setSuggestions(results);
    } catch (e) {
      showError("Falha ao buscar sugestões de endereço.");
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleSelectSuggestion = async (suggestion: AddressSuggestion) => {
    setLoading(true);
    
    // Converte a sugestão para o formato GeocodedAddress
    const addressData: GeocodedAddress = {
      street: suggestion.address.split(',')[0].trim(),
      neighborhood: suggestion.address.split(',')[1]?.trim() || '',
      city: suggestion.address.split(',')[2]?.trim() || '',
      state: suggestion.address.split(',')[3]?.trim() || '',
      cep: '', // CEP não é fornecido pela sugestão, mas é opcional para a busca
      lat: suggestion.lat,
      lon: suggestion.lon,
      formattedAddress: suggestion.address,
    };

    const { error } = await saveLocation(addressData);
    
    if (!error) {
      showSuccess("Localização de busca salva!");
      onLocationSaved();
      onClose();
    } else {
      showError(error);
    }
    setLoading(false);
  };

  const handleClose = () => {
    reset();
    setSuggestions([]);
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[425px] rounded-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <MapPin className="h-6 w-6 text-primary" />
            <DialogTitle className="text-xl font-bold text-primary">Definir Localização de Busca</DialogTitle>
          </div>
          <DialogDescription>
            Insira o endereço onde você deseja buscar restaurantes concorrentes.
          </DialogDescription>
        </DialogHeader>
        
        <form onSubmit={handleSubmit(() => handleFetchSuggestions(searchValue))} className="space-y-4">
          <div className="relative">
            <Input
              {...register('search')}
              placeholder="Ex: Av. Epitácio Pessoa, João Pessoa"
              className="h-12 rounded-xl text-base pr-10"
              disabled={loading}
            />
            {loading && (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 animate-spin text-highlight" />
            )}
            {errors.search && <p className="text-sm text-destructive mt-1">{errors.search.message}</p>}
          </div>
          
          <Button type="submit" disabled={loading || !!errors.search} className="w-full">
            Buscar Endereço
          </Button>
        </form>

        {suggestions.length > 0 && (
          <div className="space-y-2 max-h-48 overflow-y-auto border-t pt-4">
            <p className="text-sm font-semibold text-primary">Sugestões:</p>
            {suggestions.map((suggestion) => (
              <div 
                key={suggestion.placeId}
                onClick={() => handleSelectSuggestion(suggestion)}
                className="p-3 border rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <p className="text-sm font-medium text-gray-800">{suggestion.address}</p>
                <p className="text-xs text-gray-500 truncate">{suggestion.label}</p>
              </div>
            ))}
          </div>
        )}

        <DialogFooter className="mt-4">
          <Button type="button" variant="outline" onClick={handleClose} disabled={loading}>
            Fechar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}