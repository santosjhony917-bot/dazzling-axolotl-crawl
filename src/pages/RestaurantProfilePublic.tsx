"use client";

import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import {
  ArrowLeft,
  Share2,
  Heart,
  Star,
  Clock,
  MapPin,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { useToast } from "@/components/ui/use-toast";
import { motion } from "framer-motion";
import RestaurantCoverImage from "@/components/public/RestaurantCoverImage";
import RestaurantLogo from "@/components/public/RestaurantLogo";
import OrderChannelsSection from "@/components/public/OrderChannelsSection";
import PublicMenuSection from "@/components/public/PublicMenuSection";
import RestaurantGallerySection from "@/components/public/RestaurantGallerySection";
import DetailedHoursDisplay from "@/components/public/DetailedHoursDisplay";
import AdditionalInfo from "@/components/public/AdditionalInfo";
import { isRestaurantOpen } from "@/lib/utils";

interface RestaurantProfilePublicProps {
  initialRestaurantId?: string;
  simulatedPlan?: 'free' | 'premium';
  isCompact?: boolean;
}

const RestaurantProfilePublic = ({ initialRestaurantId, simulatedPlan, isCompact }: RestaurantProfilePublicProps) => {
  const params = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const id = initialRestaurantId || params.id;

  const [restaurant, setRestaurant] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [isToggling, setIsToggling] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };
    fetchUser();
  }, []);

  useEffect(() => {
    const fetchRestaurant = async () => {
      if (!id) return;

      setLoading(true);

      const { data, error } = await supabase
        .from("restaurants")
        .select(
          `
          *,
          menu_categories (
            *,
            menu_items (
              *
            )
          ),
          followers_count:user_favorites!restaurant_id(count)
        `
        )
        .eq("id", id)
        .single();

      if (error) {
        console.error("Error fetching restaurant:", error);
        toast({
          title: "Erro",
          description: "Não foi possível carregar os dados do restaurante.",
          variant: "destructive",
        });
      } else {
        // Sort categories and items by order_index
        if (data.menu_categories) {
          data.menu_categories.sort((a, b) => a.order_index - b.order_index);
          data.menu_categories.forEach((category) => {
            if (category.menu_items) {
              category.menu_items.sort((a, b) => a.order_index - b.order_index);
            }
          });
        }
        
        if (simulatedPlan) {
          data.plan = simulatedPlan;
        }
        
        setRestaurant(data);
      }
      setLoading(false);
    };

    fetchRestaurant();
  }, [id, toast, simulatedPlan]);

  useEffect(() => {
    const checkIfFavorite = async () => {
      if (!user || !restaurant || isCompact) return;

      const { data, error } = await supabase
        .from("user_favorites")
        .select("id")
        .eq("user_id", user.id)
        .eq("restaurant_id", restaurant.id)
        .single();

      if (data && !error) {
        setIsFavorite(true);
      }
    };

    checkIfFavorite();
  }, [user, restaurant, isCompact]);

  const handleShare = () => {
    if (navigator.share) {
      navigator
        .share({
          title: restaurant?.name,
          text: `Confira o cardápio de ${restaurant?.name}!`,
          url: window.location.href,
        })
        .catch((error) => console.error("Error sharing:", error));
    } else {
      navigator.clipboard.writeText(window.location.href);
      toast({
        title: "Link copiado!",
        description: "O link do perfil foi copiado para a área de transferência.",
      });
    }
  };

  const toggleFavorite = async () => {
    if (!user) {
      toast({
        title: "Faça login",
        description: "Você precisa estar logado para favoritar um restaurante.",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }

    setIsToggling(true);
    if (isFavorite) {
      // Remove from favorites
      const { error } = await supabase
        .from("user_favorites")
        .delete()
        .match({ user_id: user.id, restaurant_id: restaurant.id });

      if (error) {
        toast({
          title: "Erro",
          description: "Não foi possível remover dos favoritos.",
          variant: "destructive",
        });
      } else {
        setIsFavorite(false);
        toast({
          title: "Removido dos favoritos",
        });
      }
    } else {
      // Add to favorites
      const { error } = await supabase
        .from("user_favorites")
        .insert([{ user_id: user.id, restaurant_id: restaurant.id }]);

      if (error) {
        toast({
          title: "Erro",
          description: "Não foi possível adicionar aos favoritos.",
          variant: "destructive",
        });
      } else {
        setIsFavorite(true);
        toast({
          title: "Adicionado aos favoritos!",
        });
      }
    }
    setIsToggling(false);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-background-light">
        <div className="text-center">
          <p className="text-lg font-semibold text-primary">Carregando perfil...</p>
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="flex items-center justify-center h-screen bg-background-light">
        <div className="text-center">
          <p className="text-lg font-semibold text-destructive">Restaurante não encontrado.</p>
          <Button onClick={() => navigate("/")} className="mt-4">
            Voltar para a Home
          </Button>
        </div>
      </div>
    );
  }

  const isOpen = isRestaurantOpen(restaurant.opening_hours);
  const followerCount =
    (restaurant.followers_override ?? 0) + (restaurant.followers_count?.[0]?.count ?? 0);

  const containerClasses = isCompact 
    ? "bg-white relative" 
    : "bg-background-light min-h-screen";
  
  const wrapperClasses = isCompact 
    ? "" 
    : "max-w-md mx-auto relative bg-white shadow-lg min-h-screen";

  return (
    <div className={containerClasses}>
      <div className={wrapperClasses}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5 }}
        >
          {/* Cover Image and Actions */}
          <div className="relative w-full">
            <RestaurantCoverImage coverImageUrl={restaurant.cover_image_url} />
            <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent" />
            {!isCompact && (
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
            )}
          </div>

          {/* Main Content Area */}
          <main className="relative z-10 mt-[-80px] px-4 pb-20">
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
              {/* Gallery Section */}
              <Card className="rounded-2xl shadow-soft-lg border-none p-4 sm:p-6">
                <h2 className="text-2xl font-bold text-primary mb-4">Galeria</h2>
                <RestaurantGallerySection id="gallery" restaurantId={restaurant.id} plan={restaurant.plan} />
              </Card>

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
                      Horários
                    </h3>
                    <DetailedHoursDisplay schedule={restaurant.opening_hours} />
                  </div>
                  <AdditionalInfo restaurant={restaurant as any} />
                </div>
              </Card>
            </div>
          </main>
        </motion.div>
        {!isCompact && (
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
        )}
      </div>
    </div>
  );
};

export default RestaurantProfilePublic;