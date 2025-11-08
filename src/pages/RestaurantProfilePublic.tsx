"use client";

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Heart, Share2, MapPin, Clock, Phone, MessageCircle, Globe, Instagram, Facebook, Twitter, Youtube, Link as LinkIcon } from 'lucide-react';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Card, CardContent } from '@/components/ui/card';
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from '@/components/ui/carousel';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

interface RestaurantProfilePublicProps {
  initialRestaurantId?: string;
  simulatedPlan?: 'free' | 'basic' | 'premium';
  isCompact?: boolean;
}

const RestaurantProfilePublic = ({ initialRestaurantId, simulatedPlan, isCompact = false }: RestaurantProfilePublicProps) => {
  const { restaurantId: paramRestaurantId } = useParams(); // Corrigido para 'restaurantId'
  const navigate = useNavigate();
  const restaurantId = initialRestaurantId || paramRestaurantId; // Usa o ID da prop ou da URL

  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [currentPlan, setCurrentPlan] = useState(simulatedPlan || 'free'); // Use simulatedPlan if provided
  const [followersCount, setFollowersCount] = useState(0);
  const [user, setUser] = useState(null);

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
    if (user && restaurant?.id) {
      checkIfFavorite(user.id, restaurant.id);
    }
  }, [user, restaurant]);

  const fetchRestaurant = async () => {
    setLoading(true);
    if (!restaurantId) { // Adiciona verificação para garantir que o ID existe
      setError("ID do restaurante não fornecido.");
      setLoading(false);
      return;
    }
    const { data, error } = await supabase
      .from('restaurants')
      .select(`
        *,
        menu_categories (
          id,
          name,
          order_index,
          is_active,
          is_popular,
          menu_items (
            id,
            name,
            description,
            price,
            image_url,
            order_index,
            is_active
          )
        ),
        restaurant_gallery (
          id,
          image_url,
          caption,
          order_index
        )
      `)
      .eq('id', restaurantId)
      .single();

    if (error) {
      setError(error.message);
      toast.error("Erro ao carregar perfil do restaurante.");
    } else {
      setRestaurant(data);
      if (!simulatedPlan) { // Only update currentPlan from fetched data if not simulating
        setCurrentPlan(data.plan);
      }
      fetchFollowersCount(data.id);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (restaurantId) {
      fetchRestaurant();
    }
  }, [restaurantId, simulatedPlan]); // Re-fetch if restaurantId or simulatedPlan changes

  const fetchFollowersCount = async (restaurantId) => {
    const { data, error } = await supabase.rpc('count_restaurant_followers', { p_restaurant_id: restaurantId });
    if (!error) {
      setFollowersCount(data);
    }
  };

  const checkIfFavorite = async (userId, restaurantId) => {
    const { data, error } = await supabase
      .from('user_favorites')
      .select('*')
      .eq('user_id', userId)
      .eq('restaurant_id', restaurantId)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
      console.error("Error checking favorite status:", error);
    }
    setIsFavorite(!!data);
  };

  const handleFavoriteToggle = async () => {
    if (!user) {
      toast.info("Você precisa estar logado para favoritar restaurantes.");
      navigate('/login');
      return;
    }

    if (isFavorite) {
      const { error } = await supabase
        .from('user_favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('restaurant_id', restaurant.id);

      if (error) {
        toast.error("Erro ao remover dos favoritos.");
      } else {
        setIsFavorite(false);
        setFollowersCount(prev => prev - 1);
        toast.success("Restaurante removido dos favoritos!");
      }
    } else {
      const { error } = await supabase
        .from('user_favorites')
        .insert({ user_id: user.id, restaurant_id: restaurant.id });

      if (error) {
        toast.error("Erro ao adicionar aos favoritos.");
      } else {
        setIsFavorite(true);
        setFollowersCount(prev => prev + 1);
        toast.success("Restaurante adicionado aos favoritos!");
      }
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: restaurant?.name || 'Restaurante',
        text: `Confira este restaurante: ${restaurant?.name}`,
        url: window.location.href,
      })
        .then(() => toast.success('Link compartilhado com sucesso!'))
        .catch((error) => toast.error('Erro ao compartilhar: ' + error.message));
    } else {
      navigator.clipboard.writeText(window.location.href)
        .then(() => toast.success('Link copiado para a área de transferência!'))
        .catch(() => toast.error('Erro ao copiar link.'));
    }
  };

  const getDayOfWeek = (date) => {
    const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    return days[date.getDay()];
  };

  const getCurrentOpeningHours = () => {
    if (!restaurant?.opening_hours || typeof restaurant.opening_hours !== 'object') return null;
    const today = getDayOfWeek(new Date());
    // Acessa a propriedade diretamente usando o dia da semana como chave
    return restaurant.opening_hours[today];
  };

  const formatTime = (time) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    return `${hours}:${minutes}`;
  };

  const renderSocialIcon = (network, url) => {
    if (!url) return null;
    let IconComponent;
    switch (network) {
      case 'instagram': IconComponent = Instagram; break;
      case 'facebook': IconComponent = Facebook; break;
      case 'twitter': IconComponent = Twitter; break;
      case 'youtube': IconComponent = Youtube; break;
      default: IconComponent = LinkIcon;
    }
    return (
      <a href={url} target="_blank" rel="noopener noreferrer" className="text-gray-600 hover:text-gray-900">
        <IconComponent size={24} />
      </a>
    );
  };

  if (loading) {
    return (
      <div className="max-w-md mx-auto p-4">
        <Skeleton className="w-full h-48 rounded-lg mb-4" />
        <div className="flex items-center justify-between mb-4">
          <Skeleton className="w-24 h-8" />
          <Skeleton className="w-24 h-8" />
        </div>
        <Skeleton className="w-3/4 h-8 mb-2" />
        <Skeleton className="w-1/2 h-6 mb-4" />
        <Skeleton className="w-full h-24 mb-4" />
        <Skeleton className="w-full h-32" />
      </div>
    );
  }

  if (error) {
    return <div className="text-center p-4 text-red-500">Erro: {error}</div>;
  }

  if (!restaurant) {
    return <div className="text-center p-4">Restaurante não encontrado.</div>;
  }

  const currentHours = getCurrentOpeningHours();
  const isOpen = currentHours && currentHours.is_open;
  const openingTime = currentHours ? formatTime(currentHours.open_time) : '';
  const closingTime = currentHours ? formatTime(currentHours.close_time) : '';

  const premiumLayout = currentPlan === 'premium';

  return (
    <div className="relative min-h-screen bg-gray-50">
      {/* Header */}
      {!isCompact && (
        <div className="fixed top-0 left-0 right-0 z-10 bg-white shadow-sm p-4 flex items-center justify-between max-w-md mx-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-chevron-left"><path d="m15 18-6-6 6-6"/></svg>
          </Button>
          <Button variant="ghost" size="icon" onClick={handleShare}>
            <Share2 className="h-5 w-5" />
          </Button>
        </div>
      )}

      {/* Main content container */}
      <div className={cn("max-w-md mx-auto", {
        "pt-0": !isCompact // Apply pt-0 only when not in compact mode (i.e., when header is present)
      })}>
        {/* Cover Image */}
        {premiumLayout && restaurant.cover_image_url && (
          <div className="relative w-full h-48 overflow-hidden">
            <img src={restaurant.cover_image_url} alt="Capa do Restaurante" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent"></div>
          </div>
        )}

        {/* Restaurant Info */}
        <div className={cn("relative bg-white rounded-t-3xl p-6 shadow-lg", {
          "-mt-16": premiumLayout, // Pull up content for premium layout
          "rounded-none shadow-none p-4": isCompact // Adjust styling for compact mode
        })}>
          <div className={cn("flex flex-col items-center -mt-16 mb-4", {
            "-mt-8": isCompact && premiumLayout, // Adjust margin for compact premium
            "-mt-0": isCompact && !premiumLayout // Adjust margin for compact non-premium
          })}>
            <div className={cn("w-32 h-32 rounded-full overflow-hidden border-4 border-white shadow-md", {
              "w-24 h-24": isCompact // Smaller avatar in compact mode
            })}>
              <img src={restaurant.image_url || "/placeholder.svg"} alt="Logo do Restaurante" className="w-full h-full object-cover" />
            </div>
            <h1 className={cn("text-3xl font-bold mt-4 text-gray-900", {
              "text-2xl mt-2": isCompact // Smaller title in compact mode
            })}>{restaurant.name}</h1>
            <p className={cn("text-gray-600 flex items-center mt-1", {
              "text-sm": isCompact // Smaller text in compact mode
            })}>
              <MapPin className="h-4 w-4 mr-1" />
              {restaurant.city}, {restaurant.state}
            </p>
            <div className="flex items-center mt-3 space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handleFavoriteToggle}
                className={cn("flex items-center text-gray-700 hover:text-red-500", {
                  "text-xs px-2 py-1": isCompact // Smaller button in compact mode
                })}
              >
                <Heart className={cn("h-5 w-5 mr-1", { "fill-red-500 text-red-500": isFavorite, "h-4 w-4": isCompact })} />
                {followersCount} Seguidores
              </Button>
              <Button
                variant={isFavorite ? "outline" : "default"}
                size="sm"
                onClick={handleFavoriteToggle}
                className={cn("rounded-full", {
                  "bg-red-500 text-white hover:bg-red-600": !isFavorite,
                  "border-red-500 text-red-500 hover:bg-red-50": isFavorite,
                  "text-xs px-2 py-1 h-auto": isCompact // Smaller button in compact mode
                })}
              >
                {isFavorite ? "Seguindo" : "Seguir"}
              </Button>
            </div>
            <p className={cn("mt-3 text-lg font-semibold", {
              "text-green-600": isOpen,
              "text-red-600": !isOpen,
              "text-base": isCompact // Smaller text in compact mode
            })}>
              <Clock className={cn("inline-block h-5 w-5 mr-1", { "h-4 w-4": isCompact })} />
              {isOpen ? `Aberto agora até ${closingTime}` : "Fechado"}
            </p>
          </div>

          {restaurant.description && (
            <div className={cn("mb-6 text-center text-gray-700", { "text-sm mb-4": isCompact })}>
              <p>{restaurant.description}</p>
            </div>
          )}

          <Separator className={cn("my-6", { "my-4": isCompact })} />

          {/* Order Options */}
          <h2 className={cn("text-2xl font-bold mb-4 text-gray-900 text-center", { "text-xl mb-3": isCompact })}>Faça seu Pedido</h2>
          <div className={cn("grid grid-cols-3 gap-4 mb-8", { "gap-2 mb-6": isCompact })}>
            {restaurant.whatsapp_url && (
              <a href={restaurant.whatsapp_url} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center p-4 bg-green-50 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                <MessageCircle className={cn("h-8 w-8 text-green-600 mb-2", { "h-6 w-6 mb-1": isCompact })} />
                <span className={cn("text-sm font-medium text-green-700", { "text-xs": isCompact })}>WhatsApp</span>
              </a>
            )}
            {restaurant.ifood_url && (
              <a href={restaurant.ifood_url} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center p-4 bg-red-50 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                <img src="/ifood-icon.png" alt="iFood" className={cn("h-8 w-8 mb-2", { "h-6 w-6 mb-1": isCompact })} />
                <span className={cn("text-sm font-medium text-red-700", { "text-xs": isCompact })}>iFood</span>
              </a>
            )}
            {restaurant.other_url && (
              <a href={restaurant.other_url} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center p-4 bg-blue-50 rounded-lg shadow-sm hover:shadow-md transition-shadow">
                <Globe className={cn("h-8 w-8 text-blue-600 mb-2", { "h-6 w-6 mb-1": isCompact })} />
                <span className={cn("text-sm font-medium text-blue-700", { "text-xs": isCompact })}>{restaurant.other_url_label || "Outro Link"}</span>
              </a>
            )}
          </div>

          {/* Gallery */}
          {restaurant.restaurant_gallery && restaurant.restaurant_gallery.length > 0 && (
            <>
              <Separator className={cn("my-6", { "my-4": isCompact })} />
              <h2 className={cn("text-2xl font-bold mb-4 text-gray-900 text-center", { "text-xl mb-3": isCompact })}>Galeria</h2>
              <Carousel className={cn("w-full max-w-xs mx-auto mb-8", { "mb-6": isCompact })}>
                <CarouselContent>
                  {restaurant.restaurant_gallery.sort((a, b) => a.order_index - b.order_index).map((item, index) => (
                    <CarouselItem key={index}>
                      <div className="p-1">
                        <Card>
                          <CardContent className="flex aspect-square items-center justify-center p-6">
                            <Dialog>
                              <DialogTrigger asChild>
                                <img src={item.image_url} alt={item.caption || `Imagem ${index + 1}`} className="w-full h-full object-cover rounded-md cursor-pointer" />
                              </DialogTrigger>
                              <DialogContent className="max-w-3xl p-0">
                                <img src={item.image_url} alt={item.caption || `Imagem ${index + 1}`} className="w-full h-full object-contain" />
                                {item.caption && <p className="text-center p-2">{item.caption}</p>}
                              </DialogContent>
                            </Dialog>
                          </CardContent>
                        </Card>
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious />
                <CarouselNext />
              </Carousel>
            </>
          )}

          {/* Menu Categories and Items */}
          {restaurant.menu_categories && restaurant.menu_categories.length > 0 && (
            <>
              <Separator className={cn("my-6", { "my-4": isCompact })} />
              <h2 className={cn("text-2xl font-bold mb-4 text-gray-900 text-center", { "text-xl mb-3": isCompact })}>Nosso Cardápio</h2>
              <ScrollArea className={cn("h-[400px] w-full rounded-md border p-4 mb-8", { "h-[300px] p-3 mb-6": isCompact })}>
                {restaurant.menu_categories
                  .filter(category => category.is_active)
                  .sort((a, b) => a.order_index - b.order_index)
                  .map((category) => (
                    <div key={category.id} className={cn("mb-6", { "mb-4": isCompact })}>
                      <h3 className={cn("text-xl font-semibold mb-3 flex items-center", { "text-lg mb-2": isCompact })}>
                        {category.name}
                        {category.is_popular && <Badge variant="secondary" className={cn("ml-2 bg-yellow-400 text-yellow-900", { "text-xs px-1 py-0.5": isCompact })}>Popular</Badge>}
                      </h3>
                      <div className="grid gap-4">
                        {category.menu_items
                          .filter(item => item.is_active)
                          .sort((a, b) => a.order_index - b.order_index)
                          .map((item) => (
                            <div key={item.id} className={cn("flex items-center space-x-4 p-3 border rounded-lg shadow-sm", { "p-2 space-x-3": isCompact })}>
                              {item.image_url && (
                                <img src={item.image_url} alt={item.name} className={cn("w-20 h-20 object-cover rounded-md", { "w-16 h-16": isCompact })} />
                              )}
                              <div className="flex-1">
                                <h4 className={cn("font-medium text-lg", { "text-base": isCompact })}>{item.name}</h4>
                                {item.description && <p className={cn("text-sm text-gray-600", { "text-xs": isCompact })}>{item.description}</p>}
                                <p className={cn("text-md font-bold text-gray-800 mt-1", { "text-sm": isCompact })}>R$ {item.price.toFixed(2)}</p>
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  ))}
              </ScrollArea>
            </>
          )}

          {/* Contact Info */}
          <Separator className={cn("my-6", { "my-4": isCompact })} />
          <h2 className={cn("text-2xl font-bold mb-4 text-gray-900 text-center", { "text-xl mb-3": isCompact })}>Contato</h2>
          <div className={cn("space-y-3 mb-8 text-center", { "space-y-2 mb-6 text-sm": isCompact })}>
            {restaurant.phone && (
              <p className="flex items-center justify-center text-gray-700">
                <Phone className={cn("h-5 w-5 mr-2", { "h-4 w-4": isCompact })} /> {restaurant.phone}
              </p>
            )}
            {restaurant.email && (
              <p className="flex items-center justify-center text-gray-700">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={cn("lucide lucide-mail h-5 w-5 mr-2", { "h-4 w-4": isCompact })}><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg> {restaurant.email}
              </p>
            )}
            {restaurant.address && (
              <p className="flex items-center justify-center text-gray-700">
                <MapPin className={cn("h-5 w-5 mr-2", { "h-4 w-4": isCompact })} /> {restaurant.address}, {restaurant.number} - {restaurant.neighborhood}, {restaurant.city} - {restaurant.state}
              </p>
            )}
          </div>

          {/* Social Networks */}
          {restaurant.social_networks && restaurant.social_networks.length > 0 && (
            <>
              <Separator className={cn("my-6", { "my-4": isCompact })} />
              <h2 className={cn("text-2xl font-bold mb-4 text-gray-900 text-center", { "text-xl mb-3": isCompact })}>Redes Sociais</h2>
              <div className={cn("flex justify-center space-x-4 mb-8", { "space-x-3 mb-6": isCompact })}>
                {restaurant.social_networks.map((social, index) => (
                  <div key={index}>
                    {renderSocialIcon(social.network, social.url)}
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default RestaurantProfilePublic;