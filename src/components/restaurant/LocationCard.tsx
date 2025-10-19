import React, { useState, useEffect } from 'react';
import { MapPin, Phone, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { fetchAddressSuggestions, formatCEP, isCEP } from '@/services/geocoding';
import { showError } from '@/utils/toast';

interface Location {
  id: number;
  cep: string;
  street: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  phone: string;
}

interface LocationCardProps {
  location: Location;
  onUpdate: (id: number, field: keyof Location, value: string) => void;
  onRemove: (id: number) => void;
}

const LocationCard: React.FC<LocationCardProps> = ({ location, onUpdate, onRemove }) => {
  const [isSearchingCep, setIsSearchingCep] = useState(false);

  // Effect to handle CEP lookup
  useEffect(() => {
    const cleanedCep = location.cep.replace(/\D/g, '');
    
    if (cleanedCep.length === 8) {
      handleCepLookup(cleanedCep);
    }
  }, [location.cep]);

  const handleCepLookup = async (cep: string) => {
    setIsSearchingCep(true);
    try {
      // Using fetchAddressSuggestions which prioritizes ViaCEP lookup for 8-digit CEPs
      const suggestions = await fetchAddressSuggestions(cep);

      if (suggestions.length > 0) {
        const addressData = suggestions[0];
        
        // We need to reverse geocode the address string back to GeocodedAddress structure
        // Since fetchAddressSuggestions returns AddressSuggestion, we need to parse the address string
        // For simplicity and relying on the existing structure, we assume the first suggestion is the best match.
        
        // Note: The current implementation of fetchAddressSuggestions returns a complex label/address string.
        // We need a dedicated function to parse the full address from ViaCEP/Nominatim into our Location fields.
        
        // Since ViaCEP data is only available internally in fetchViaCEP, we'll simulate parsing the address string
        // or rely on the fact that ViaCEP returns structured data (which is handled inside fetchViaCEP).
        
        // Let's refactor the logic to directly use a dedicated CEP lookup function if possible, 
        // but for now, we rely on the structure returned by fetchAddressSuggestions when a CEP is provided.
        
        // Since we cannot easily extract structured data (street, city, state) from the AddressSuggestion object 
        // without modifying the geocoding service to expose the raw ViaCEP result, 
        // I will implement a simplified parsing based on the `address` field, or assume the `fetchAddressSuggestions` 
        // for CEP returns a highly accurate result that we can use to update the fields.
        
        // Given the constraints, I will modify the logic to use the `geocodeAddress` utility 
        // to get coordinates and then rely on the user to fill in the number/street if necessary, 
        // but for CEP, we need the structured data.
        
        // Since the existing `fetchAddressSuggestions` handles CEP lookup internally via `fetchViaCEP`, 
        // I will assume the `fetchViaCEP` logic is sound and try to extract the structured data from the suggestion.
        
        // Re-implementing CEP lookup directly here for structured data:
        const response = await fetch(`https://viacep.com.br/ws/${cleanedCep}/json/`);
        const data = await response.json();

        if (!data.erro) {
          onUpdate(location.id, 'street', data.logradouro || '');
          onUpdate(location.id, 'neighborhood', data.bairro || '');
          onUpdate(location.id, 'city', data.localidade || '');
          onUpdate(location.id, 'state', data.uf || '');
          // Number is usually not returned by CEP services, so we leave it empty for user input
          showSuccess("Endereço preenchido automaticamente!");
        } else {
          showError("CEP não encontrado.");
        }
      } else {
        // If suggestions are empty, it means ViaCEP failed or the query was not a valid CEP
        if (isCEP(location.cep)) {
             showError("CEP não encontrado.");
        }
      }
    } catch (error) {
      console.error("CEP lookup failed:", error);
      showError("Erro ao buscar CEP.");
    } finally {
      setIsSearchingCep(false);
    }
  };

  const handleCepChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value;
    const formattedValue = formatCEP(rawValue);
    onUpdate(location.id, 'cep', formattedValue);
  };

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
        {/* CEP */}
        <div className="relative">
          <Input
            value={location.cep}
            onChange={handleCepChange}
            placeholder="CEP (Ex: 58039-000)"
            className="h-10 rounded-full text-sm border-gray-200 focus:border-[#022D68] focus:ring-[#022D68] pr-12"
            maxLength={9}
            disabled={isSearchingCep}
          />
          {isSearchingCep && (
            <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-[#E47948]" />
          )}
        </div>

        {/* Rua */}
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-[#E47948] shrink-0" />
          <Input
            value={location.street}
            onChange={(e) => onUpdate(location.id, 'street', e.target.value)}
            placeholder="Rua / Avenida"
            className="h-10 rounded-full text-sm border-gray-200 focus:border-[#022D68] focus:ring-[#022D68]"
            required
          />
        </div>

        {/* Número */}
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 text-[#E47948] shrink-0 text-center font-bold text-sm">#</span>
          <Input
            value={location.number}
            onChange={(e) => onUpdate(location.id, 'number', e.target.value)}
            placeholder="Número"
            className="h-10 rounded-full text-sm border-gray-200 focus:border-[#022D68] focus:ring-[#022D68]"
            required
          />
        </div>

        {/* Cidade e Estado */}
        <div className="flex gap-3">
          <Input
            value={location.city}
            onChange={(e) => onUpdate(location.id, 'city', e.target.value)}
            placeholder="Cidade"
            className="h-10 rounded-full text-sm border-gray-200 focus:border-[#022D68] focus:ring-[#022D68]"
            required
          />
          <Input
            value={location.state}
            onChange={(e) => onUpdate(location.id, 'state', e.target.value)}
            placeholder="Estado (UF)"
            className="h-10 rounded-full text-sm border-gray-200 focus:border-[#022D68] focus:ring-[#022D68] w-20 shrink-0"
            maxLength={2}
            required
          />
        </div>

        {/* Telefone */}
        <div className="flex items-center gap-2 pt-2">
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