import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Heart, Share2, Star, MapPin, Clock, Crown, Loader2, ServerCrash, Utensils, Info, Image } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Restaurant } from "@/types/restaurant";
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import RestaurantBottomNav from '@/components/restaurant/RestaurantBottomNav';
import { Skeleton } from '@/components/ui/skeleton';

// MOCK DE COMPONENTES (Assumindo que existem)
const RestaurantHeader = ({ restaurant }: any) => <div className="p-4 bg-white rounded-t-xl shadow-lg"><h1>{restaurant.name}</h1></div>;
const OrderChannels = () => <div className="p-4 bg-white rounded-xl shadow-sm">Canais de Pedido</div>;
const PhotoGallery = ({ gallery }: any) => <div className="p-4 bg-white rounded-xl shadow-sm">Galeria ({gallery.length} fotos)</div>;
const MenuSection = ({ categories, menuItems }: any) => <div className="p-4 bg-white rounded-xl shadow-sm">Menu ({categories.length} categorias)</div>;
const RestaurantInfo = ({ restaurant }: any) => <div className="p-4 bg-white rounded-xl shadow-sm">Info</div>;

// Definição das abas para o perfil público (Mock)
const publicTabs = [
  { name: 'Perfil', path: '/restaurant/perfil', icon: Info, isPremium: false },
  { name: 'Cardápio', path: '/restaurant/menu', icon: Utensils, isPremium: false },
  { name: 'Fotos', path: '/restaurant/fotos', icon: Image, isPremium: false },
];

export default function RestaurantProfileMenu() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  
  // Corrigido: useAuth agora exporta signOut
  const { signOut, user, isLoading: authLoading } = useAuth(); 
  
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isPremium, setIsPremium] = useState(false); // Mock

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
        if (data) {
          setRestaurant(data as Restaurant);
          setIsPremium(data.plan !== 'free'); // Define o status Premium
        }

      } catch (err: any) {
        console.error("Erro ao buscar restaurante:", err);
        setError("Não foi possível carregar os dados do restaurante.");
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurant();
  }, [id]);

  if (loading || authLoading) {
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
  
  // --- Premium/Default Layout ---
  
  const premiumMockData = {
    isVerified: true,
    rating: 4.7,
    reviewsCount: 1200,
    followersCount: 2834,
    coverImageUrl: restaurant.cover_image_url || "https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=2074&auto=format&fit=crop",
    address: restaurant.address || 'Endereço não definido',
    openingHours: '18:00 - 23:00',
    isOpen: true,
    categories: ['Entradas', 'Principais', 'Sobremesas', 'Bebidas'],
    menuItems: [ 
      { id: '1', name: 'Salada Caprese', description: 'Tomate, mussarela de búfala, manjericão e azeite.', price: 35.00, imageUrl: '', isFavorite: true },
      { id: '2', name: 'Ceviche Clássico', description: 'Peixe branco fresco, limão, coentro e pimenta.', price: 45.00, imageUrl: '', isFavorite: false },
    ],
    gallery: [ 
      { imageUrl: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=2070&auto=format&fit=crop', caption: 'Ambiente aconchegante' },
    ]
  };
  
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
      
      {/* Bottom Nav (Erros 3 e 4 corrigidos) */}
      <div className="fixed bottom-0 w-full max-w-md mx-auto z-30">
        <RestaurantBottomNav tabs={publicTabs} selectedTab="perfil" isFree={!isPremium} />
      </div>
    </div>
  );
}