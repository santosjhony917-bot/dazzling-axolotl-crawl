import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Pizza, Heart, Loader2, ArrowLeft, Utensils, AlertTriangle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { useMenuItemFavorites } from '@/hooks/useMenuItemFavorites';
import { useAuthData } from '@/context/AuthContext';
import { cn } from '@/lib/utils';
import { formatPrice } from '@/utils/formatters';
import { showError } from '@/utils/toast';
import { createPageUrl } from '@/utils/url';
import { useQuery } from '@tanstack/react-query';
import { fetchMenuItemById } from '@/integrations/supabase/restaurant';
import { MenuItem, Restaurant } from '@/types/supabase';
import { PLACEHOLDER_IMAGE_URL } from '@/constants/assets';
import Header from '@/components/Header';

// Tipo de dado esperado após o fetch
type DetailedMenuItem = (MenuItem & { restaurant: Restaurant | null });

const MenuItemDetails: React.FC = () => {
  const { itemId } = useParams<{ itemId: string }>();
  const navigate = useNavigate();
  const { isAuthenticated } = useAuthData();
  
  useEffect(() => {
    if (!itemId) {
      showError("ID do item não encontrado.");
      navigate(-1);
    }
  }, [itemId, navigate]);
  
  // Query para buscar os detalhes do item
  const { data: itemData, isLoading, error } = useQuery<DetailedMenuItem | null, Error>({
    queryKey: ['menuItemDetails', itemId],
    queryFn: () => fetchMenuItemById(itemId || ''),
    enabled: !!itemId,
    staleTime: 1000 * 60 * 5,
  });
  
  // Usando o hook de favoritos
  const { isFavorite, toggleFavorite, isLoading: isFavoriteMutating } = useMenuItemFavorites(itemId || '');
  
  const handleBack = () => navigate(-1);

  if (!itemId) {
    return null;
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  if (error || !itemData) {
    return (
      <div className="p-6 text-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-800 mb-2">Prato Não Encontrado</h2>
        <p className="text-gray-600 mb-6">O item de menu solicitado não existe ou foi removido.</p>
        <Button onClick={handleBack}>
          Voltar
        </Button>
      </div>
    );
  }
  
  const restaurantName = itemData.restaurant?.name || 'Restaurante Desconhecido';
  const restaurantId = itemData.restaurant?.id;

  let descText = itemData.description || '';
  let options: any[] = [];
  try {
    if (itemData.description && itemData.description.startsWith('{')) {
      const parsed = JSON.parse(itemData.description);
      descText = parsed.description || '';
      options = parsed.options || [];
    }
  } catch (e) {
    // ignore
  }

  return (
    <div className="min-h-screen bg-background-light max-w-md mx-auto flex flex-col">
      <Header 
        title="Detalhes do Prato"
        leftAction={{ icon: ArrowLeft, onClick: handleBack }}
      />
 
      <main className="p-4 space-y-6 flex-grow">
        <Card className="border border-slate-100 bg-white p-0 overflow-hidden rounded-2xl shadow-none">
          
          {/* Imagem do Prato */}
          <div className="h-64 w-full bg-gray-200 relative">
            <img 
              src={itemData.image_url || PLACEHOLDER_IMAGE_URL} 
              alt={itemData.name} 
              className="w-full h-full object-cover"
            />
            
            {/* Botão de Favoritar */}
            <Button
              variant="ghost"
              size="icon"
              onClick={toggleFavorite}
              disabled={!isAuthenticated || isFavoriteMutating}
              className="absolute top-4 right-4 rounded-full h-10 w-10 shadow-none border border-slate-100 bg-white/95 backdrop-blur-sm hover:bg-white flex items-center justify-center"
            >
              {isFavoriteMutating ? (
                <Loader2 className="w-5 h-5 animate-spin text-red-500" />
              ) : (
                <Heart 
                  className={cn(
                    "w-5 h-5 transition-colors",
                    isFavorite ? "text-red-500 fill-red-500" : "text-slate-400 hover:text-red-500"
                  )}
                />
              )}
            </Button>
          </div>
 
          <CardContent className="p-6 space-y-4">
            <h1 className="text-xl font-extrabold text-slate-800">{itemData.name}</h1>
            
            <p className="text-2xl font-black text-highlight">
              {formatPrice(itemData.price)}
            </p>
            
            {descText && (
              <p className="text-slate-600 text-sm leading-relaxed">
                {descText}
              </p>
            )}
            
            {options.length > 0 && (
              <div className="space-y-4 pt-2">
                <Separator className="bg-slate-100" />
                {options.map((optGroup, gIdx) => (
                  <div key={gIdx} className="space-y-2.5">
                    <h3 className="text-xs font-extrabold text-slate-400 uppercase tracking-wider">
                      {optGroup.title}
                    </h3>
                    <div className="grid grid-cols-1 gap-2">
                      {optGroup.itens.map((opt: any, oIdx: number) => (
                        <div 
                          key={oIdx} 
                          className="flex justify-between items-center bg-slate-50/50 hover:bg-slate-50 px-3 py-2.5 rounded-xl border border-slate-100/60 transition-colors"
                        >
                          <span className="text-sm font-semibold text-slate-700">{opt.name}</span>
                          {opt.price > 0 ? (
                            <span className="text-xs font-bold text-[#EF2A39] bg-[#EF2A39]/8 px-2 py-0.5 rounded-md">
                              +{formatPrice(opt.price)}
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                              Incluso
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="flex items-center gap-2 text-slate-500 text-xs font-semibold pt-2">
              <Utensils className="w-4 h-4 text-highlight/70" />
              <p>Servido por: <span className="text-slate-700">{restaurantName}</span></p>
            </div>
            
            {restaurantId && (
              <Button 
                onClick={() => navigate(createPageUrl('restaurantProfile', { restaurantId: restaurantId }))}
                variant="outline"
                className="w-full h-11 rounded-2xl border border-slate-200 text-slate-700 font-bold hover:bg-slate-50 shadow-none transition-colors"
              >
                Ver Restaurante
              </Button>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default MenuItemDetails;