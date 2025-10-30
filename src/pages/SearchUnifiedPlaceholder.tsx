import React from 'react';
import { Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

const SearchUnifiedPlaceholder: React.FC = () => {
  return (
    <div className="min-h-screen bg-white p-4 max-w-md mx-auto text-center flex items-center justify-center">
      <Card className="shadow-soft-xl border-none rounded-2xl bg-white p-8 w-full">
        <Search className="w-12 h-12 text-primary mx-auto mb-4" />
        <h1 className="text-2xl font-bold text-[#022D68] mb-2">Busca Unificada</h1>
        <p className="text-gray-600">Pesquise por restaurantes ou itens de menu.</p>
      </Card>
    </div>
  );
};

export default SearchUnifiedPlaceholder;