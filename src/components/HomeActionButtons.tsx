import React from 'react';
import { Utensils, MapPin } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';

const HomeActionButtons: React.FC = () => {
  const navigate = useNavigate();

  const handleSearchByPrice = () => {
    // Navegar para a busca unificada com filtro de preço pré-selecionado, se necessário
    navigate('/search-unified?filter=price');
  };

  const handleSearchByDistance = () => {
    // Navegar para a busca unificada com filtro de distância pré-selecionado, se necessário
    navigate('/search-unified?filter=distance');
  };

  return (
    <div className="flex justify-between gap-3 p-4 bg-white border-b">
      <Button 
        onClick={handleSearchByPrice}
        className="flex-1 h-16 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/30 shadow-sm"
      >
        <div className="flex flex-col items-center justify-center">
          <Utensils className="w-5 h-5 mb-1" />
          <span className="text-xs font-semibold text-center">Buscar Pratos por Preço</span>
        </div>
      </Button>
      <Button 
        onClick={handleSearchByDistance}
        className="flex-1 h-16 bg-primary/10 text-primary hover:bg-primary/20 border border-primary/30 shadow-sm"
      >
        <div className="flex flex-col items-center justify-center">
          <MapPin className="w-5 h-5 mb-1" />
          <span className="text-xs font-semibold text-center">Buscar Restaurantes por Distância</span>
        </div>
      </Button>
    </div>
  );
};

export default HomeActionButtons;