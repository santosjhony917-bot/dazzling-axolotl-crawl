"use client";

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Share2, Heart, MapPin, Clock, Phone, Mail, Link as LinkIcon, MessageCircle, Utensils, Instagram, Facebook, Twitter, Globe } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';

type Restaurant = {
  id: string;
  user_id: string;
  name: string;
  description: string;
  image_url: string;
  cover_image_url: string;
  plan: 'free' | 'basic' | 'premium';
  phone: string;
  email: string;
  cnpj: string;
  category: string;
  whatsapp_url: string;
  ifood_url: string;
  other_url: string;
  other_url_label: string;
  address: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  cep: string;
  latitude: number;
  longitude: number;
  opening_hours: { [key: string]: { open: string; close: string; }[] };
  external_url: string;
  followers_override: number;
  payment_methods: string[];
  social_networks: { platform: string; url: string }[];
};

type MenuItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  image_url: string;
  is_active: boolean;
  order_index: number;
};

type MenuCategory = {
  id: string;
  name: string;
  is_active: boolean;
  is_popular: boolean;
  order_index: number;
  menu_items: MenuItem[];
};

type GalleryImage = {
  id: string;
  image_url: string;
  caption: string;
  order_index: number;
};

interface RestaurantProfilePublicProps {
  initialRestaurantId?: string;
  simulatedPlan?: 'free' | 'basic' | 'premium';
  isCompact?: boolean;
}

const RestaurantProfilePublic = ({ initialRestaurantId, simulatedPlan, isCompact }: RestaurantProfilePublicProps) => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const restaurantId = initialRestaurantId || id; // Use initialRestaurantId if provided

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [menuCategories, setMenuCategories] = useState<MenuCategory[]>([]);
  const [galleryImages, setGalleryImages] = useState<GalleryImage[]>([]);
  const [loading, setLoading] = useState(true);
  const [isFavorite, setIsFavorite] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [currentPlan, setCurrentPlan] = useState<Restaurant['plan']>('free');
  const [user, setUser] = useState<any>(null);

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
    if (!restaurantId) {
      toast.error("ID do restaurante não fornecido.");
      if (!simulatedPlan) { // Only navigate if not in a simulated view
        navigate('/');
      }
      return;
    }

    const fetchRestaurantData = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('restaurants')
        .select(`
          *,
          menu_categories (
            id,
            name,
            is_active,
            is_popular,
            order_index,
            menu_items (
              id,
              name,
              description,
              price,
              image_url,
              is_active,
              order_index
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
        toast.error("Erro ao carregar dados do restaurante.");
        console.error(error);
        setLoading(false);
        if (!simulatedPlan) { // Only navigate if not in a simulated view
          navigate('/');
        }
        return;
      }

      if (data) {
        setRestaurant(data as Restaurant);
        setCurrentPlan(simulatedPlan || data.plan); // Use simulatedPlan if provided
        setMenuCategories(data.menu_categories.filter((cat: MenuCategory) => cat.is_active).sort((a: MenuCategory, b: MenuCategory) => a.order_index - b.order_index) as MenuCategory[]);
        setGalleryImages(data.restaurant_gallery.sort((a: GalleryImage, b: GalleryImage) => a.order_index - b.order_index) as GalleryImage[]);
        fetchFollowersCount(data.id);
        if (user) {
          checkIfFavorite(data.id, user.id);
        }
      }
      setLoading(false);
    };

    const fetchFollowersCount = async (restaurantId: string) => {
      const { data, error } = await supabase.rpc('count_restaurant_followers', { p_restaurant_id: restaurantId });
      if (!error && data !== null) {
        setFollowersCount(data + (restaurant?.followers_override || 0));
      } else if (error) {
        console.error("Error fetching followers count:", error);
      }
    };

    const checkIfFavorite = async (restaurantId: string, userId: string) => {
      const { data, error } = await supabase
        .from('user_favorites')
        .select('id')
        .eq('user_id', userId)
        .eq('restaurant_id', restaurantId)
        .single();

      if (!error && data) {
        setIsFavorite(true);
      } else {
        setIsFavorite(false);
      }
    };

    fetchRestaurantData();
  }, [restaurantId, navigate, user, simulatedPlan]); // Add simulatedPlan to dependencies

  const handleFavoriteToggle = async () => {
    if (!user) {
      toast.info("Faça login para adicionar aos favoritos.");
      navigate('/login');
      return;
    }

    if (!restaurant?.id) return;

    if (isFavorite) {
      const { error } = await supabase
        .from('user_favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('restaurant_id', restaurant.id);

      if (error) {
        toast.error("Erro ao remover dos favoritos.");
        console.error(error);
      } else {
        setIsFavorite(false);
        setFollowersCount(prev => prev - 1);
        toast.success("Removido dos favoritos!");
      }
    } else {
      const { error } = await supabase
        .from('user_favorites')
        .insert({ user_id: user.id, restaurant_id: restaurant.id });

      if (error) {
        toast.error("Erro ao adicionar aos favoritos.");
        console.error(error);
      } else {
        setIsFavorite(true);
        setFollowersCount(prev => prev + 1);
        toast.success("Adicionado aos favoritos!");
      }
    }
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: restaurant?.name || 'Restaurante',
        text: `Confira o restaurante ${restaurant?.name || ''} no Food Explorer!`,
        url: window.location.href,
      })
        .then(() => toast.success('Link compartilhado com sucesso!'))
        .catch((error) => console.error('Erro ao compartilhar:', error));
    } else {
      setIsShareModalOpen(true);
    }
  };

  const copyShareLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success("Link copiado para a área de transferência!");
    setIsShareModalOpen(false);
  };

  const getDayOfWeek = (date: Date) => {
    const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
    return days[date.getDay()];
  };

  const formatTime = (time: string) => {
    if (!time) return '';
    const [hours, minutes] = time.split(':');
    return `${hours}:${minutes}`;
  };

  const getOpeningStatus = () => {
    if (!restaurant?.opening_hours) return { status: 'Fechado', color: 'text-red-500' };

    const now = new Date();
    const day = getDayOfWeek(now);
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();

    const todayHours = restaurant.opening_hours[day];

    if (!todayHours || todayHours.length === 0) {
      return { status: 'Fechado', color: 'text-red-500' };
    }

    for (const period of todayHours) {
      const [openHour, openMinute] = period.open.split(':').map(Number);
      const [closeHour, closeMinute] = period.close.split(':').map(Number);

      const openTime = openHour * 60 + openMinute;
      const closeTime = closeHour * 60 + closeMinute;
      const currentTime = currentHour * 60 + currentMinute;

      if (currentTime >= openTime && currentTime < closeTime) {
        return { status: `Aberto agora até ${formatTime(period.close)}`, color: 'text-green-500' };
      }
    }

    return { status: 'Fechado', color: 'text-red-500' };
  };

  const { status: openingStatus, color: openingStatusColor } = getOpeningStatus();

  if (loading) {
    return (
      <div className="max-w-md mx-auto">
        <Skeleton className="w-full h-48" />
        <div className="p-4 space-y-4">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
          <div className="flex space-x-2">
            <Skeleton className="h-10 w-24" />
            <Skeleton className="h-10 w-24" />
          </div>
          <Skeleton className="h-6 w-full" />
          <Skeleton className="h-32 w-full" />
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return <div className="text-center p-4">Restaurante não encontrado.</div>;
  }

  const renderSocialIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'instagram': return <Instagram size={20} />;
      case 'facebook': return <Facebook size={20} />;
      case 'twitter': return <Twitter size={20} />;
      case 'whatsapp': return <MessageCircle size={20} />; // Changed to MessageCircle
      default: return <Globe size={20} />;
    }
  };

  return (
    <div className="relative min-h-screen bg-gray-50">
      {/* Cover Image */}
      {currentPlan === 'premium' && restaurant.cover_image_url && (
        <div className="relative w-full h-48 md:h-64 overflow-hidden">
          <img
            src={restaurant.cover_image_url}
            alt="Capa do Restaurante"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent"></div>
        </div>
      )}

      {/* Navigation Bar (fixed at top, transparent for premium) */}
      <div className={cn(
        "fixed top-0 left-0 right-0 z-20 flex items-center justify-between p-4",
        {
          "bg-transparent text-white": currentPlan === 'premium',
          "bg-white text-gray-800 shadow-sm": currentPlan !== 'premium'
        }
      )}>
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className={cn({ "text-white": currentPlan === 'premium' })}>
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
        </Button>
        <Button variant="ghost" size="icon" onClick={handleShare} className={cn({ "text-white": currentPlan === 'premium' })}>
          <Share2 className="h-5 w-5" />
        </Button>
      </div>

      {/* Profile Picture and Main Info */}
      <div className={cn("max-w-md mx-auto relative z-10", {
        "mt-[-60px]": currentPlan === 'premium', // Overlap cover image for premium
        "mt-4": currentPlan !== 'premium' // Standard margin for non-premium
      })}>
        <div className="flex flex-col items-center px-4">
          <Avatar className="w-28 h-28 border-4 border-white shadow-lg">
            <AvatarImage src={restaurant.image_url} alt={restaurant.name} />
            <AvatarFallback>{restaurant.name.charAt(0)}</AvatarFallback>
          </Avatar>
          <h1 className="text-3xl font-bold mt-4 text-gray-900">{restaurant.name}</h1>
          <p className="text-gray-600 flex items-center mt-1">
            <MapPin className="h-4 w-4 mr-1" /> {restaurant.city}, {restaurant.state}
          </p>
          <div className="flex items-center space-x-4 mt-3">
            <div className="flex items-center text-gray-700">
              <Heart className={cn("h-5 w-5 mr-1", { "fill-red-500 text-red-500": isFavorite })} />
              <span>{followersCount} Seguidores</span>
            </div>
            <Button
              onClick={handleFavoriteToggle}
              className={cn("rounded-full px-6 py-2 text-white", {
                "bg-red-500 hover:bg-red-600": !isFavorite,
                "bg-gray-400 hover:bg-gray-500": isFavorite
              })}
            >
              {isFavorite ? 'Seguindo' : 'Seguir'}
            </Button>
          </div>
          <p className={cn("flex items-center mt-2 text-sm font-medium", openingStatusColor)}>
            <Clock className="h-4 w-4 mr-1" /> {openingStatus}
          </p>
        </div>
      </div>

      {/* Main content container */}
      <div className={cn("max-w-md mx-auto", {
        "pt-0 mt-0 py-0": currentPlan === 'premium', // Garante que não há padding ou margin superior para premium
        "pt-24": currentPlan !== 'premium' // Adiciona padding-top apenas para perfis não-premium
      })}>
        <div className="p-4 space-y-6">
          {/* Call to Action / Order Section */}
          {(restaurant.whatsapp_url || restaurant.ifood_url || restaurant.other_url) && (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl font-semibold">Faça seu Pedido</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-3 gap-4">
                {restaurant.whatsapp_url && (
                  <a href={restaurant.whatsapp_url} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center justify-center p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                    <MessageCircle className="h-8 w-8 text-green-500" /> {/* Changed to MessageCircle */}
                    <span className="text-sm text-center mt-1">WhatsApp</span>
                  </a>
                )}
                {restaurant.ifood_url && (
                  <a href={restaurant.ifood_url} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center justify-center p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                    <img src="/ifood-icon.png" alt="iFood" className="h-8 w-8" />
                    <span className="text-sm text-center mt-1">iFood</span>
                  </a>
                )}
                {restaurant.other_url && (
                  <a href={restaurant.other_url} target="_blank" rel="noopener noreferrer" className="flex flex-col items-center justify-center p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                    <LinkIcon className="h-8 w-8 text-blue-500" />
                    <span className="text-sm text-center mt-1">{restaurant.other_url_label || 'Outro Link'}</span>
                  </a>
                )}
              </CardContent>
            </Card>
          )}

          {/* Description */}
          {restaurant.description && (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl font-semibold">Sobre</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-700">{restaurant.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Menu Section */}
          {menuCategories.length > 0 && (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl font-semibold">Cardápio</CardTitle>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue={menuCategories[0]?.id} className="w-full">
                  <ScrollArea className="w-full whitespace-nowrap rounded-md border">
                    <TabsList className="w-full justify-start">
                      {menuCategories.map(category => (
                        <TabsTrigger key={category.id} value={category.id}>
                          {category.name}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    <Separator />
                  </ScrollArea>
                  {menuCategories.map(category => (
                    <TabsContent key={category.id} value={category.id} className="mt-4">
                      <div className="space-y-4">
                        {category.menu_items.filter(item => item.is_active).sort((a, b) => a.order_index - b.order_index).map(item => (
                          <div key={item.id} className="flex items-center space-x-4 border-b pb-4 last:border-b-0 last:pb-0">
                            {item.image_url && (
                              <AspectRatio ratio={1 / 1} className="w-20 h-20 flex-shrink-0 rounded-md overflow-hidden">
                                <img src={item.image_url} alt={item.name} className="w-full h-full object-cover" />
                              </AspectRatio>
                            )}
                            <div className="flex-grow">
                              <h3 className="font-semibold text-lg">{item.name}</h3>
                              {item.description && <p className="text-sm text-gray-600">{item.description}</p>}
                              <p className="font-bold text-gray-800 mt-1">R$ {item.price.toFixed(2)}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </TabsContent>
                  ))}
                </Tabs>
              </CardContent>
            </Card>
          )}

          {/* Gallery Section */}
          {galleryImages.length > 0 && (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl font-semibold">Galeria</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  {galleryImages.map(image => (
                    <AspectRatio key={image.id} ratio={16 / 9} className="rounded-md overflow-hidden">
                      <img src={image.image_url} alt={image.caption || "Imagem da galeria"} className="w-full h-full object-cover" />
                    </AspectRatio>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Contact Info */}
          {(restaurant.phone || restaurant.email || restaurant.address) && (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl font-semibold">Contato e Localização</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {restaurant.phone && (
                  <div className="flex items-center text-gray-700">
                    <Phone className="h-5 w-5 mr-2 text-gray-500" />
                    <a href={`tel:${restaurant.phone}`} className="hover:underline">{restaurant.phone}</a>
                  </div>
                )}
                {restaurant.email && (
                  <div className="flex items-center text-gray-700">
                    <Mail className="h-5 w-5 mr-2 text-gray-500" />
                    <a href={`mailto:${restaurant.email}`} className="hover:underline">{restaurant.email}</a>
                  </div>
                )}
                {restaurant.address && (
                  <div className="flex items-start text-gray-700">
                    <MapPin className="h-5 w-5 mr-2 text-gray-500 flex-shrink-0 mt-1" />
                    <p>{restaurant.address}, {restaurant.number} - {restaurant.neighborhood}, {restaurant.city} - {restaurant.state}, {restaurant.cep}</p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Social Networks */}
          {restaurant.social_networks && restaurant.social_networks.length > 0 && (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl font-semibold">Redes Sociais</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-4">
                {restaurant.social_networks.map((social, index) => (
                  <a key={index} href={social.url} target="_blank" rel="noopener noreferrer" className="flex items-center space-x-2 text-blue-600 hover:underline">
                    {renderSocialIcon(social.platform)}
                    <span>{social.platform}</span>
                  </a>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Payment Methods */}
          {restaurant.payment_methods && restaurant.payment_methods.length > 0 && (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl font-semibold">Formas de Pagamento</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {restaurant.payment_methods.map((method, index) => (
                  <Badge key={index} variant="secondary" className="px-3 py-1 text-sm">
                    {method}
                  </Badge>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Opening Hours */}
          {restaurant.opening_hours && Object.keys(restaurant.opening_hours).length > 0 && (
            <Card className="shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl font-semibold">Horário de Funcionamento</CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-1 text-gray-700">
                  {Object.entries(restaurant.opening_hours).map(([day, hours]) => (
                    <li key={day} className="flex justify-between">
                      <span className="capitalize">{day}:</span>
                      <span>
                        {hours.length > 0
                          ? hours.map(period => `${formatTime(period.open)} - ${formatTime(period.close)}`).join(', ')
                          : 'Fechado'}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Share Modal */}
      <Dialog open={isShareModalOpen} onOpenChange={setIsShareModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Compartilhar Restaurante</DialogTitle>
            <DialogDescription>
              Copie o link abaixo para compartilhar este restaurante.
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center space-x-2">
            <Input value={window.location.href} readOnly />
            <Button onClick={copyShareLink}>Copiar</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default RestaurantProfilePublic;