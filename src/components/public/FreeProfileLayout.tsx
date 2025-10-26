import React from 'react';
import { Restaurant } from '@/types/supabase';
import ProfileHeader from './ProfileHeader';
import InfoSection from './InfoSection';
import MenuSection from './MenuSection';
import GallerySection from './GallerySection';
import FooterSection from './FooterSection';
import { useMenuManagement } from '@/hooks/useMenuManagement';
import { Loader2 } from 'lucide-react';

interface FreeProfileLayoutProps {
  restaurant: Restaurant;
}

const FreeProfileLayout: React.FC<FreeProfileLayoutProps> = ({ restaurant }) => {
  // O hook useMenuManagement retorna { menuData, isLoading, ... }
  const { menuData, isLoading: isMenuLoading } = useMenuManagement(restaurant.id);
  
  const hasMenuData = menuData && menuData.categories.length > 0 && menuData.items.length > 0;

  return (
    <div className="min-h-screen bg-[#f5f7f8] dark:bg-gray-900">
      
      <ProfileHeader restaurant={restaurant} />
      
      <main className="max-w-md mx-auto pb-16 relative z-10 bg-white dark:bg-gray-800 shadow-lg md:rounded-xl">
        
        <InfoSection restaurant={restaurant} />
        
        {isMenuLoading ? (
          <div className="p-6 flex justify-center">
            <Loader2 className="h-6 w-6 animate-spin text-primary" />
          </div>
        ) : hasMenuData ? (
          <MenuSection menuData={menuData} />
        ) : (
          <div className="p-6 text-center text-gray-500 dark:text-gray-400">
            <p>O cardápio ainda não foi cadastrado ou está vazio.</p>
          </div>
        )}
        
        <GallerySection restaurantId={restaurant.id} />
        
        <FooterSection restaurant={restaurant} />
        
      </main>
    </div>
  );
};

export default FreeProfileLayout;