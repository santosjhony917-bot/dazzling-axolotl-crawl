"use client";

import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { MapPin, Clock, Phone, Mail, Link as LinkIcon, Heart, Share2, ChevronLeft, Star } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { RestaurantAddressHoursSection } from './RestaurantAddressHoursSection';
import { RestaurantGallerySection } from './RestaurantGallerySection'; // Corrected import
import { RestaurantMenuSection } from './RestaurantMenuSection'; // Corrected import
import { RestaurantReviewsSection } from './RestaurantReviewsSection'; // Corrected import
import { RestaurantSocialNetworksSection } from './RestaurantSocialNetworksSection'; // Corrected import
import { PublicRestaurantData } from '@/types/restaurant'; // Assuming this type exists

interface FreeProfileLayoutProps {
  restaurant: PublicRestaurantData;
  toggleFavorite: () => void;
  isFavoriteMutating: boolean;
  isCompact: boolean;
}

const FreeProfileLayout: React.FC<FreeProfileLayoutProps> = ({ restaurant: initialRestaurant, toggleFavorite, isFavoriteMutating, isCompact }) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [restaurant, setRestaurant] = useState<PublicRestaurantData | null>(initialRestaurant); // Changed type here
  const [loading, setLoading] = useState(false); // Initial loading handled by parent
  const [error, setError] = useState<string | null>(null);
  const [isFavorite, setIsFavorite] = useState(false); // This will be managed by parent's isFavoriteMutating
  const [showShareDialog, setShowShareDialog] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    setRestaurant(initialRestaurant);
  }, [initialRestaurant]);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
    };
    fetchUser();

    const { data: authListener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const checkFavorite = async () => {
      if (user && restaurant) {
        const { data, error } = await supabase
          .from('user_favorites')
          .select('*')
          .eq('user_id', user.id)
          .eq('restaurant_id', restaurant.id)
          .single();

        if (data) {
          setIsFavorite(true);
        } else {
          setIsFavorite(false);
        }
        if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
          console.error("Error checking favorite:", error);
        }
      } else {
        setIsFavorite(false);
      }
    };

    checkFavorite();
  }, [user, restaurant]);

  const handleFavoriteToggle = async () => {
    if (!user) {
      navigate('/login');
      return;
    }
    toggleFavorite(); // Use the parent's toggleFavorite
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: restaurant?.name || 'Restaurante',
        text: `Confira este restaurante: ${restaurant?.name}`,
        url: window.location.href,
      })
        .then(() => console.log('Compartilhado com sucesso!'))
        .catch((error) => console.error('Erro ao compartilhar:', error));
    } else {
      setShowShareDialog(true);
    }
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    alert('Link copiado para a área de transferência!');
    setShowShareDialog(false);
  };

  if (loading) {
    return <div className="flex justify-center items-center min-h-screen">Carregando...</div>;
  }

  if (error) {
    return <div className="flex justify-center items-center min-h-screen text-red-500">Erro: {error}</div>;
  }

  if (!restaurant) {
    return <div className="flex justify-center items-center min-h-screen">Restaurante não encontrado.</div>;
  }

  const restaurantImage = restaurant.image_url || '/placeholder-restaurant.jpg';
  const coverImage = restaurant.cover_image_url || '/placeholder-cover.jpg';

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Cover Image */}
      <div className="relative h-48 md:h-64 bg-cover bg-center" style={{ backgroundImage: `url(${coverImage})` }}>
        <div className="absolute inset-0 bg-black opacity-40"></div>
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 left-4 text-white hover:bg-white hover:text-primary"
          onClick={() => navigate(-1)}
        >
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <div className="absolute bottom-4 left-4 flex items-center space-x-4">
          <Avatar className="w-24 h-24 border-4 border-white shadow-lg">
            <AvatarImage src={restaurantImage} alt={restaurant.name} />
            <AvatarFallback>{restaurant.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <h1 className="text-3xl font-bold text-white drop-shadow-lg">{restaurant.name}</h1>
        </div>
      </div>

      {/* Main Content */}
      <div className="container mx-auto p-4 -mt-12 relative z-10">
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-800">{restaurant.name}</h2>
            <div className="flex space-x-2">
              <Button variant="outline" size="icon" onClick={handleFavoriteToggle} className={isFavorite ? "text-red-500 border-red-500" : ""} disabled={isFavoriteMutating}>
                <Heart className={isFavorite ? "fill-current" : ""} />
              </Button>
              <Button variant="outline" size="icon" onClick={handleShare}>
                <Share2 />
              </Button>
            </div>
          </div>
          <p className="text-gray-600 mb-4">{restaurant.description}</p>
          <div className="flex items-center text-yellow-500 mb-4">
            <Star className="h-5 w-5 fill-current mr-1" />
            <span>4.5 (120 avaliações)</span> {/* Placeholder for ratings */}
          </div>
          <Separator className="my-4" />
          <div className="flex flex-wrap gap-4 text-gray-700 text-sm">
            {restaurant.category && (
              <span className="flex items-center">
                <MapPin className="h-4 w-4 mr-1" /> {restaurant.category}
              </span>
            )}
            {restaurant.city && restaurant.state && (
              <span className="flex items-center">
                <MapPin className="h-4 w-4 mr-1" /> {restaurant.city}, {restaurant.state}
              </span>
            )}
            {/* Add more quick info here if needed */}
          </div>
        </div>

        {/* Tabs for more details */}
        <Tabs defaultValue="gerais" className="w-full">
          <TabsList className="grid w-full grid-cols-3 md:grid-cols-4 lg:grid-cols-5">
            <TabsTrigger value="gerais">Gerais</TabsTrigger>
            <TabsTrigger value="cardapio">Cardápio</TabsTrigger>
            <TabsTrigger value="galeria">Galeria</TabsTrigger>
            <TabsTrigger value="redes-sociais">Redes Sociais</TabsTrigger>
            <TabsTrigger value="avaliacoes">Avaliações</TabsTrigger>
          </TabsList>
          <TabsContent value="gerais" className="mt-4">
            <RestaurantAddressHoursSection restaurant={restaurant} />
          </TabsContent>
          <TabsContent value="cardapio" className="mt-4">
            <RestaurantMenuSection restaurantId={restaurant.id} />
          </TabsContent>
          <TabsContent value="galeria" className="mt-4">
            <RestaurantGallerySection restaurantId={restaurant.id} />
          </TabsContent>
          <TabsContent value="redes-sociais" className="mt-4">
            <RestaurantSocialNetworksSection restaurant={restaurant} />
          </TabsContent>
          <TabsContent value="avaliacoes" className="mt-4">
            <RestaurantReviewsSection restaurantId={restaurant.id} />
          </TabsContent>
        </Tabs>
      </div>

      {/* Share Dialog */}
      <Dialog open={showShareDialog} onOpenChange={setShowShareDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Compartilhar Restaurante</DialogTitle>
            <DialogDescription>
              Copie o link abaixo para compartilhar este restaurante.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2">
            <input
              type="text"
              readOnly
              value={window.location.href}
              className="flex-1 p-2 border rounded-md bg-gray-100"
            />
            <Button onClick={copyShareLink}>Copiar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default FreeProfileLayout;