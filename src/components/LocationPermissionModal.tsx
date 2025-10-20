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
type LocationPreference = 'granted' | 'denied' | 'unset' | 'mock';

interface LocationPermissionModalProps {
  isOpen: boolean;
  onGrant: () => void;
  onDeny: () => void;
}

// Função utilitária para verificar a preferência de localização
export const checkLocationPreference = async (): Promise<LocationPreference> => {
  // Em um ambiente real, você verificaria o localStorage ou a API de geolocalização.
  const preference = localStorage.getItem('location_preference') as LocationPreference;
  
  if (preference === 'granted' || preference === 'denied' || preference === 'mock') {
    return preference;
  }
  
  // Usamos 'unset' para indicar que o usuário ainda não decidiu.
  return 'unset';
};

const LocationPermissionModal: React.FC<LocationPermissionModalProps> = ({ isOpen, onGrant, onDeny }) => {
  
  const handleGrant = () => {
    localStorage.setItem('location_preference', 'granted');
    onGrant();
  };

  const handleDeny = () => {
    localStorage.setItem('location_preference', 'denied');
    onDeny();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleDeny()}>
      <DialogContent className="sm:max-w-[425px] rounded-xl p-6">
        <DialogHeader className="text-center">
          <div className="flex justify-center mb-4">
            <MapPin className="w-10 h-10 text-[#E47948]" />
          </div>
          <DialogTitle className="text-2xl font-bold text-[#022D68]">
            Permissão de Localização
          </DialogTitle>
          <DialogDescription className="text-gray-600 mt-2">
            Para encontrar os melhores restaurantes próximos, precisamos da sua localização.
          </DialogDescription>
        </DialogHeader>
        
        <div className="py-4 space-y-3">
          <Button 
            onClick={handleGrant}
            className="w-full h-12 rounded-full bg-[#E47948] hover:bg-[#E47948]/90 text-white font-bold"
          >
            Permitir Localização
          </Button>
          <Button 
            onClick={handleDeny}
            variant="outline"
            className="w-full h-12 rounded-full border-gray-300 text-gray-700 hover:bg-gray-100"
          >
            Agora Não
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