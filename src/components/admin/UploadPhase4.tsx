import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Image } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

interface Phase4Data {
  gallery_images: any[]; // Simplificado para fins de placeholder
}

interface UploadPhase4Props {
  onNext: (data: Phase4Data) => void;
  initialData: Partial<Phase4Data>;
}

const UploadPhase4: React.FC<UploadPhase4Props> = ({ onNext, initialData }) => {
  const [galleryInput, setGalleryInput] = useState('');
  
  // NOTE: Em uma implementação real, você processaria o galleryInput aqui
  // para gerar a estrutura de gallery_images.

  const isFormValid = true; // Permitindo avançar mesmo sem dados por enquanto

  const handleNext = () => {
    // Simulação de processamento de dados da galeria
    const processedData: Phase4Data = {
        gallery_images: galleryInput.split('\n').filter(line => line.trim() !== '').map(line => ({ url: line.trim() }))
    };
    onNext(processedData);
  }

  return (
    <Card className="border-none shadow-none">
      <CardHeader>
        <CardTitle className="text-xl text-[#022D68]">4. Galeria de Imagens</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-gray-600 mb-4">
          Cole as URLs das imagens da galeria do restaurante (uma URL por linha).
        </p>

        {/* Gallery Input Area */}
        <div>
          <label htmlFor="gallery-input" className="text-sm font-medium text-gray-700 block mb-1">URLs das Imagens</label>
          <Textarea
            id="gallery-input"
            value={galleryInput}
            onChange={(e) => setGalleryInput(e.target.value)}
            placeholder="Cole aqui as URLs das imagens (uma por linha)"
            className="rounded-xl min-h-[150px]"
          />
        </div>

        <Button 
          onClick={handleNext}
          disabled={!isFormValid}
          className="mt-6 w-full bg-highlight hover:bg-highlight/90 h-10"
        >
          Próxima Fase (Finalizar) <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
};

export default UploadPhase4;