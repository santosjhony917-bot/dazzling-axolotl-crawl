import React from 'react';
import { ArrowLeft, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils/url';
import { Restaurant } from '@/types/restaurant';

interface PublicRestaurantLayoutProps {
  restaurant: Restaurant | null;
  children: React.ReactNode;
  title?: string; // Tornando opcional, pois pode ser derivado do restaurant.name
  backPath?: string;
}

const PublicRestaurantLayout: React.FC<PublicRestaurantLayoutProps> = ({ restaurant, children, title, backPath = 'home' }) => {
  const navigate = useNavigate();
  
  const displayTitle = title || restaurant?.name || "Restaurante";

  // Se o backPath for 'home', usamos navigate(-1) para voltar ao histórico.
  // Caso contrário, navegamos para o caminho especificado.
  const handleBack = () => {
    if (backPath === 'home') {
      navigate(-1);
    } else {
      navigate(createPageUrl(backPath));
    }
  };

  return (
    <div className="relative bg-[#f5f7f8] font-sans antialiased flex min-h-screen w-full flex-col items-center overflow-x-hidden">
      
      {/* Header */}
      <header className="flex items-center bg-white p-4 pb-2 justify-between sticky top-0 z-20 shadow-sm w-full max-w-md mx-auto">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBack}
          className="text-[#022D68] hover:bg-[#022D68]/5"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <div className="flex items-center gap-2">
          <Store className="w-6 h-6 text-[#022D68]" />
          <h2 className="text-[#022D68] text-xl font-bold">{displayTitle}</h2>
        </div>
        <div className="w-10"></div>
      </header>

      <main className="flex-1 w-full max-w-md">
        {children}
      </main>
    </div>
  );
};

export default PublicRestaurantLayout;