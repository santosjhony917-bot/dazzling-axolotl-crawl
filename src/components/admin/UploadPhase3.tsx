import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowRight, Menu } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';

interface Phase3Data {
  menu_items: any[]; // Simplificado para fins de placeholder
}

interface UploadPhase3Props {
  onNext: (data: Phase3Data) => void;
  initialData: Partial<Phase3Data>;
}

const UploadPhase3: React.FC<UploadPhase3Props> = ({ onNext, initialData }) => {
  const [menuInput, setMenuInput] = useState('');
  
  // NOTE: Em uma implementação real, você processaria o menuInput aqui
  // para gerar a estrutura de menu_items.

  const isFormValid = true; // Permitindo avançar mesmo sem dados por enquanto

  const handleNext = () => {
    // Simulação de processamento de dados do menu
    const processedData: Phase3Data = {
        menu_items: menuInput.split('\n').filter(line => line.trim() !== '').map(line => ({ name: line.trim() }))
    };
    onNext(processedData);
  }

  return (
    <Card className="border-none shadow-none">
      <CardHeader>
        <CardTitle className="text-xl text-[#022D68]">3. Cardápio e Itens</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-gray-600 mb-4">
          Cole os dados do cardápio (categorias e itens) para este restaurante.
        </p>

        {/* Menu Input Area */}
        <div>
          <label htmlFor="menu-input" className="text-sm font-medium text-gray-700 block mb-1">Dados do Cardápio (JSON/CSV/Texto)</label>
          <Textarea
            id="menu-input"
            value={menuInput}
            onChange={(e) => setMenuInput(e.target.value)}
            placeholder="Cole aqui os dados do cardápio (Ex: Categoria 1, Item A, Preço; Categoria 2, Item B, Preço)"
            className="rounded-xl min-h-[150px]"
          />
        </div>

        <Button 
          onClick={handleNext}
          disabled={!isFormValid}
          className="mt-6 w-full bg-highlight hover:bg-highlight/90 h-10"
        >
          Próxima Fase (Galeria) <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
};

export default UploadPhase3;