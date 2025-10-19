import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { MapPin, LocateFixed } from 'lucide-react';

interface LocationPermissionModalProps {
  onPermissionGranted: () => void;
  onUseMockLocation: () => void;
}

const LOCATION_PERMISSION_KEY = 'locationPermissionGranted';
const MOCK_LOCATION_KEY = 'useMockLocation';

export const checkLocationPreference = (): 'granted' | 'mock' | 'unset' => {
  // Verifica se o usuário já escolheu usar o GPS
  if (localStorage.getItem(LOCATION_PERMISSION_KEY) === 'true') {
    return 'granted';
  }
  // Verifica se o usuário já escolheu usar a localização mock
  if (localStorage.getItem(MOCK_LOCATION_KEY) === 'true') {
    return 'mock';
  }
  // Se nenhuma preferência foi definida
  return 'unset';
};

export default function LocationPermissionModal({
  onPermissionGranted,
  onUseMockLocation,
}: LocationPermissionModalProps) {
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    // Apenas abre o modal se a preferência for 'unset'
    if (checkLocationPreference() === 'unset') {
      setIsOpen(true);
    }
  }, []);

  const handleGrant = () => {
    // Define a preferência como concedida
    localStorage.setItem(LOCATION_PERMISSION_KEY, 'true');
    localStorage.removeItem(MOCK_LOCATION_KEY);
    setIsOpen(false);
    onPermissionGranted();
  };

  const handleMock = () => {
    // Define a preferência como mock
    localStorage.setItem(MOCK_LOCATION_KEY, 'true');
    localStorage.removeItem(LOCATION_PERMISSION_KEY);
    setIsOpen(false);
    onUseMockLocation();
  };

  // Usamos Dialog para controlar a visibilidade
  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px] rounded-xl p-6">
        <DialogHeader className="text-center">
          <div className="flex justify-center mb-4">
            <LocateFixed className="w-10 h-10 text-[#E47948]" />
          </div>
          <DialogTitle className="text-2xl font-bold text-[#022D68]">
            Localização Necessária
          </DialogTitle>
          <DialogDescription className="text-gray-600 mt-2">
            Para encontrar os melhores restaurantes próximos, precisamos da sua localização.
          </DialogDescription>
        </DialogHeader>
        
        <div className="grid gap-4 py-4">
          <Button 
            onClick={handleGrant}
            className="w-full h-12 bg-[#E47948] hover:bg-[#E47948]/90 text-white rounded-full text-base font-bold shadow-lg"
          >
            <LocateFixed className="w-5 h-5 mr-2" />
            Permitir acesso ao GPS
          </Button>
          
          <Button 
            onClick={handleMock}
            variant="outline"
            className="w-full h-12 border-2 border-[#022D68] text-[#022D68] hover:bg-[#022D68]/5 rounded-full text-base font-bold"
          >
            <MapPin className="w-5 h-5 mr-2" />
            Usar localização padrão (João Pessoa)
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}