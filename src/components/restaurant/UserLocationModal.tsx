"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Loader2, MapPin } from 'lucide-react';
import { useUserSearchLocation } from '@/hooks/useUserSearchLocation';
import { UserSearchLocation } from '@/types/user';
import { showError, showSuccess } from '@/utils/toast';

interface UserLocationModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentAddress: string;
  onLocationSaved: () => void;
}

// Mock Geocoding API response for demonstration
interface GeocodedAddress {
  formattedAddress: string;
  latitude: number;
  longitude: number;
  street?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  cep?: string;
}

const mockGeocodeAddress = async (address: string): Promise<GeocodedAddress | null> => {
  // Simulate API call
  return new Promise((resolve) => {
    setTimeout(() => {
      if (address.toLowerCase().includes('são paulo')) {
        resolve({
          formattedAddress: 'São Paulo, SP, Brasil',
          latitude: -23.55052,
          longitude: -46.633309,
          city: 'São Paulo',
          state: 'SP',
        });
      } else if (address.toLowerCase().includes('rio de janeiro')) {
        resolve({
          formattedAddress: 'Rio de Janeiro, RJ, Brasil',
          latitude: -22.906847,
          longitude: -43.172897,
          city: 'Rio de Janeiro',
          state: 'RJ',
        });
      } else {
        resolve(null);
      }
    }, 500);
  });
};

const UserLocationModal: React.FC<UserLocationModalProps> = ({ isOpen, onClose, currentAddress, onLocationSaved }) => {
  const { saveLocation, isLoading: isSavingLocation } = useUserSearchLocation();
  const [searchAddress, setSearchAddress] = useState('');
  const [loadingGeocode, setLoadingGeocode] = useState(false);
  const [geocodeResult, setGeocodeResult] = useState<GeocodedAddress | null>(null);

  useEffect(() => {
    if (isOpen) {
      setSearchAddress('');
      setGeocodeResult(null);
    }
  }, [isOpen]);

  const handleSearch = async () => {
    setLoadingGeocode(true);
    const result = await mockGeocodeAddress(searchAddress);
    setGeocodeResult(result);
    setLoadingGeocode(false);
    if (!result) {
      showError('Endereço não encontrado. Tente novamente.');
    }
  };

  const handleSave = async () => {
    if (!geocodeResult) {
      showError('Nenhum endereço selecionado para salvar.');
      return;
    }

    const userSearchLocation: UserSearchLocation = {
      address: geocodeResult.formattedAddress,
      latitude: geocodeResult.latitude,
      longitude: geocodeResult.longitude,
      cep: geocodeResult.cep,
      city: geocodeResult.city,
      state: geocodeResult.state,
      neighborhood: geocodeResult.neighborhood,
      street: geocodeResult.street,
    };

    const result = await saveLocation(userSearchLocation);
    if (result && result.error) { // saveLocation now returns an object with error
      showError(`Erro ao salvar localização: ${result.error}`);
    } else {
      showSuccess('Localização salva com sucesso!');
      onLocationSaved();
      onClose();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Definir Localização</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <p className="text-sm text-gray-500">Sua localização atual: <span className="font-medium">{currentAddress}</span></p>
          <div className="space-y-2">
            <Label htmlFor="searchAddress">Buscar novo endereço</Label>
            <div className="flex space-x-2">
              <Input
                id="searchAddress"
                value={searchAddress}
                onChange={(e) => setSearchAddress(e.target.value)}
                placeholder="Ex: Av. Paulista, 1000, São Paulo"
              />
              <Button onClick={handleSearch} disabled={loadingGeocode}>
                {loadingGeocode ? <Loader2 className="h-4 w-4 animate-spin" /> : <MapPin className="h-4 w-4" />}
              </Button>
            </div>
          </div>

          {geocodeResult && (
            <div className="mt-4 p-3 border rounded-md bg-gray-50">
              <p className="font-semibold">Endereço Encontrado:</p>
              <p className="text-sm">{geocodeResult.formattedAddress}</p>
              <p className="text-xs text-gray-600">Lat: {geocodeResult.latitude.toFixed(4)}, Lng: {geocodeResult.longitude.toFixed(4)}</p>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={handleSave} disabled={!geocodeResult || isSavingLocation}>
            {isSavingLocation ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Salvar Localização'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UserLocationModal;