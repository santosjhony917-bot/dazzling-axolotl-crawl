import React from 'react';
import { Search as SearchIcon } from 'lucide-react';

const SearchPage: React.FC = () => {
  return (
    <div className="p-4 pt-10 min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-md mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-6 flex items-center">
          <SearchIcon className="w-7 h-7 mr-2 text-primary" /> Buscar
        </h1>
        
        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
          <p className="text-gray-600 dark:text-gray-400">
            Aqui você poderá buscar por restaurantes, pratos e categorias.
          </p>
          <p className="mt-4 text-sm text-gray-500">
            (Funcionalidade de busca em desenvolvimento.)
          </p>
        </div>
      </div>
    </div>
  );
};

export default SearchPage;