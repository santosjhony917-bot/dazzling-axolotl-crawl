import React, { useState } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Heart, Share2, Star, MapPin, Clock, Crown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

import RestaurantHeader from "@/components/restaurant/RestaurantHeader";
import OrderChannels from "@/components/restaurant/OrderChannels";
import PhotoGallery from "@/components/restaurant/PhotoGallery";
import MenuSection from "@/components/restaurant/MenuSection";
import RestaurantInfo from "@/components/restaurant/RestaurantInfo";

export default function RestaurantProfilePublic() {
  const navigate = useNavigate();
  const [isFollowing, setIsFollowing] = useState(false);

  // Mock data for a Premium restaurant profile
  const restaurantData = {
    id: 'nau',
    name: 'NAU – Frutos do Mar',
    isVerified: true,
    rating: 4.7,
    reviewsCount: 1200,
    followersCount: 2834,
    coverImageUrl: "https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=2074&auto=format&fit=crop",
    address: 'Av. Epitácio Pessoa, 1234 - Tambaú',
    openingHours: '18:00 - 23:00',
    isOpen: true,
    categories: ['Entradas', 'Principais', 'Sobremesas', 'Bebidas'],
    menuItems: [
      {
        id: '1',
        name: 'Salada Caprese',
        description: 'Tomate, mussarela de búfala, manjericão e azeite.',
        price: 35.00,
        imageUrl: 'https://images.unsplash.com/photo-1592417817098-8fd3d9eb14a5?q=80&w=2070&auto=format&fit=crop',
        isFavorite: true
      },
      {
        id: '2',
        name: 'Ceviche Clássico',
        description: 'Peixe branco fresco, limão, coentro e pimenta.',
        price: 45.00,
        imageUrl: 'https://images.unsplash.com/photo-1626200419199-391ae4be7a41?q=80&w=2070&auto=format&fit=crop',
        isFavorite: false
      },
      {
        id: '3',
        name: 'Risoto de Camarão',
        description: 'Arroz arbóreo, camarões frescos e ervas finas.',
        price: 68.00,
        imageUrl: 'https://images.unsplash.com/photo-1633321702544-e81e8b0e5e38?q=80&w=2070&auto=format&fit=crop',
        isFavorite: true
      }
    ],
    gallery: [
      { imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=2070&auto=format&fit=crop', caption: 'Ambiente aconchegante' },
      { imageUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=2070&auto=format&fit=crop', caption: 'Culinária premium' },
      { imageUrl: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=2074&auto=format&fit=crop', caption: 'Vista privilegiada' }
    ]
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white max-w-md mx-auto">
      {/* Cover Image with Overlay Controls */}
      <div className="relative w-full h-72">
        <img
          src={restaurantData.coverImageUrl}
          alt={restaurantData.name}
          className="w-full h-full object-cover"
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
      <div className="relative -mt-12 px-4 pb-8">
        <RestaurantHeader restaurant={restaurantData} />

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

        {/* Quick Info Cards */}
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
              Aberto
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

        {/* Order Channels */}
        <OrderChannels />

        {/* Photo Gallery */}
        <PhotoGallery gallery={restaurantData.gallery} />

        {/* Menu Section */}
        <MenuSection 
          categories={restaurantData.categories}
          menuItems={restaurantData.menuItems}
        />

        {/* Restaurant Info */}
        <RestaurantInfo restaurant={restaurantData} />
      </div>
    </div>
  );
}