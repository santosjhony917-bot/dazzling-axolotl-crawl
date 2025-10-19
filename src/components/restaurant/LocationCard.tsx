import React, { useState, useEffect, useCallback } from 'react';
import { MapPin, Phone, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { formatCEP, isCEP } from '@/services/geocoding';
import { showError, showSuccess } from '@/utils/toast';
import axios from 'axios';

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

  const handleCepLookup = useCallback(async (cep: string) => {
    const cleanedCep = cep.replace(/\D/g, '');
    if (cleanedCep.length !== 8) return;

    setIsSearchingCep(true);
    
    try {
      const response = await axios.get(`https://viacep.com.br/ws/${cleanedCep}/json/`);
      const data = response.data;

      if (!data.erro) {
        onUpdate(location.id, 'street', data.logradouro || '');
        onUpdate(location.id, 'neighborhood', data.bairro || '');
        onUpdate(location.id, 'city', data.localidade || '');
        onUpdate(location.id, 'state', data.uf || '');
        showSuccess("Endereço preenchido automaticamente!");
      } else {
        showError("CEP não encontrado.");
      }
    } catch (error) {
      console.error("CEP lookup failed:", error);
      showError("Erro ao buscar CEP. Verifique sua conexão ou o CEP digitado.");
    } finally {
      setIsSearchingCep(false);
    }
  }, [location.id, onUpdate]);

  // Debounce effect for CEP input
  useEffect(() => {
    const cleanedCep = location.cep.replace(/\D/g, '');
    
    if (cleanedCep.length === 8) {
      const timer = setTimeout(() => {
        handleCepLookup(location.cep);
      }, 500); // Wait 500ms after typing stops
      
      return () => clearTimeout(timer);
    }
  }, [location.cep, handleCepLookup]);

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

        {/* Bairro */}
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 text-[#E47948] shrink-0 text-center font-bold text-sm">B</span>
          <Input
            value={location.neighborhood}
            onChange={(e) => onUpdate(location.id, 'neighborhood', e.target.value)}
            placeholder="Bairro"
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