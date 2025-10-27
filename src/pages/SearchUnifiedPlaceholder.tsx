import React from 'react';
import { Search } from 'lucide-react';

const SearchUnifiedPlaceholder: React.FC = () => {
  return (
    <div className="p-4 max-w-md mx-auto text-center">
      <Search className="w-12 h-12 text-primary mx-auto mt-10 mb-4" />
      <h1 className="text-2xl font-bold text-[#022D68] mb-2">Busca Unificada</h1>
      <p className="text-gray-600">Pesquise por restaurantes ou itens de menu.</p>
    </div>
  );
};

export default SearchUnifiedPlaceholder;