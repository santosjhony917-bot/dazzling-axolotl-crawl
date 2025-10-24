import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Heart, Share2, Star, MapPin, Clock, Crown, Loader2, ServerCrash } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { Restaurant } from "@/types/restaurant";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

import RestaurantHeader from "@/components/restaurant/RestaurantHeader";
import OrderChannels from "@/components/restaurant/OrderChannels";
import PhotoGallery from "@/components/restaurant/PhotoGallery";
import MenuSection from "@/components/restaurant/MenuSection";
import RestaurantInfo from "@/components/restaurant/RestaurantInfo";
import FreeProfileLayout from "@/components/FreeProfileLayout"; // Importa o novo layout Free

export default function RestaurantProfilePublic() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    const fetchRestaurant = async () => {
      if (!id) {
        setError("ID do restaurante não fornecido.");
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('restaurants')
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        if (data) setRestaurant(data as Restaurant);

      } catch (err: any) {
        console.error("Erro ao buscar restaurante:", err);
        setError("Não foi possível carregar os dados do restaurante.");
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurant();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-[#E47948]" />
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="flex items-center justify-center h-screen p-4">
        <Alert variant="destructive" className="max-w-lg">
          <ServerCrash className="h-4 w-4" />
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>{error || "O restaurante que você está procurando não foi encontrado."}</AlertDescription>
        </Alert>
      </div>
    );
  }
  
  // --- Renderização Condicional ---
  if (restaurant.plan === 'free') {
    // Se o plano for Free, renderiza o layout Free
    return <FreeProfileLayout restaurant={restaurant} />;
  }

  // --- Premium/Default Layout (Usando dados reais e mocks para conteúdo dinâmico) ---
  
  // Mock data necessário para componentes Premium que dependem de dados complexos (rating, menu, gallery)
  const premiumMockData = {
    isVerified: true, // Mocked for now
    rating: 4.7, // Mocked for now
    reviewsCount: 1200, // Mocked for now
    followersCount: 2834, // Mocked for now
    coverImageUrl: restaurant.cover_image_url || "https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=2074&auto=format&fit=crop",
    address: restaurant.address || 'Endereço não definido',
    openingHours: '18:00 - 23:00', // Mocked for now
    isOpen: true, // Mocked for now
    categories: ['Entradas', 'Principais', 'Sobremesas', 'Bebidas'], // Mocked for now
    menuItems: [ // Mocked for now
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
        imageUrl: 'https://images.unsplash.com/photo-1626200419199-391ae4be7a41?q=80&w=2070&auto=format&fit-crop',
        isFavorite: false
      },
    ],
    gallery: [ // Mocked for now
      { imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=2070&auto=format&fit=crop', caption: 'Ambiente aconchegante' },
      { imageUrl: 'https://images.unsplash.com/photo-1414235077428-338989a2e8c0?q=80&w=2070&auto=format&fit=crop', caption: 'Culinária premium' },
      { imageUrl: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=2074&auto=format&fit=crop', caption: 'Vista privilegiada' }
    ]
  };
  
  // Combina dados reais do restaurante com mocks para o Premium
  const displayData = {
    ...restaurant,
    ...premiumMockData,
    name: restaurant.name,
    address: restaurant.address,
  };


  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white max-w-md mx-auto">
      {/* Cover Image with Overlay Controls */}
      <div className="relative w-full h-72">
        <img
          src={displayData.coverImageUrl}
          alt={displayData.name}
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
        <RestaurantHeader restaurant={displayData} />

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
            <p className="text-sm font-bold text-[#022D68]">{displayData.openingHours}</p>
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
              {displayData.city || 'Localização não definida'}
            </p>
            <button className="mt-1 text-xs text-[#E47948] font-semibold hover:underline">
              Ver mapa
            </button>
          </div>
        </motion.div>

        {/* Order Channels */}
        <OrderChannels />

        {/* Photo Gallery */}
        <PhotoGallery gallery={displayData.gallery} />

        {/* Menu Section */}
        <MenuSection 
          categories={displayData.categories}
          menuItems={displayData.menuItems}
        />

        {/* Restaurant Info */}
        <RestaurantInfo restaurant={displayData} />
      </div>
    </div>
  );
}