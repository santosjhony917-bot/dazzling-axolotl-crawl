"use client";

import React, { useRef, useState } from 'react';
import RestaurantProfileHeader from './RestaurantProfileHeader';
import RestaurantAbout from './RestaurantAbout';
import RestaurantGallery from './RestaurantGallery';
import RestaurantMenu from './RestaurantMenu'; // Assumindo que este componente existe e é exportado por padrão
import RestaurantReviews from './RestaurantReviews';
import RestaurantContact from './RestaurantContact';
import { Button } from '@/components/ui/button';
import { ScrollArea, ScrollBar } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import { Image, BookOpenText } from 'lucide-react'; // Importando ícones para os botões

interface PremiumProfileLayoutProps {
  restaurant: any;
  menuCategories: any[];
  menuItems: any[];
  hasGallery: boolean;
  hasMenu: boolean;
  hasReviews: boolean;
  isFavorite: boolean;
  onFavoriteToggle: () => void;
}

const PremiumProfileLayout: React.FC<PremiumProfileLayoutProps> = ({
  restaurant,
  menuCategories,
  menuItems,
  hasGallery,
  hasMenu,
  hasReviews,
  isFavorite,
  onFavoriteToggle,
}) => {
  const aboutRef = useRef<HTMLDivElement>(null);
  const galleryRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
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
      case 'menu':
        ref = menuRef;
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
            {hasMenu && (
              <Button
                variant="ghost"
                onClick={() => scrollToSection('menu', 'menu')}
                className={cn(
                  "rounded-full px-4 py-2 h-9 text-sm font-semibold shrink-0",
                  activeTab === 'menu' ? "bg-primary text-primary-foreground hover:bg-primary/90" : "text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700"
                )}
              >
                <BookOpenText className="w-4 h-4 mr-2" /> Cardápio
              </Button>
            )}
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

        {hasMenu && (
          <div ref={menuRef}>
            <RestaurantMenu
              restaurantId={restaurant.id}
              menuCategories={menuCategories}
              menuItems={menuItems}
            />
          </div>
        )}

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

export default PremiumProfileLayout;