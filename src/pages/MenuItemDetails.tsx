import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Pizza, Heart, Loader2, ArrowLeft, Utensils } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useMenuItemFavorites } from '@/hooks/useMenuItemFavorites';
import { useAuthData } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { showError } from '@/utils/toast';
import { createPageUrl } from '@/utils/url'; // <-- Import adicionado

// Mock Data para simular a busca do item
const mockMenuItem = {
  id: 'mock-item-123',
  name: 'Pizza Margherita Clássica',
  description: 'Molho de tomate fresco, mussarela de búfala, manjericão e azeite extra virgem.',
  price: 45.90,
  imageUrl: 'https://images.unsplash.com/photo-1574071318508-1cdbab80aa9b?q=80&w=1974&auto=format&fit=crop',
  restaurantName: 'Pizzaria Bella Napoli',
  restaurantId: 'r1',
};

const MenuItemDetails: React.FC = () => {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthData();
  
  // Usando o hook de favoritos
  const { isFavorite, toggleFavorite, isLoading: isFavoriteMutating } = useMenuItemFavorites(itemId || mockMenuItem.id);
  
  // Simulação de carregamento de dados do item
  const [itemData, setItemData] = useState(mockMenuItem);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Em uma aplicação real, você faria uma busca aqui:
    // fetchItemDetails(itemId).then(setItemData).catch(setError);
    if (!itemId) {
      showError("ID do item não encontrado.");
      navigate(-1);
    }
  }, [itemId, navigate]);
  
  const handleBack = () => navigate(-1);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-light max-w-md mx-auto">
      
      {/* Header Fixo */}
      <header className="flex items-center bg-white p-4 pb-2 justify-between sticky top-0 z-20 shadow-soft-md w-full max-w-md mx-auto">
        <Button
          variant="ghost"
          size="icon"
          onClick={handleBack}
          className="text-[#022D68] hover:bg-[#022D68]/5"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h2 className="text-[#022D68] text-xl font-bold">Detalhes do Prato</h2>
        <div className="w-10"></div>
      </header>

      <main className="p-4 space-y-6">
        <Card className="shadow-soft-xl border-none rounded-2xl bg-white p-0 overflow-hidden">
          
          {/* Imagem do Prato */}
          <div className="h-64 w-full bg-gray-200 relative">
            <img 
              src={itemData.imageUrl} 
              alt={itemData.name} 
              className="w-full h-full object-cover"
            />
            
            {/* Botão de Favoritar */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFavorite}
              disabled={!isAuthenticated || isFavoriteMutating}
              className="absolute top-4 right-4 rounded-full h-10 w-10 shadow-soft-md bg-white/80 backdrop-blur-sm hover:bg-white"
            >
              {isFavoriteMutating ? (
                <Loader2 className="w-5 h-5 animate-spin text-red-500" />
              ) : (
                <Heart 
                  className={cn(
                    "w-5 h-5 transition-colors",
                    isFavorite ? "text-red-500 fill-red-500" : "text-gray-500 hover:text-red-500"
                  )}
                />
              )}
            </Button>
          </div>

          <CardContent className="p-6 space-y-4">
            <h1 className="text-3xl font-extrabold text-primary">{itemData.name}</h1>
            
            <p className="text-4xl font-extrabold text-highlight">
              R$ {itemData.price.toFixed(2).replace('.', ',')}
            </p>
            
            <p className="text-gray-700 text-base leading-relaxed">
              {itemData.description}
            </p>
            
            <div className="flex items-center gap-2 text-gray-600">
              <Utensils className="w-5 h-5 text-primary" />
              <p className="font-semibold">Servido por: {itemData.restaurantName}</p>
            </div>
            
            <Button 
              onClick={() => navigate(createPageUrl('restaurantProfile', { restaurantId: itemData.restaurantId }))}
              variant="outline"
              className="w-full h-12 rounded-xl border-2 border-primary text-primary font-bold hover:bg-primary/5"
            >
              Ver Restaurante
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default MenuItemDetails;