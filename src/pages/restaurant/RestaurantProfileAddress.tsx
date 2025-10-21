import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';

const RestaurantProfileAddress: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-4 sm:p-6">
      <div className="max-w-xl mx-auto">
        <header className="mb-6 flex items-center">
          <Link to="/restaurant/profile">
            <Button variant="ghost" size="icon" className="mr-2">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <h1 className="text-2xl font-bold text-primary dark:text-white">Endereço e Localização</h1>
        </header>

        <div className="bg-white dark:bg-gray-800 p-6 rounded-xl shadow-lg">
          <p className="text-gray-600 dark:text-gray-400">
            Gerencie o endereço físico e as coordenadas de localização do seu restaurante.
          </p>
          {/* Conteúdo do formulário virá aqui */}
          <div className="mt-6">
            <Button className="w-full">Salvar Alterações</Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default RestaurantProfileAddress;