import React, { useState, useEffect, useCallback } from 'react';
import { MapPin, Phone, X, Loader2 } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { formatCEP } from '@/services/geocoding';
import { showError, showSuccess } from '@/utils/toast';
import axios from 'axios';

interface Location {
  id: number;
  cep: string;
  street: string;
  number: string;
  complement: string; // Novo campo
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
  const [lastSearchedCep, setLastSearchedCep] = useState<string | null>(null);

  const handleCepLookup = useCallback(async (cep: string) => {
    const cleanedCep = cep.replace(/\D/g, '');
    if (cleanedCep.length !== 8) return;

    setIsSearchingCep(true);
    
    try {
      const response = await axios.get(`https://viacep.com.br/ws/${cleanedCep}/json/`);
      const data = response.data;

      console.log("ViaCEP response data:", data);

      if (!data.erro) {
        if (data.logradouro) onUpdate(location.id, 'street', data.logradouro);
        if (data.bairro) onUpdate(location.id, 'neighborhood', data.bairro);
        if (data.localidade) onUpdate(location.id, 'city', data.localidade);
        if (data.uf) onUpdate(location.id, 'state', data.uf);
        
        // O ViaCEP não retorna complemento, então não o atualizamos aqui.
        
        showSuccess("Endereço preenchido automaticamente!");
        setLastSearchedCep(cleanedCep);
      } else {
        showError("CEP não encontrado.");
        setLastSearchedCep(null);
      }
    } catch (error) {
      console.error("CEP lookup failed:", error);
      showError("Erro ao buscar CEP. Verifique sua conexão.");
      setLastSearchedCep(null);
    } finally {
      setIsSearchingCep(false);
    }
  }, [location.id, onUpdate]);

  // Debounce effect for CEP input
  useEffect(() => {
    const cleanedCep = location.cep.replace(/\D/g, '');
    
    if (cleanedCep.length === 8 && cleanedCep !== lastSearchedCep) {
      const timer = setTimeout(() => {
        handleCepLookup(location.cep);
      }, 500); 
      
      return () => clearTimeout(timer);
    }
  }, [location.cep, handleCepLookup, lastSearchedCep]);

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
        className="absolute top-2 right-2 h-8 w-8 text-red-500 hover:bg-red-50 rounded-lg"
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
            className="h-10 rounded-xl text-sm border-gray-200 focus:border-highlight focus:ring-highlight pr-12"
            maxLength={9}
            disabled={isSearchingCep}
            required
          />
          {isSearchingCep && (
            <Loader2 className="absolute right-4 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-highlight" />
          )}
        </div>

        {/* Rua */}
        <div className="flex items-center gap-2">
          <MapPin className="w-5 h-5 text-highlight shrink-0" />
          <Input
            value={location.street}
            onChange={(e) => onUpdate(location.id, 'street', e.target.value)}
            placeholder="Rua / Avenida"
            className="h-10 rounded-xl text-sm border-gray-200 focus:border-highlight focus:ring-highlight"
            required
          />
        </div>

        {/* Número */}
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 text-highlight shrink-0 text-center font-bold text-sm">#</span>
          <Input
            value={location.number}
            onChange={(e) => onUpdate(location.id, 'number', e.target.value)}
            placeholder="Número"
            className="h-10 rounded-xl text-sm border-gray-200 focus:border-highlight focus:ring-highlight"
            required
          />
        </div>
        
        {/* Complemento (Novo Campo) */}
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 text-highlight shrink-0 text-center font-bold text-sm">C</span>
          <Input
            value={location.complement}
            onChange={(e) => onUpdate(location.id, 'complement', e.target.value)}
            placeholder="Complemento (Ex: Sala 101, Bloco B)"
            className="h-10 rounded-xl text-sm border-gray-200 focus:border-highlight focus:ring-highlight"
          />
        </div>

        {/* Bairro */}
        <div className="flex items-center gap-2">
          <span className="w-5 h-5 text-highlight shrink-0 text-center font-bold text-sm">B</span>
          <Input
            value={location.neighborhood}
            onChange={(e) => onUpdate(location.id, 'neighborhood', e.target.value)}
            placeholder="Bairro"
            className="h-10 rounded-xl text-sm border-gray-200 focus:border-highlight focus:ring-highlight"
            required
          />
        </div>

        {/* Cidade e Estado */}
        <div className="flex gap-3">
          <Input
            value={location.city}
            onChange={(e) => onUpdate(location.id, 'city', e.target.value)}
            placeholder="Cidade"
            className="h-10 rounded-xl text-sm border-gray-200 focus:border-highlight focus:ring-highlight"
            required
          />
          <Input
            value={location.state}
            onChange={(e) => onUpdate(location.id, 'state', e.target.value)}
            placeholder="Estado (UF)"
            className="h-10 rounded-xl text-sm border-gray-200 focus:border-highlight focus:ring-highlight w-20 shrink-0"
            maxLength={2}
            required
          />
        </div>

        {/* Telefone */}
        <div className="flex items-center gap-2 pt-2">
          <Phone className="w-5 h-5 text-highlight shrink-0" />
          <Input
            value={location.phone}
            onChange={(e) => onUpdate(location.id, 'phone', e.target.value)}
            placeholder="Telefone de contato (obrigatório)"
            className="h-10 rounded-xl text-sm border-gray-200 focus:border-highlight focus:ring-highlight"
            required
          />
        </div>
      </div>
    </div>
  );
};

export default LocationCard;