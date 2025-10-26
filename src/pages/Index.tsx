import React from 'react';
import ClientLayout from '@/components/ClientLayout';
import HomeActionButtons from '@/components/HomeActionButtons';
import { Search, Utensils } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { useNavigate } from 'react-router-dom';

const Index: React.FC = () => {
  const navigate = useNavigate();

  const handleSearchClick = () => {
    navigate('/search-unified');
  };

  return (
    <ClientLayout>
      <div className="flex flex-col min-h-screen bg-gray-50">
        
        {/* Barra de Busca Centralizada */}
        <div className="p-4 bg-white shadow-sm">
          <div 
            className="relative flex items-center w-full cursor-pointer"
            onClick={handleSearchClick}
          >
            <Search className="absolute left-3 h-5 w-5 text-gray-400" />
            <Input
              type="text"
              placeholder="Buscar restaurantes ou pratos..."
              className="w-full pl-10 pr-4 py-2 rounded-full bg-gray-100 border-none focus-visible:ring-0 pointer-events-none"
              readOnly
            />
          </div>
        </div>

        {/* Botões de Ação Rápida (Preço e Distância) */}
        <HomeActionButtons />

        {/* Conteúdo Principal da Home (Recomendações, Destaques, etc.) */}
        <div className="flex-1 p-4 space-y-6">
          <h2 className="text-xl font-bold text-[#022D68]">Restaurantes em Destaque</h2>
          
          {/* Placeholder para lista de restaurantes */}
          <div className="space-y-4">
            {[1, 2, 3].map(i => (
              <div key={i} className="bg-white p-4 rounded-lg shadow-md flex items-center space-x-4">
                <div className="w-16 h-16 bg-gray-200 rounded-lg flex items-center justify-center text-gray-500">
                  <Utensils className="w-6 h-6" />
                </div>
                <div>
                  <h3 className="font-semibold text-lg">Restaurante Exemplo {i}</h3>
                  <p className="text-sm text-gray-500">Cozinha Brasileira • 2.5 km</p>
                </div>
              </div>
            ))}
          </div>

          <h2 className="text-xl font-bold text-[#022D68] pt-4">Pratos Populares Próximos</h2>
          
          {/* Placeholder para lista de pratos */}
          <div className="grid grid-cols-2 gap-4">
            {[1, 2, 3, 4].map(i => (
              <div key={i} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="h-24 bg-gray-300 flex items-center justify-center text-gray-500">
                  <Utensils className="w-6 h-6" />
                </div>
                <div className="p-3">
                  <h4 className="font-medium text-sm truncate">Prato Delicioso {i}</h4>
                  <p className="text-xs text-primary font-bold mt-1">R$ 25,00</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </ClientLayout>
  );
};

export default Index;