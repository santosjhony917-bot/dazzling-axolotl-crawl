import React from 'react';
import { Restaurant } from '@/types/supabase';
import RestaurantCoverImage from './RestaurantCoverImage';
import RestaurantLogo from './RestaurantLogo';
import RestaurantInfoCard from './RestaurantInfoCard';
import RestaurantMenuSection from './RestaurantMenuSection';
import RestaurantGallerySection from './RestaurantGallerySection';
import RestaurantContactSection from './RestaurantContactSection';
import { Separator } from '@/components/ui/separator';
import { MapPin, Clock, Phone, Menu, Image } from 'lucide-react';
import { formatScheduleForDisplay } from '@/utils/schedule';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';
import { WeekSchedule } from '@/types/schedule';

interface FreeProfileLayoutProps {
  restaurant: Restaurant;
}

const FreeProfileLayout: React.FC<FreeProfileLayoutProps> = ({ restaurant }) => {
  // Usando o cast para WeekSchedule, que agora usa 'start' e 'end'
  const scheduleDisplay = formatScheduleForDisplay(restaurant.opening_hours as unknown as WeekSchedule);

  // Mock data for sections (para simular a presença de conteúdo)
  const galleryImages = []; 

  return (
    <div className="bg-white dark:bg-gray-900 min-h-screen pb-12 shadow-lg">
      
      {/* Imagem de Capa */}
      <RestaurantCoverImage coverImageUrl={restaurant.cover_image_url} />

      <div className="relative -mt-16 px-4 sm:px-6 lg:px-8">
        
        {/* Logo e Nome */}
        <div className="flex items-end justify-between">
          <RestaurantLogo logoUrl={restaurant.image_url} size="lg" />
          <div className="flex space-x-2">
            {/* Botões de Ação (Ex: Favoritar, Compartilhar) */}
          </div>
        </div>

        <h1 className="text-3xl font-bold text-gray-900 dark:text-white mt-4">{restaurant.name}</h1>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{restaurant.category}</p>
        
        {/* Descrição */}
        {restaurant.description && (
          <p className="text-gray-700 dark:text-gray-300 mt-4">{restaurant.description}</p>
        )}

        <Separator className="my-6" />

        {/* Navegação Rápida (Anchors) */}
        <div className="flex space-x-4 overflow-x-auto pb-2 scrollbar-hide">
          <Link to="#menu" className="flex items-center text-sm font-medium text-primary hover:text-primary/80">
            <Menu className="w-4 h-4 mr-1" /> Menu
          </Link>
          <Link to="#location" className="flex items-center text-sm font-medium text-primary hover:text-primary/80">
            <MapPin className="w-4 h-4 mr-1" /> Localização
          </Link>
          <Link to="#contact" className="flex items-center text-sm font-medium text-primary hover:text-primary/80">
            <Phone className="w-4 h-4 mr-1" /> Contato
          </Link>
          {/* Galeria só se houver imagens */}
          {galleryImages.length > 0 && (
            <Link to="#gallery" className="flex items-center text-sm font-medium text-primary hover:text-primary/80">
              <Image className="w-4 h-4 mr-1" /> Galeria
            </Link>
          )}
        </div>

        <Separator className="my-6" />

        {/* Seções de Informação */}
        <div className="space-y-8">
          
          {/* 1. Localização e Horário */}
          <RestaurantInfoCard 
            id="location"
            title="Localização e Horário"
            icon={MapPin}
            content={
              <div className="space-y-3">
                <div className="flex items-start space-x-3">
                  <MapPin className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                  <p className="text-gray-700 dark:text-gray-300">
                    {restaurant.address}, {restaurant.number} - {restaurant.neighborhood}, {restaurant.city} - {restaurant.state}
                  </p>
                </div>
                <div className="flex items-start space-x-3">
                  <Clock className="w-5 h-5 text-primary flex-shrink-0 mt-1" />
                  <div className="text-gray-700 dark:text-gray-300">
                    {scheduleDisplay.map((line, index) => (
                      <p key={index}>{line}</p>
                    ))}
                  </div>
                </div>
              </div>
            }
          />

          {/* 2. Menu (Free: Lista simples) */}
          <RestaurantMenuSection 
            id="menu"
            restaurantId={restaurant.id}
            isPremium={false}
          />

          {/* 3. Contato (Free: Telefone e Email) */}
          <RestaurantContactSection 
            id="contact"
            restaurant={restaurant}
            isPremium={false}
          />

          {/* 4. Galeria (Free: Se houver imagens) */}
          <RestaurantGallerySection 
            id="gallery"
            restaurantId={restaurant.id}
            isPremium={false}
          />
        </div>
      </div>
    </div>
  );
};

export default FreeProfileLayout;