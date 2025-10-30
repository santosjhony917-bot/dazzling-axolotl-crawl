import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { ArrowRight, Clipboard } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Label } from '@/components/ui/label';

interface Phase1Data {
  name: string;
  category: string;
  external_url: string;
  description: string;
}

interface UploadPhase1Props {
  onNext: (data: Phase1Data) => void;
  initialData: Partial<Phase1Data>;
}

const UploadPhase1: React.FC<UploadPhase1Props> = ({ onNext, initialData }) => {
  const [data, setData] = useState<Phase1Data>({
    name: initialData.name || '',
    category: initialData.category || '',
    external_url: initialData.external_url || '',
    description: initialData.description || '',
  });
  const [pasteInput, setPasteInput] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { id, value } = e.target;
    setData(prev => ({ ...prev, [id]: value }));
  };

  const handlePasteChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const pastedText = e.target.value;
    setPasteInput(pastedText);
    
    // Tenta analisar os dados colados (assumindo separação por tabulação ou vírgula)
    // Remove quebras de linha e divide por tabulação ou vírgula
    const cleanedText = pastedText.replace(/[\r\n]/g, '');
    const columns = cleanedText.split(/[\t,]/).map(col => col.trim());
    
    if (columns.length >= 3) {
      setData(prev => ({
        ...prev,
        name: columns[0] || prev.name,
        category: columns[1] || prev.category,
        external_url: columns[2] || prev.external_url,
        description: columns[3] || prev.description,
      }));
    }
  };

  const isFormValid = data.name && data.category && data.external_url;

  return (
    <Card className="border-none shadow-none">
      <CardHeader>
        <CardTitle className="text-xl text-[#022D68]">1. Dados Básicos do Restaurante</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-gray-600 mb-4">
          Cole os dados mínimos para criar o registro do restaurante. O <code>external_url</code> será usado como chave de referência nas próximas fases.
        </p>
        
        {/* Área de Colagem para Coluna por Coluna */}
        <div className="mb-6 p-4 border border-dashed rounded-xl bg-gray-50">
            <Label htmlFor="paste-input" className="flex items-center gap-2 text-sm font-semibold text-gray-800 mb-2">
                <Clipboard className="w-4 h-4" /> Colar Dados de Planilha (Coluna por Coluna)
            </Label>
            <Textarea
                id="paste-input"
                value={pasteInput}
                onChange={handlePasteChange}
                placeholder="Cole aqui uma linha de dados (Nome, Categoria, URL Externa, Descrição) separados por tabulação ou vírgula."
                className="rounded-lg min-h-[60px]"
            />
            <p className="text-xs text-gray-500 mt-1">
                Os campos abaixo serão preenchidos automaticamente.
            </p>
        </div>
        
        <Separator className="my-6" />

        <div className="space-y-4">
          {/* Name */}
          <div>
            <label htmlFor="name" className="text-sm font-medium text-gray-700 block mb-1">Nome do Restaurante *</label>
            <Input
              id="name"
              value={data.name}
              onChange={handleChange}
              placeholder="Ex: Pizzaria do João"
              className="h-10 rounded-xl"
            />
          </div>

          {/* Category */}
          <div>
            <label htmlFor="category" className="text-sm font-medium text-gray-700 block mb-1">Categoria *</label>
            <Input
              id="category"
              value={data.category}
              onChange={handleChange}
              placeholder="Ex: Italiana, Japonesa, Hamburgueria"
              className="h-10 rounded-xl"
            />
          </div>

          {/* External URL */}
          <div>
            <label htmlFor="external_url" className="text-sm font-medium text-gray-700 block mb-1">URL Externa (Chave Única) *</label>
            <Input
              id="external_url"
              value={data.external_url}
              onChange={handleChange}
              placeholder="Ex: https://ifood.com/pizzaria-joao"
              className="h-10 rounded-xl"
            />
          </div>

          {/* Description */}
          <div>
            <label htmlFor="description" className="text-sm font-medium text-gray-700 block mb-1">Descrição</label>
            <Textarea
              id="description"
              value={data.description}
              onChange={handleChange}
              placeholder="Uma breve descrição do restaurante."
              className="rounded-xl"
            />
          </div>
        </div>

        <Button 
          onClick={() => onNext(data)}
          disabled={!isFormValid}
          className="mt-6 w-full bg-highlight hover:bg-highlight/90 h-10"
        >
          Próxima Fase <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </CardContent>
    </Card>
  );
};

export default UploadPhase1;