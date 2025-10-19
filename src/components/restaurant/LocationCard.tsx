import React from 'react';
import { MapPin, Phone, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

interface Location {
  id: number;
  address: string;
  phone: string;
}

interface LocationCardProps {
  location: Location;
  onUpdate: (id: number, field: 'address' | 'phone', value: string) => void;
  onRemove: (id: number) => void;
}

const LocationCard: React.FC<LocationCardProps> = ({ location, onUpdate, onRemove }) => {
  return (
    <div className="bg-white p-4 rounded-xl shadow-md border border-gray-200 relative">
      <Button
        variant="ghost"
        size="icon"
        onClick={() => onRemove(location.id)}
        className="absolute top-2 right-2 h-8 w-8 text-red-500 hover:bg-red-50"
      >
        <X className="w-4 h-4" />
      </Button>
      
      <div className="space-y-3 pt-2">
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-[#E47948] shrink-0" />
          <Input
            value={location.address}
            onChange={(e) => onUpdate(location.id, 'address', e.target.value)}
            placeholder="Endereço completo da filial"
            className="h-10 rounded-full text-sm border-gray-200 focus:border-[#022D68] focus:ring-[#022D68]"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Phone className="w-5 h-5 text-[#E47948] shrink-0" />
          <Input
            value={location.phone}
            onChange={(e) => onUpdate(location.id, 'phone', e.target.value)}
            placeholder="Telefone de contato (opcional)"
            className="h-10 rounded-full text-sm border-gray-200 focus:border-[#022D68] focus:ring-[#022D68]"
          />
        </div>
      </div>
    </div>
  );
};

export default LocationCard;