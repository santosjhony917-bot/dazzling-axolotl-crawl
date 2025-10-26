import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Clock, CreditCard, Heart, Share2 } from 'lucide-react';
import { Restaurant } from '@/types/supabase';
import { createPageUrl, PageUrl } from '@/utils/url';
import { formatSchedule } from '@/utils/schedule';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { DEFAULT_RESTAURANT_LOGO_URL } from '@/constants/assets';
import { WeekSchedule } from '@/types/schedule';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import MenuItemCard from '@/components/restaurant/MenuItemCard';

interface FreeProfileLayoutProps {
  restaurant: Restaurant;
}

// Dados mockados para o menu (para simular a tela)
const mockMenuItems = [
  { name: "Pizza Calabresa", price: 39.90, imageUrl: "https://via.placeholder.com/150/f0f0f0?text=Pizza" },
  { name: "Pizza Pepperoni", price: 42.50, imageUrl: "https://via.placeholder.com/150/f0f0f0?text=Pizza" },
  { name: "Frango c/ Catupiry", price: 41.00, imageUrl: "https://via.placeholder.com/150/f0f0f0?text=Frango" },
  { name: "Pudim de Leite", price: 12.00, imageUrl: "https://via.placeholder.com/150/f0f0f0?text=Pudim" },
  { name: "Mousse de Maracujá", price: 10.50, imageUrl: "https://via.placeholder.com/150/f0f0f0?text=Mousse" },
  { name: "Refrigerante Lata", price: 5.00, imageUrl: "https://via.placeholder.com/150/f0f0f0?text=Refri" },
  { name: "Suco Natural 500ml", price: 8.00, imageUrl: "https://via.placeholder.com/150/f0f0f0?text=Suco" },
];


// Componente auxiliar para um item de informação (Endereço, Horário, Pagamento)
const InfoItem: React.FC<{ icon: React.ElementType, label: string, value: string | React.ReactNode }> = ({ icon: Icon, label, value }) => {
  return (
    <div className="flex items-start gap-3 text-gray-700 dark:text-gray-300">
      <Icon className="w-5 h-5 flex-shrink-0 mt-1 text-primary dark:text-highlight" />
      <div className="flex flex-col text-base flex-1">
        <p className="text-gray-900 dark:text-white font-semibold leading-snug">{label}</p>
        {typeof value === 'string' ? (
          <p className="text-gray-600 dark:text-gray-400 text-sm leading-snug mt-0.5">{value}</p>
        ) : (
          <div className="text-gray-600 dark:text-gray-400 text-sm leading-snug mt-0.5">{value}</div>
        )}
      </div>
    </div>
  );
};


export default function FreeProfileLayout({ restaurant }: FreeProfileLayoutProps) {
  const navigate = useNavigate();
  const formattedSchedule = formatSchedule(restaurant.opening_hours as unknown as WeekSchedule | null | undefined);
  
  const [followersCount, setFollowersCount] = useState(0); 
  const [isFavorite, setIsFavorite] = useState(false);
  
  const handleFollowToggle = () => {
    setFollowersCount(prev => prev + 1);
    // Lógica de seguir
  };

  const handleFavoriteToggle = () => {
    setIsFavorite(prev => !prev);
    // Lógica de favoritar
  };

  const handleShare = () => {
    // Lógica de compartilhar
  };

  const fullAddress = restaurant.address && restaurant.number 
    ? `${restaurant.address}, ${restaurant.number} - ${restaurant.neighborhood}, ${restaurant.city}/${restaurant.state}`
    : `${restaurant.address || restaurant.city || 'Endereço não informado'}`;

  // Mock de formas de pagamento, pois não temos esse campo no schema
  const paymentMethods = "Dinheiro, Pix, Cartão de Crédito";

  return (
    <div className="min-h-screen bg-[#f5f7f8] dark:bg-gray-900">
      
      <main className="max-w-md mx-auto pb-16 relative z-10 bg-white dark:bg-gray-800 shadow-lg md:rounded-xl">
        
        {/* Header Fixo (Logo, Nome, Ações) */}
        <div className="p-4 bg-white dark:bg-gray-800 sticky top-0 z-30 border-b border-gray-100 dark:border-gray-700">
          <div className="flex items-center justify-between">
            
            {/* Logo e Info */}
            <div className="flex items-center gap-3">
              <Avatar className="w-16 h-16 border-2 border-gray-100 dark:border-gray-700 flex-shrink-0">
                <AvatarImage src={restaurant.image_url || DEFAULT_RESTAURANT_LOGO_URL} alt={restaurant.name} />
                <AvatarFallback>{restaurant.name.slice(0, 2)}</AvatarFallback>
              </Avatar>
              
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-white line-clamp-1">{restaurant.name}</h1>
                <p className="text-sm text-gray-600 dark:text-gray-400">{followersCount.toLocaleString('pt-BR')} seguidores</p>
                <p className="text-xs font-medium text-highlight dark:text-highlight-light">Free</p>
              </div>
            </div>

            {/* Botões de Ação (Compartilhar - removido para simplificar o design) */}
          </div>

          {/* Botões Seguir e Favoritar */}
          <div className="flex gap-3 mt-4">
            <Button 
              onClick={handleFollowToggle}
              className="flex-1 h-10 rounded-lg bg-primary hover:bg-primary/90 text-white font-semibold"
            >
              Seguir
            </Button>
            <Button 
              variant="outline"
              onClick={handleFavoriteToggle}
              className={cn(
                "flex-1 h-10 rounded-lg font-semibold border-gray-300 dark:border-gray-600",
                isFavorite ? "border-red-500 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20" : "text-primary dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700"
              )}
            >
              <Heart className={cn("w-4 h-4 mr-2", isFavorite ? "fill-red-500" : "text-primary dark:text-white")} />
              Favoritar
            </Button>
          </div>
        </div>

        {/* Conteúdo Principal (Cardápio e Informações) */}
        <div className="p-4 space-y-8">
          
          {/* Seção Cardápio */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Cardápio</h2>
            
            <div className="space-y-3">
              {mockMenuItems.map((item, index) => (
                <MenuItemCard key={index} {...item} />
              ))}
            </div>
          </section>

          {/* Seção Informações */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">Informações</h2>
            
            <div className="space-y-4">
              
              {/* Localização */}
              <InfoItem 
                icon={MapPin} 
                label="Endereço"
                value={fullAddress}
              />
              
              {/* Horário */}
              <InfoItem 
                icon={Clock} 
                label="Horários"
                value={
                  <span className={cn(formattedSchedule.status.includes('Aberto') ? 'text-green-600' : 'text-red-600')}>
                    {formattedSchedule.status.split('.')[0]}
                    {formattedSchedule.nextOpenTime && (
                      <span className="block text-gray-600 dark:text-gray-400 font-normal mt-0.5">
                        {formattedSchedule.nextOpenTime}
                      </span>
                    )}
                  </span>
                }
              />

              {/* Formas de Pagamento (Mockado) */}
              <InfoItem 
                icon={CreditCard} 
                label="Formas de pagamento"
                value={paymentMethods}
              />
            </div>
          </section>
          
        </div>
      </main>
    </div>
  );
}