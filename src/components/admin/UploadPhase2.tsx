import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ArrowRight, MapPin } from 'lucide-react';

interface Phase2Data {
  address: string;
  latitude: number | null;
  longitude: number | null;
}

interface UploadPhase2Props {
  onNext: (data: Phase2Data) => void;
  initialData: Partial<Phase2Data>;
}

const UploadPhase2: React.FC<UploadPhase2Props> = ({ onNext, initialData }) => {
  const [data, setData] = useState<Phase2Data>({
    address: initialData.address || '',
    latitude: initialData.latitude || null,
    longitude: initialData.longitude || null,
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { id, value } = e.target;
    setData(prev => ({ 
      ...prev, 
      [id]: id === 'latitude' || id === 'longitude' ? (parseFloat(value) || null) : value 
    }));
  };

  const isFormValid = data.address && data.latitude !== null && data.longitude !== null;

  return (
    <Card className="border-none shadow-none">
      <CardHeader>
        <CardTitle className="text-xl text-[#022D68]">2. Localização e Coordenadas</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-gray-600 mb-4">
          Insira o endereço completo e as coordenadas geográficas (Latitude e Longitude).
        </p>

        {/* Address */}
        <div>
          <label htmlFor="address" className="text-sm font-medium text-gray-700 block mb-1">Endereço Completo *</label>
          <Input
            id="address"
            value={data.address}
            onChange={handleChange}
            placeholder="Ex: Rua Principal, 123, Centro, Cidade"
            className="h-10 rounded-xl"
          />
        </div>

        {/* Latitude */}
        <div>
          <label htmlFor="latitude" className="text-sm font-medium text-gray-700 block mb-1">Latitude *</label>
          <Input
            id="latitude"
            type="number"
            value={data.latitude ?? ''}
            onChange={handleChange}
            placeholder="Ex: -23.5505"
            className="h-10 rounded-xl"
          />
        </div>

        {/* Longitude */}
        <div>
          <label htmlFor="longitude" className="text-sm font-medium text-gray-700 block mb-1">Longitude *</label>
          <Input
            id="longitude"
            type="number"
            value={data.longitude ?? ''}
            onChange={handleChange}
            placeholder="Ex: -46.6333"
            className="h-10 rounded-xl"
          />
        </div>

        <Button 
          onClick={() => onNext(data)}
          disabled={!isFormValid}
          className="mt-6 w-full bg-highlight hover:bg-highlight/90 h-10"
        >
          Próxima Fase (Cardápio) <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
};

export default UploadPhase2;