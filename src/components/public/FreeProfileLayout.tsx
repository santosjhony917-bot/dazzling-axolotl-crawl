import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { MapPin, Heart, Share2, Utensils, Clock, DollarSign, Star, ChevronLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { PublicRestaurantData, Restaurant } from '@/types/restaurant'; // Importar Restaurant também
import RestaurantInfo from './RestaurantInfo';
import RestaurantMenu from './RestaurantMenu';
import RestaurantGallery from './RestaurantGallery';
import RestaurantAddressHoursSection from './RestaurantAddressHoursSection';
import RestaurantPaymentSection from './RestaurantPaymentSection';
import OrderChannelsSection from './OrderChannelsSection';
import RestaurantHeader from './RestaurantHeader';
import RestaurantActionsBar from './RestaurantActionsBar';
import { useAuthData } from '@/context/AuthContext';
import { base44 } from '@/api/base44Client';
import { showError, showSuccess } from '@/utils/toast';
import { createPageUrl } from '@/utils/url';

interface FreeProfileLayoutProps {
  restaurant: PublicRestaurantData;
  onFavoriteToggle: (isFavorite: boolean) => void;
  isFavorite: boolean;
}

const FreeProfileLayout: React.FC<FreeProfileLayoutProps> = ({ restaurant, onFavoriteToggle, isFavorite }) => {
  const navigate = useNavigate();
  const { user } = useAuthData();
  const [activeTab, setActiveTab] = useState('info'); // 'info', 'menu', 'gallery'

  const layoutProps = {
    restaurantName: restaurant.name,
    restaurantCategory: restaurant.category || 'Restaurante',
    restaurantImageUrl: restaurant.image_url || '',
    coverImageUrl: restaurant.cover_image_url || '',
    addressSummary: restaurant.addressSummary,
    followersCount: restaurant.followers_count,
    isFavorite: isFavorite, // Usando o estado reativo
    isOpen: restaurant.isOpen,
    statusText: restaurant.statusText,
    isPremium: false, // CORREÇÃO: Adicionado isPremium
    onFavoriteToggle: onFavoriteToggle,
  };

  // Verifica se há conteúdo para as abas
  const hasMenu = restaurant.menu_categories && restaurant.menu_categories.length > 0;
  const hasGallery = restaurant.gallery_images && restaurant.gallery_images.length > 0;

  useEffect(() => {
    // Se a aba ativa não tiver conteúdo, mudar para a próxima disponível
    if (activeTab === 'menu' && !hasMenu) {
      setActiveTab(hasGallery ? 'gallery' : 'info');
    } else if (activeTab === 'gallery' && !hasGallery) {
      setActiveTab(hasMenu ? 'menu' : 'info');
    }
  }, [activeTab, hasMenu, hasGallery]);

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: restaurant.name,
        text: `Confira o restaurante ${restaurant.name} no FilterFood!`,
        url: window.location.href,
      })
        .then(() => showSuccess('Link do restaurante compartilhado!'))
        .catch((error) => showError('Erro ao compartilhar: ' + error.message));
    } else {
      navigator.clipboard.writeText(window.location.href)
        .then(() => showSuccess('Link do restaurante copiado para a área de transferência!'))
        .catch(() => showError('Não foi possível copiar o link.'));
    }
  };

  return (
    <div className="relative min-h-screen bg-gray-50 pb-20 md:max-w-md md:mx-auto">
      {/* Header Fixo */}
      <div className="sticky top-0 z-20 bg-white shadow-sm">
        <div className="flex items-center justify-between p-4">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-lg font-semibold truncate max-w-[calc(100%-120px)]">{restaurant.name}</h1>
          <div className="flex items-center space-x-2">
            <Button variant="ghost" size="icon" onClick={handleShare}>
              <Share2 className="h-5 w-5" />
            </Button>
            <Button variant="ghost" size="icon" onClick={() => onFavoriteToggle(!isFavorite)}>
              <Heart className={`h-5 w-5 ${isFavorite ? 'text-red-500 fill-red-500' : 'text-gray-500'}`} />
            </Button>
          </div>
        </div>
      </div>

      {/* Conteúdo do Perfil */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative"
      >
        <RestaurantHeader {...layoutProps} />
        <RestaurantActionsBar {...layoutProps} />

        {/* Navegação por abas */}
        <div className="sticky top-[64px] z-10 bg-white shadow-sm border-b border-gray-200">
          <div className="flex justify-around text-sm font-medium text-gray-500">
            <button
              onClick={() => setActiveTab('info')}
              className={`py-3 px-4 border-b-2 ${activeTab === 'info' ? 'border-highlight text-highlight' : 'border-transparent hover:border-gray-300'}`}
            >
              Informações
            </button>
            {hasMenu && (
              <button
                onClick={() => setActiveTab('menu')}
                className={`py-3 px-4 border-b-2 ${activeTab === 'menu' ? 'border-highlight text-highlight' : 'border-transparent hover:border-gray-300'}`}
              >
                Cardápio
              </button>
            )}
            {hasGallery && (
              <button
                onClick={() => setActiveTab('gallery')}
                className={`py-3 px-4 border-b-2 ${activeTab === 'gallery' ? 'border-highlight text-highlight' : 'border-transparent hover:border-gray-300'}`}
              >
                Galeria
              </button>
            )}
          </div>
        </div>

        <div className="p-4 space-y-6">
          {activeTab === 'info' && (
            <div id="info-section" className="space-y-6">
              <RestaurantInfo restaurant={restaurant as Restaurant} /> {/* Cast para Restaurant */}
              <RestaurantAddressHoursSection restaurant={restaurant} />
              <RestaurantPaymentSection restaurant={restaurant} />
              <OrderChannelsSection restaurant={restaurant} />
            </div>
          )}

          {activeTab === 'gallery' && hasGallery && (
            <div id="gallery-section">
              <RestaurantGallery gallery={restaurant.gallery_images} />
            </div>
          )}

          {activeTab === 'menu' && hasMenu && (
            <div id="menu-section">
              <RestaurantMenu
                menuCategories={restaurant.menu_categories}
                isFullMenuPage={false}
              />
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
};

export default FreeProfileLayout;