import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { MapPin } from 'lucide-react';

// Tipos de preferência de localização
export type LocationPreference = 'granted' | 'denied' | 'unset' | 'mock';

interface LocationPermissionModalProps {
  isOpen: boolean;
  onGrant: () => void;
  onDeny: () => void;
  // Adicionando a prop onUseMockLocation que estava faltando
  onUseMockLocation: () => void;
}

// Função utilitária para verificar a preferência de localização (agora síncrona)
export const checkLocationPreference = (): LocationPreference => {
  const preference = localStorage.getItem('location_preference') as LocationPreference;
  
  if (preference === 'granted' || preference === 'denied' || preference === 'mock') {
    return preference;
  }
  
  return 'unset';
};

const LocationPermissionModal: React.FC<LocationPermissionModalProps> = ({ isOpen, onGrant, onDeny, onUseMockLocation }) => {
  
  const handleGrant = () => {
    localStorage.setItem('location_preference', 'granted');
    onGrant();
  };

  const handleDeny = () => {
    localStorage.setItem('location_preference', 'denied');
    onDeny();
  };
  
  const handleUseMock = () => {
    localStorage.setItem('location_preference', 'mock');
    onUseMockLocation();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleDeny()}>
      <DialogContent className="sm:max-w-[425px] rounded-2xl p-6 shadow-none">
        <DialogHeader className="text-center">
          <div className="flex justify-center mb-4">
            <MapPin className="w-10 h-10 text-highlight" />
          </div>
          <DialogTitle className="text-2xl font-bold text-primary">
            Permissão de Localização
          </DialogTitle>
          <DialogDescription className="text-gray-600 mt-2">
            Para encontrar os melhores restaurantes próximos, precisamos da sua localização.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-3">
          <Button 
            onClick={handleGrant}
            variant="highlight"
            className="w-full h-12 rounded-2xl font-bold shadow-none"
          >
            Permitir Localização
          </Button>
          <Button 
            onClick={handleUseMock}
            variant="outline"
            className="w-full h-12 rounded-2xl border-gray-300 text-gray-700 hover:bg-gray-100 shadow-none"
          >
            Usar Localização Padrão
          </Button>
          <Button 
            onClick={handleDeny}
            variant="ghost"
            className="w-full h-12 text-sm text-gray-500 hover:bg-gray-100"
          >
            Agora Não (Desativar)
          </Button>
        </div>
        
        <DialogFooter className="text-center text-xs text-gray-500">
          Você pode alterar esta permissão nas configurações do seu dispositivo a qualquer momento.
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default LocationPermissionModal;