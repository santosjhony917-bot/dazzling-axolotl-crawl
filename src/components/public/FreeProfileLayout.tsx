"use client";

import React, { useRef, useState } from 'react';
import RestaurantProfileHeader from './RestaurantProfileHeader'; // Corrigido para importação padrão
import RestaurantAbout from './RestaurantAbout'; // Corrigido para importação padrão
import RestaurantGallery from './RestaurantGallery'; // Corrigido para importação padrão
// import { RestaurantMenu } from './RestaurantMenu'; // Removido, pois não há menu em perfil gratuito
import RestaurantReviews from './RestaurantReviews'; // Corrigido para importação padrão
import RestaurantContact from './RestaurantContact'; // Corrigido para importação padrão
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Image } from 'lucide-react'; // Importando ícone para o botão

interface FreeProfileLayoutProps {
  restaurant: any;
  hasGallery: boolean;
  hasReviews: boolean;
  isFavorite: boolean;
  onFavoriteToggle: () => void;
}

export const FreeProfileLayout: React.FC<FreeProfileLayoutProps> = ({
  restaurant,
  hasGallery,
  hasReviews,
  isFavorite,
  onFavoriteToggle,
}) => {
  const aboutRef = useRef<HTMLDivElement>(null);
  const galleryRef = useRef<HTMLDivElement>(null);
  const reviewsRef = useRef<HTMLDivElement>(null);
  const contactRef = useRef<HTMLDivElement>(null);

  const [activeTab, setActiveTab] = useState('about'); // Estado para a aba ativa

  const scrollToSection = (section: string, tabName: string) => {
    let ref;
    switch (section) {
      case 'about':
        ref = aboutRef;
        break;
      case 'gallery':
        ref = galleryRef;
        break;
      case 'reviews':
        ref = reviewsRef;
        break;
      case 'contact':
        ref = contactRef;
        break;
      default:
        return;
    }
    ref.current?.scrollIntoView({ behavior: 'smooth' });
    setActiveTab(tabName);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <RestaurantProfileHeader
        restaurant={restaurant}
        isFavorite={isFavorite}
        onFavoriteToggle={onFavoriteToggle}
      />

      <div className="sticky top-0 z-30 bg-white dark:bg-gray-800 shadow-sm py-2">
        <ScrollArea className="w-full whitespace-nowrap">
          <div className="flex space-x-4 px-4">
            <Button
              variant="ghost"
              onClick={() => scrollToSection('about', 'about')}
              className={cn(
                "rounded-full px-4 py-2 h-9 text-sm font-semibold shrink-0",
                activeTab === 'about' ? "bg-primary text-primary-foreground hover:bg-primary/90" : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              )}
            >
              Sobre
            </Button>
            {hasGallery && (
              <Button
                variant="ghost"
                onClick={() => scrollToSection('gallery', 'gallery')}
                className={cn(
                  "rounded-full px-4 py-2 h-9 text-sm font-semibold shrink-0",
                  activeTab === 'gallery' ? "bg-primary text-primary-foreground hover:bg-primary/90" : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                )}
              >
                <Image className="w-4 h-4 mr-2" /> Galeria
              </Button>
            )}
            {/* Botão "Menu" removido para perfis gratuitos */}
            {hasReviews && (
              <Button
                variant="ghost"
                onClick={() => scrollToSection('reviews', 'reviews')}
                className={cn(
                  "rounded-full px-4 py-2 h-9 text-sm font-semibold shrink-0",
                  activeTab === 'reviews' ? "bg-primary text-primary-foreground hover:bg-primary/90" : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                )}
              >
                Avaliações
              </Button>
            )}
            <Button
              variant="ghost"
              onClick={() => scrollToSection('contact', 'contact')}
              className={cn(
                "rounded-full px-4 py-2 h-9 text-sm font-semibold shrink-0",
                activeTab === 'contact' ? "bg-primary text-primary-foreground hover:bg-primary/90" : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
              )}
            >
              Contato
            </Button>
          </div>
          <ScrollBar orientation="horizontal" />
        </ScrollArea>
        <Separator />
      </div>

      <div className="container mx-auto p-4 space-y-8">
        <div ref={aboutRef}>
          <RestaurantAbout restaurant={restaurant} />
        </div>

        {hasGallery && (
          <div ref={galleryRef}>
            <RestaurantGallery restaurantId={restaurant.id} />
          </div>
        )}

        {/* Seção de Menu removida para perfis gratuitos */}

        {hasReviews && (
          <div ref={reviewsRef}>
            <RestaurantReviews restaurantId={restaurant.id} />
          </div>
        )}

        <div ref={contactRef}>
          <RestaurantContact restaurant={restaurant} />
        </div>
      </div>
    </div>
  );
};