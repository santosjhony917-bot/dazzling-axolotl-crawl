import React from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface PublicRestaurantLayoutProps {
  // Define props if necessary
}

const PublicRestaurantLayout: React.FC<PublicRestaurantLayoutProps> = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gray-50 relative">
      
      {/* Botão de Voltar Flutuante (Para navegação do cliente) */}
      <div className="fixed top-4 left-4 z-50">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(-1)}
          className="bg-white/80 backdrop-blur-sm shadow-md hover:bg-white"
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
      </div>

      <main className="pb-10">
        <Outlet />
      </main>
    </div>
  );
};

export default PublicRestaurantLayout;