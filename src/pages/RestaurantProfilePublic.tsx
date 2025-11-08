"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { cn } from "@/lib/utils";
import { MapPin, Phone, Globe, Instagram, Facebook, Twitter, Clock, DollarSign, Utensils, Star, Heart, Share2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/components/ui/use-toast';

interface RestaurantProfilePublicProps {
  initialRestaurantId?: string;
  simulatedPlan?: 'free' | 'basic' | 'premium';
  isCompact?: boolean;
}

const RestaurantProfilePublic = ({ initialRestaurantId, simulatedPlan, isCompact }: RestaurantProfilePublicProps) => {
  const { id } = useParams();
  const [restaurant, setRestaurant] = useState(null);
  const [menuCategories, setMenuCategories] = useState([]);
  const [gallery, setGallery] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isFavorite, setIsFavorite] = useState(false);
  const [user, setUser] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    const fetchUser = async () => {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        console.error("Error fetching user:", error);
      } else {
        setUser(data.user);
      }
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
    // Use initialRestaurantId if provided, otherwise fall back to useParams id
    const restaurantIdToFetch = initialRestaurantId || id;
    if (!restaurantIdToFetch) return;

    const fetchRestaurantData = async () => {
      setLoading(true);
      try {
        const { data: restaurantData, error: restaurantError } = await supabase
          .from('restaurants')
          .select('*')
          .eq('id', restaurantIdToFetch)
          .single();

        if (restaurantError) {
          setError(restaurantError.message);
          return;
        }
        setRestaurant(restaurantData);

        const { data: categoriesData, error: categoriesError } = await supabase
          .from('menu_categories')
          .select('*, menu_items(*)')
          .eq('restaurant_id', restaurantIdToFetch)
          .order('order_index', { ascending: true })
          .order('order_index', { foreignTable: 'menu_items', ascending: true });

        if (categoriesError) {
          setError(categoriesError.message);
          return;
        }
        setMenuCategories(categoriesData);

        const { data: galleryData, error: galleryError } = await supabase
          .from('restaurant_gallery')
          .select('*')
          .eq('restaurant_id', restaurantIdToFetch)
          .order('order_index', { ascending: true });

        if (galleryError) {
          console.error("Error fetching gallery:", galleryError);
          // Don't set global error for gallery, just log it.
          // The app can still render without gallery.
        } else {
          setGallery(galleryData);
        }
      } catch (e) {
        console.error("Unhandled error during data fetching:", e);
        setError("Ocorreu um erro inesperado ao carregar os dados.");
      } finally {
        setLoading(false);
      }
    };

    fetchRestaurantData();
  }, [id, initialRestaurantId]);

  useEffect(() => {
    const checkFavorite = async () => {
      if (user && restaurant) {
        const { data, error } = await supabase
          .from('user_favorites')
          .select('*')
          .eq('user_id', user.id)
          .eq('restaurant_id', restaurant.id)
          .single();

        if (error && error.code !== 'PGRST116') { // PGRST116 means no rows found
          console.error("Error checking favorite:", error);
        } else if (data) {
          setIsFavorite(true);
        } else {
          setIsFavorite(false);
        }
      }
    };
    checkFavorite();
  }, [user, restaurant]);

  const handleFavoriteToggle = async () => {
    if (!user) {
      toast({
        title: "Login necessário",
        description: "Você precisa estar logado para adicionar aos favoritos.",
        variant: "destructive",
      });
      return;
    }

    if (!restaurant) return;

    if (isFavorite) {
      const { error } = await supabase
        .from('user_favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('restaurant_id', restaurant.id);

      if (error) {
        console.error("Error removing favorite:", error);
        toast({
          title: "Erro",
          description: "Não foi possível remover dos favoritos.",
          variant: "destructive",
        });
      } else {
        setIsFavorite(false);
        toast({
          title: "Removido dos favoritos",
          description: `${restaurant.name} foi removido da sua lista de favoritos.`,
        });
      }
    } else {
      const { error } = await supabase
        .from('user_favorites')
        .insert({ user_id: user.id, restaurant_id: restaurant.id });

      if (error) {
        console.error("Error adding favorite:", error);
        toast({
          title: "Erro",
          description: "Não foi possível adicionar aos favoritos.",
          variant: "destructive",
        });
      } else {
        setIsFavorite(true);
        toast({
          title: "Adicionado aos favoritos",
          description: `${restaurant.name} foi adicionado à sua lista de favoritos!`,
        });
      }
    }
  };

  if (loading) {
    return <div className="flex justify-center items-center h-screen">Carregando...</div>;
  }

  if (error) {
    return <div className="flex justify-center items-center h-screen text-red-500">Erro: {error}</div>;
  }

  if (!restaurant) {
    return <div className="flex justify-center items-center h-screen">Restaurante não encontrado.</div>;
  }

  // Use simulatedPlan if provided, otherwise fall back to restaurant.plan
  const currentPlan = simulatedPlan || restaurant.plan;

  const formatOpeningHours = (hours) => {
    if (!hours) return "Não informado";
    const days = ["Domingo", "Segunda", "Terça", "Quarta", "Quinta", "Sexta", "Sábado"];
    return days.map(day => {
      const dayHours = hours[day.toLowerCase()];
      return dayHours ? `${day}: ${dayHours.open} - ${dayHours.close}` : `${day}: Fechado`;
    }).join('\n');
  };

  const shareUrl = window.location.href;
  const shareTitle = `Confira o ${restaurant.name} no Food Explorer!`;

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: shareTitle,
          url: shareUrl,
        });
        toast({
          title: "Compartilhado!",
          description: "O perfil do restaurante foi compartilhado com sucesso.",
        });
      } catch (error) {
        console.error('Error sharing:', error);
        toast({
          title: "Erro ao compartilhar",
          description: "Não foi possível compartilhar o perfil do restaurante.",
          variant: "destructive",
        });
      }
    } else {
      navigator.clipboard.writeText(shareUrl);
      toast({
        title: "Link copiado!",
        description: "O link do perfil do restaurante foi copiado para a área de transferência.",
      });
    }
  };

  return (
    <div className="relative">
      {/* Header element containing the cover image and restaurant branding */}
      {/* Adicionado mb-0 e p-0 para remover margem inferior e preenchimento do contêiner do cabeçalho */}
      <div className="w-full h-48 bg-gray-200 relative mb-0 p-0">
        <img
          src={restaurant.cover_image_url || '/placeholder-cover.jpg'}
          alt="Capa do Restaurante"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 to-transparent flex items-end p-4">
          <div className="flex items-center space-x-4">
            <Avatar className="w-20 h-20 border-4 border-white shadow-lg">
              <AvatarImage src={restaurant.image_url || '/placeholder-restaurant.jpg'} alt={restaurant.name} />
              <AvatarFallback>{restaurant.name.substring(0, 2)}</AvatarFallback>
            </Avatar>
            <div>
              <h1 className="text-3xl font-bold text-white drop-shadow-md">{restaurant.name}</h1>
              <p className="text-white text-sm">{restaurant.category}</p>
            </div>
          </div>
        </div>
        <div className="absolute top-4 right-4 flex space-x-2">
          <Button variant="secondary" size="icon" onClick={handleFavoriteToggle}>
            <Heart className={cn("h-5 w-5", { "fill-red-500 text-red-500": isFavorite })} />
          </Button>
          <Button variant="secondary" size="icon" onClick={handleShare}>
            <Share2 className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Main content container */}
      <div className={cn("max-w-md mx-auto", {
        "pt-24": currentPlan !== 'premium', // Adiciona padding-top apenas para perfis não-premium
        "pt-0": currentPlan === 'premium' // Sem padding-top para premium, pois a imagem de capa já está acima
      })}>
        <div className="p-4 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Sobre</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-gray-700">{restaurant.description}</p>
              <div className="flex items-center text-gray-600">
                <MapPin className="h-4 w-4 mr-2" />
                <span>{restaurant.address}, {restaurant.number} - {restaurant.neighborhood}, {restaurant.city} - {restaurant.state}</span>
              </div>
              {restaurant.phone && (
                <div className="flex items-center text-gray-600">
                  <Phone className="h-4 w-4 mr-2" />
                  <a href={`tel:${restaurant.phone}`} className="hover:underline">{restaurant.phone}</a>
                </div>
              )}
              {restaurant.email && (
                <div className="flex items-center text-gray-600">
                  <Globe className="h-4 w-4 mr-2" />
                  <a href={`mailto:${restaurant.email}`} className="hover:underline">{restaurant.email}</a>
                </div>
              )}
              {restaurant.whatsapp_url && (
                <div className="flex items-center text-gray-600">
                  <img src="/whatsapp-icon.png" alt="WhatsApp" className="h-4 w-4 mr-2" />
                  <a href={restaurant.whatsapp_url} target="_blank" rel="noopener noreferrer" className="hover:underline">WhatsApp</a>
                </div>
              )}
              {restaurant.ifood_url && (
                <div className="flex items-center text-gray-600">
                  <img src="/ifood-icon.png" alt="iFood" className="h-4 w-4 mr-2" />
                  <a href={restaurant.ifood_url} target="_blank" rel="noopener noreferrer" className="hover:underline">iFood</a>
                </div>
              )}
              {restaurant.external_url && (
                <div className="flex items-center text-gray-600">
                  <Globe className="h-4 w-4 mr-2" />
                  <a href={restaurant.external_url} target="_blank" rel="noopener noreferrer" className="hover:underline">{restaurant.other_url_label || "Website"}</a>
                </div>
              )}
              {restaurant.social_networks && restaurant.social_networks.length > 0 && (
                <div className="flex items-center space-x-2 text-gray-600">
                  {restaurant.social_networks.map((social, index) => (
                    <a key={index} href={social.url} target="_blank" rel="noopener noreferrer" className="hover:text-gray-900">
                      {social.platform === 'instagram' && <Instagram className="h-5 w-5" />}
                      {social.platform === 'facebook' && <Facebook className="h-5 w-5" />}
                      {social.platform === 'twitter' && <Twitter className="h-5 w-5" />}
                      {/* Add more social icons as needed */}
                    </a>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Horário de Funcionamento</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="text-gray-700 whitespace-pre-wrap">{formatOpeningHours(restaurant.opening_hours)}</pre>
            </CardContent>
          </Card>

          {restaurant.payment_methods && restaurant.payment_methods.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Formas de Pagamento</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-wrap gap-2">
                {restaurant.payment_methods.map((method, index) => (
                  <Badge key={index} variant="secondary">{method}</Badge>
                ))}
              </CardContent>
            </Card>
          )}

          {gallery.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Galeria</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                {gallery.map((item) => (
                  <Dialog key={item.id}>
                    <DialogTrigger asChild>
                      <img
                        src={item.image_url}
                        alt={item.caption || "Imagem da galeria"}
                        className="w-full h-24 object-cover rounded-md cursor-pointer hover:opacity-90 transition-opacity"
                      />
                    </DialogTrigger>
                    <DialogContent className="sm:max-w-[425px]">
                      <DialogHeader>
                        <DialogTitle>{item.caption || "Imagem da Galeria"}</DialogTitle>
                        <DialogDescription>
                          Visualização em tamanho maior da imagem.
                        </DialogDescription>
                      </DialogHeader>
                      <img src={item.image_url} alt={item.caption || "Imagem da galeria"} className="w-full h-auto object-contain" />
                    </DialogContent>
                  </Dialog>
                ))}
              </CardContent>
            </Card>
          )}

          <Tabs defaultValue={menuCategories[0]?.id || "general"} className="w-full">
            <Card>
              <CardHeader>
                <CardTitle>Cardápio</CardTitle>
              </CardHeader>
              <CardContent>
                {menuCategories.length > 0 ? (
                  <>
                    <TabsList className="grid w-full grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 h-auto">
                      {menuCategories.map((category) => (
                        <TabsTrigger key={category.id} value={category.id} className="whitespace-normal break-words h-auto py-2">
                          {category.name}
                        </TabsTrigger>
                      ))}
                    </TabsList>
                    {menuCategories.map((category) => (
                      <TabsContent key={category.id} value={category.id} className="mt-4">
                        <h3 className="text-xl font-semibold mb-4">{category.name}</h3>
                        <div className="space-y-4">
                          {category.menu_items.length > 0 ? (
                            category.menu_items.map((item) => (
                              <div key={item.id} className="flex items-center space-x-4 p-2 border rounded-md">
                                {item.image_url && (
                                  <img src={item.image_url} alt={item.name} className="w-16 h-16 object-cover rounded-md" />
                                )}
                                <div className="flex-grow">
                                  <h4 className="font-medium">{item.name}</h4>
                                  <p className="text-sm text-gray-600">{item.description}</p>
                                </div>
                                <p className="font-semibold text-lg">R$ {item.price.toFixed(2)}</p>
                              </div>
                            ))
                          ) : (
                            <p className="text-gray-500">Nenhum item nesta categoria.</p>
                          )}
                        </div>
                      </TabsContent>
                    ))}
                  </>
                ) : (
                  <p className="text-gray-500">Nenhuma categoria de cardápio disponível.</p>
                )}
              </CardContent>
            </Card>
          </Tabs>
        </div>
      </div>
    </div>
  );
};

export default RestaurantProfilePublic;