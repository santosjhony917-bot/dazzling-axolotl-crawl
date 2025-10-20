import React, { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Heart, Share2, Star, MapPin, Clock, Crown, Lock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import RestaurantHeader from "../components/restaurant/RestaurantHeader";
import OrderChannels from "../components/restaurant/OrderChannels";
import PhotoGallery from "../components/restaurant/PhotoGallery";
import MenuSection from "../components/restaurant/MenuSection";
import RestaurantInfo from "../components/restaurant/RestaurantInfo";
import { createPageUrl } from "@/utils/url";

// Componente de Banner de Upgrade Simples
const FreeUpgradeBanner = () => (
  <div className="mt-8 p-4 bg-yellow-50 border border-yellow-300 rounded-xl text-center shadow-md">
    <Crown className="w-6 h-6 text-highlight mx-auto mb-2 fill-highlight/10" />
    <h3 className="text-lg font-bold text-primary">Desbloqueie o Premium!</h3>
    <p className="text-sm text-gray-600 mt-1 mb-3">
      Seu restaurante pode ter mais destaque, fotos e canais de pedido.
    </p>
    <Button 
      onClick={() => alert("Navegar para Upgrade")}
      className="w-full h-10 rounded-full bg-highlight hover:bg-highlight/90 text-white text-sm font-bold"
    >
      <Lock className="w-4 h-4 mr-2" />
      Ver Planos Premium
    </Button>
  </div>
);

export default function RestaurantProfilePublic() {
  const navigate = useNavigate();
  const [isFollowing, setIsFollowing] = useState(false);
  
  // Mock: Definindo o restaurante como FREE para aplicar as restrições
  const isPremium = false; 

  const restaurantData = {
    id: 'nau',
    name: 'Restaurante Sabor Divino', // Nome genérico para Free
    isVerified: false, // Não verificado no Free
    rating: 0, // Sem rating visível no Free
    reviewsCount: 0,
    followersCount: 0,
    coverImageUrl: "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80", // Imagem de capa
    address: 'Av. Epitácio Pessoa, 1234 - Tambaú',
    openingHours: '18:00 - 23:00',
    isOpen: true,
    categories: ['Pratos', 'Bebidas'],
    menuItems: [
      {
        id: '1',
        name: 'Prato do Dia',
        description: 'Descrição simples do prato.',
        price: 35.00,
        imageUrl: 'https://images.unsplash.com/photo-1592417817098-8fd3d9eb14a5?q=80&w=2070&auto=format&fit=crop',
        isFavorite: false
      },
    ],
    gallery: [
      { imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=2070&auto=format&fit=crop', caption: 'Ambiente' },
      { imageUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=2070&auto=format&fit=crop', caption: 'Culinária' },
      { imageUrl: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=2074&auto=format&fit=crop', caption: 'Vista' }
    ]
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Cover Image with Overlay Controls */}
      <div className="relative w-full h-72">
        <img
          src={restaurantData.coverImageUrl}
          alt={restaurantData.name}
          className={cn(
            "w-full h-full object-cover",
            !isPremium && "grayscale opacity-70" // Efeito Free
          )}
        />
        <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60" />
        
        {/* Top Controls */}
        <div className="absolute top-0 inset-x-0 p-4 flex justify-between items-center">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm hover:bg-white shadow-lg"
          >
            <ArrowLeft className="w-5 h-5 text-gray-900" />
          </Button>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm hover:bg-white shadow-lg"
            >
              <Heart className="w-5 h-5 text-gray-900" />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm hover:bg-white shadow-lg"
            >
              <Share2 className="w-5 h-5 text-gray-900" />
            </Button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative -mt-12 px-4 pb-8 max-w-md mx-auto w-full">
        {/* Restaurant Header (Ajustado para Free) */}
        <RestaurantHeader 
          restaurant={{
            ...restaurantData,
            rating: isPremium ? restaurantData.rating : 0,
            reviewsCount: isPremium ? restaurantData.reviewsCount : 0,
            followersCount: isPremium ? restaurantData.followersCount : 0,
            isVerified: isPremium ? restaurantData.isVerified : false,
          }} 
        />

        {/* Action Buttons */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex gap-3 mt-6"
        >
          <Button
            onClick={() => setIsFollowing(!isFollowing)}
            className={cn(
              "flex-1 rounded-full h-11 font-semibold shadow-md transition-all",
              isFollowing
                ? "bg-white text-[#022D68] border-2 border-[#022D68] hover:bg-gray-50"
                : "bg-[#E47948] text-white hover:bg-[#E47948]/90"
            )}
          >
            {isFollowing ? "Seguindo" : "Seguir"}
          </Button>
          <Button
            variant="outline"
            className="flex-1 rounded-full h-11 font-semibold border-2 border-[#022D68] text-[#022D68] hover:bg-[#022D68]/5 shadow-md"
          >
            Contato
          </Button>
        </motion.div>

        {/* Quick Info Cards (Mantidos, pois são informações básicas) */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="grid grid-cols-2 gap-3 mt-6"
        >
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 text-[#E47948] mb-1">
              <Clock className="w-4 h-4" />
              <span className="text-xs font-medium">Horário</span>
            </div>
            <p className="text-sm font-bold text-[#022D68]">{restaurantData.openingHours}</p>
            <span className="inline-block mt-1 px-2 py-0.5 bg-green-100 text-green-700 text-xs font-medium rounded-full">
              {restaurantData.isOpen ? "Aberto" : "Fechado"}
            </span>
          </div>
          <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
            <div className="flex items-center gap-2 text-[#E47948] mb-1">
              <MapPin className="w-4 h-4" />
              <span className="text-xs font-medium">Localização</span>
            </div>
            <p className="text-sm font-bold text-[#022D68] line-clamp-2">
              Tambaú, João Pessoa
            </p>
            <button className="mt-1 text-xs text-[#E47948] font-semibold hover:underline">
              Ver mapa
            </button>
          </div>
        </motion.div>

        {/* Order Channels - SUBSTITUÍDO POR BANNER NO FREE */}
        {isPremium ? <OrderChannels /> : <FreeUpgradeBanner />}

        {/* Photo Gallery - SUBSTITUÍDO POR BANNER NO FREE */}
        {isPremium ? <PhotoGallery gallery={restaurantData.gallery} /> : <FreeUpgradeBanner />}

        {/* Menu Section - SIMPLIFICADO NO FREE */}
        <div className="mt-8">
          <h2 className="text-lg font-bold text-[#022D68]">Cardápio Básico</h2>
          {!isPremium && (
            <div className="flex items-center gap-3 rounded-lg bg-gray-100 p-4 shadow-sm border border-gray-200 mt-4">
              <Lock className="w-6 h-6 text-gray-500" />
              <p className="font-medium text-gray-700">Cardápio completo e fotos de pratos são recursos Premium.</p>
            </div>
          )}
          <MenuSection 
            categories={isPremium ? restaurantData.categories : ['Pratos Principais']}
            menuItems={isPremium ? restaurantData.menuItems : restaurantData.menuItems.slice(0, 1)} // Apenas 1 item no Free
          />
        </div>

        {/* Restaurant Info (Mantido) */}
        <RestaurantInfo restaurant={restaurantData} />
      </div>
    </div>
  );
}