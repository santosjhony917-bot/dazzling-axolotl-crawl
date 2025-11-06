import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, Utensils, AlertTriangle, Heart, Share2, Star, Clock, MapPin, ArrowLeft } from 'lucide-react';
import { PublicRestaurantData } from '@/types/restaurant';
import { Button } from '@/components/ui/button';
import { usePublicRestaurant } from '@/hooks/usePublicRestaurant';
import { useRestaurantFavorite } from '@/hooks/useRestaurantFavorite';
import { useAuth } from '@/hooks/useAuth';
import { Skeleton } from '@/components/ui/skeleton';
import { Card } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { motion } from "framer-motion";
import DetailedHoursDisplay from "@/components/public/DetailedHoursDisplay";
import { getRestaurantOpenStatus } from "@/lib/schedule";
import RestaurantCoverImage from '@/components/public/RestaurantCoverImage';
import RestaurantLogo from '@/components/public/RestaurantLogo';
import PublicMenuSection from '@/components/public/PublicMenuSection';
import RestaurantGallerySection from '@/components/public/RestaurantGallerySection';
import OrderChannelsSection from '@/components/public/OrderChannelsSection';
import AdditionalInfo from '@/components/public/AdditionalInfo';

interface RestaurantProfilePublicProps {
  initialRestaurantId?: string;
  simulatedPlan?: 'free' | 'premium';
  isCompact?: boolean;
}

const RestaurantProfilePublic: React.FC<RestaurantProfilePublicProps> = ({
  initialRestaurantId,
  simulatedPlan,
  isCompact = false,
}) => {
  const params = useParams<{ restaurantId: string }>();
  const navigate = useNavigate();
  const id = initialRestaurantId || params.restaurantId;
  console.log("[RestaurantProfilePublic] Restaurant ID from params:", params.restaurantId);
  console.log("[RestaurantProfilePublic] Final ID used:", id);
  const { user } = useAuth();
  const { restaurant, isLoading, error } = usePublicRestaurant(id);
  const { isFavorite, toggleFavorite, isLoading: isToggling } = useRestaurantFavorite(id);

  const handleShare = () => {
    if (navigator.share && restaurant) {
      navigator
        .share({
          title: restaurant.name,
          text: `Confira o cardápio da ${restaurant.name}!`,
          url: window.location.href,
        })
        .catch((error) => console.log("Erro ao compartilhar", error));
    } else {
      // Fallback for browsers that do not support the Web Share API
      navigator.clipboard.writeText(window.location.href);
      alert("Link copiado para a área de transferência!");
    }
  };

  if (isLoading) {
    return (
      <div className="p-4">
        <Skeleton className="h-48 w-full" />
        <Skeleton className="h-8 w-3/4 mt-4" />
        <Skeleton className="h-6 w-1/2 mt-2" />
      </div>
    );
  }

  if (error || !restaurant) {
    return (
      <div className="flex flex-col items-center justify-center h-screen">
        <p className="text-red-500">Restaurante não encontrado.</p>
        <Button onClick={() => navigate(-1)} className="mt-4">
          Voltar
        </Button>
      </div>
    );
  }

  const { isOpen, statusText, nextOpenTime } = getRestaurantOpenStatus(
    restaurant.opening_hours
  );
  const followerCount =
    (restaurant.followers_override ?? 0) + (restaurant.followers_count ?? 0);

  return (
    <div className="bg-background-light min-h-screen">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Cover Image and Actions */}
        <div className="relative w-full">
          <RestaurantCoverImage coverImageUrl={restaurant.cover_image_url} />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
          <div className="absolute top-4 left-4 right-4 flex justify-between items-center">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(-1)}
              className="bg-black/30 text-white hover:bg-black/50 rounded-full"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2">
              <Button
                variant="ghost"
                size="icon"
                onClick={handleShare}
                className="bg-black/30 text-white hover:bg-black/50 rounded-full"
              >
                <Share2 className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content Area */}
        <main className="relative z-10 mt-[-80px] px-4 pb-20">
          <div className="max-w-3xl mx-auto">
            {/* Main Info Card */}
            <Card className="relative rounded-2xl shadow-soft-xl p-4 sm:p-6 mb-6 text-center border-none">
              <div className="absolute -top-12 left-1/2 -translate-x-1/2">
                <RestaurantLogo
                  logoUrl={restaurant.image_url}
                  size="lg"
                  className="border-4 border-white"
                />
              </div>
              <div className="mt-10">
                <h1 className="text-3xl font-bold text-primary tracking-tight">
                  {restaurant.name}
                </h1>
                <div className="flex items-center justify-center gap-4 text-sm text-text-secondary mt-2">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 text-amber-500" />
                    <span className="font-medium">{followerCount} Seguidores</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Clock className={`w-4 h-4 ${isOpen ? 'text-green-500' : 'text-red-500'}`} />
                    <span className={`font-medium ${isOpen ? 'text-green-600' : 'text-red-600'}`}>
                      {isOpen ? "Aberto" : "Fechado"}
                    </span>
                  </div>
                </div>
              </div>
            </Card>

            {/* Order Channels */}
            <OrderChannelsSection restaurant={restaurant} />

            {/* Content Sections in a continuous scroll */}
            <div className="mt-6 space-y-6">
              {/* Menu Section */}
              <Card className="rounded-2xl shadow-soft-lg border-none p-4 sm:p-6">
                <h2 className="text-2xl font-bold text-primary mb-4">Cardápio</h2>
                <PublicMenuSection
                  categories={
                    restaurant.menu_categories?.map((category) => ({
                      ...category,
                      items: category.menu_items,
                    })) || []
                  }
                  restaurantId={restaurant.id}
                />
              </Card>

              {/* Gallery Section */}
              <Card className="rounded-2xl shadow-soft-lg border-none p-4 sm:p-6">
                <h2 className="text-2xl font-bold text-primary mb-4">Galeria de Fotos</h2>
                <RestaurantGallerySection id="gallery" restaurantId={restaurant.id} plan={restaurant.plan} />
              </Card>

              {/* Info Section */}
              <Card className="rounded-2xl shadow-soft-lg border-none p-4 sm:p-6">
                <h2 className="text-2xl font-bold text-primary mb-6">Informações</h2>
                <div className="space-y-6">
                  <div>
                    <h3 className="text-xl font-bold text-primary mb-3 flex items-center gap-2">
                      <MapPin className="w-5 h-5 text-highlight" />
                      Endereço
                    </h3>
                    <p className="text-text-secondary">{`${restaurant.address}, ${restaurant.number} - ${restaurant.neighborhood}, ${restaurant.city} - ${restaurant.state}`}</p>
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-primary mb-3 flex items-center gap-2">
                      <Clock className="w-5 h-5 text-highlight" />
                      Horário de Funcionamento
                    </h3>
                    <DetailedHoursDisplay schedule={restaurant.opening_hours} />
                  </div>
                  <AdditionalInfo restaurant={restaurant as any} />
                </div>
              </Card>
            </div>
          </div>
        </main>
      </motion.div>
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          size="lg"
          className="rounded-full shadow-lg"
          onClick={toggleFavorite}
          disabled={isToggling}
        >
          <Heart
            className={`w-6 h-6 transition-all duration-300 ${
              isFavorite ? "fill-white" : "fill-transparent"
            }`}
          />
        </Button>
      </div>
    </div>
  );
};

export default RestaurantProfilePublic;