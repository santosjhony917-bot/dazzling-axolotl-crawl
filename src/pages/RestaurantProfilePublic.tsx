"use client";

import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { RestaurantProfileHeader } from '@/components/RestaurantProfileHeader';
import { RestaurantGallery } from '@/components/RestaurantGallery';
import { MenuCategoryList } from '@/components/MenuCategoryList';
import { MapPin, Phone, Mail, Globe, Whatsapp, Instagram, Facebook, Twitter, Link as LinkIcon, Clock, DollarSign, Utensils, Star, Heart, Share2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/hooks/useAuth';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface RestaurantProfilePublicProps {
  initialRestaurantId?: string;
  simulatedPlan?: 'free' | 'basic' | 'premium';
  isCompact?: boolean;
}

const RestaurantProfilePublic: React.FC<RestaurantProfilePublicProps> = ({ initialRestaurantId, simulatedPlan, isCompact }) => {
  const { id } = useParams();
  const restaurantId = id || initialRestaurantId; // Use initialRestaurantId if id from params is not available
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [isOwner, setIsOwner] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [isGalleryOpen, setIsGalleryOpen] = useState(false);
  const [isMenuCategoryModalOpen, setIsMenuCategoryModalOpen] = useState(false);
  const [currentCategory, setCurrentCategory] = useState<any>(null);
  const [isMenuItemModalOpen, setIsMenuItemModalOpen] = useState(false);
  const [currentMenuItem, setCurrentMenuItem] = useState<any>(null);
  const [isImageUploadModalOpen, setIsImageUploadModalOpen] = useState(false);
  const [imageUploadType, setImageUploadType] = useState('');
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [isFollowed, setIsFollowed] = useState(false);
  const [followersCount, setFollowersCount] = useState(0);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);

  const { data: restaurant, isLoading, error } = useQuery({
    queryKey: ['restaurant', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return null;
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
      if (error) throw error;
      return data;
    },
    enabled: !!restaurantId,
  });

  const { data: userFavorite, refetch: refetchUserFavorite } = useQuery({
    queryKey: ['userFavorite', user?.id, restaurantId],
    queryFn: async () => {
      if (!user?.id || !restaurantId) return null;
      const { data, error } = await supabase
        .from('user_favorites')
        .select('*')
        .eq('user_id', user.id)
        .eq('restaurant_id', restaurantId)
        .single();
      if (error && error.code !== 'PGRST116') throw error; // Ignore "no rows found" error
      return data;
    },
    enabled: !!user?.id && !!restaurantId,
  });

  useEffect(() => {
    if (userFavorite) {
      setIsFollowed(true);
    } else {
      setIsFollowed(false);
    }
  }, [userFavorite]);

  const { data: initialFollowersCount, refetch: refetchFollowersCount } = useQuery({
    queryKey: ['followersCount', restaurantId],
    queryFn: async () => {
      if (!restaurantId) return 0;
      const { data, error } = await supabase.rpc('count_restaurant_followers', { p_restaurant_id: restaurantId });
      if (error) throw error;
      return data;
    },
    enabled: !!restaurantId,
  });

  useEffect(() => {
    if (initialFollowersCount !== undefined) {
      setFollowersCount(initialFollowersCount + (restaurant?.followers_override || 0));
    }
  }, [initialFollowersCount, restaurant?.followers_override]);

  useEffect(() => {
    if (restaurant && user) {
      setIsOwner(restaurant.user_id === user.id);
    }
  }, [restaurant, user]);

  const updateRestaurantMutation = useMutation({
    mutationFn: async (updates: Record<string, any>) => {
      const { data, error } = await supabase
        .from('restaurants')
        .update(updates)
        .eq('id', restaurantId)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurant', restaurantId] });
      toast.success('Restaurante atualizado com sucesso!');
      setIsEditing(false);
    },
    onError: (err) => {
      toast.error('Erro ao atualizar restaurante: ' + err.message);
    },
  });

  const addFavoriteMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !restaurantId) throw new Error('User not logged in or restaurant ID missing');
      const { data, error } = await supabase
        .from('user_favorites')
        .insert({ user_id: user.id, restaurant_id: restaurantId })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      refetchUserFavorite();
      refetchFollowersCount();
      toast.success('Restaurante adicionado aos favoritos!');
    },
    onError: (err) => {
      toast.error('Erro ao adicionar aos favoritos: ' + err.message);
    },
  });

  const removeFavoriteMutation = useMutation({
    mutationFn: async () => {
      if (!user?.id || !restaurantId) throw new Error('User not logged in or restaurant ID missing');
      const { error } = await supabase
        .from('user_favorites')
        .delete()
        .eq('user_id', user.id)
        .eq('restaurant_id', restaurantId);
      if (error) throw error;
    },
    onSuccess: () => {
      refetchUserFavorite();
      refetchFollowersCount();
      toast.success('Restaurante removido dos favoritos!');
    },
    onError: (err) => {
      toast.error('Erro ao remover dos favoritos: ' + err.message);
    },
  });

  const handleFollowToggle = () => {
    if (!user) {
      toast.info('Faça login para adicionar aos favoritos.');
      navigate('/login');
      return;
    }
    if (isFollowed) {
      removeFavoriteMutation.mutate();
    } else {
      addFavoriteMutation.mutate();
    }
  };

  const handleEdit = () => {
    setIsEditing(true);
  };

  const handleSave = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const updates = {
      name: String(formData.get('name')),
      description: String(formData.get('description')),
      phone: String(formData.get('phone')),
      email: String(formData.get('email')),
      whatsapp_url: String(formData.get('whatsapp_url')),
      ifood_url: String(formData.get('ifood_url')),
      other_url: String(formData.get('other_url')),
      other_url_label: String(formData.get('other_url_label')),
      address: String(formData.get('address')),
      number: String(formData.get('number')),
      neighborhood: String(formData.get('neighborhood')),
      city: String(formData.get('city')),
      state: String(formData.get('state')),
      cep: String(formData.get('cep')),
      category: String(formData.get('category')),
      external_url: String(formData.get('external_url')),
    };
    updateRestaurantMutation.mutate(updates);
  };

  const handleEditCoverImage = () => {
    setImageUploadType('cover_image_url');
    setIsImageUploadModalOpen(true);
  };

  const handleEditProfileImage = () => {
    setImageUploadType('image_url');
    setIsImageUploadModalOpen(true);
  };

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImageFile(e.target.files[0]);
    }
  };

  const uploadImageMutation = useMutation({
    mutationFn: async () => {
      if (!imageFile || !restaurantId || !imageUploadType) throw new Error('No image file, restaurant ID, or upload type specified.');

      const fileExt = imageFile.name.split('.').pop();
      const filePath = `${restaurantId}/${imageUploadType}-${Math.random()}.${fileExt}`;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('restaurant-images')
        .upload(filePath, imageFile);

      if (uploadError) throw uploadError;

      const { data: publicUrlData } = supabase.storage
        .from('restaurant-images')
        .getPublicUrl(filePath);

      if (!publicUrlData || !publicUrlData.publicUrl) throw new Error('Could not get public URL for uploaded image.');

      const updates = { [imageUploadType]: publicUrlData.publicUrl };
      const { data, error } = await supabase
        .from('restaurants')
        .update(updates)
        .eq('id', restaurantId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['restaurant', restaurantId] });
      toast.success('Imagem atualizada com sucesso!');
      setIsImageUploadModalOpen(false);
      setImageFile(null);
    },
    onError: (err) => {
      toast.error('Erro ao fazer upload da imagem: ' + err.message);
    },
  });

  const handleImageUploadSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    uploadImageMutation.mutate();
  };

  const handleAddCategory = () => {
    setCurrentCategory(null);
    setIsMenuCategoryModalOpen(true);
  };

  const handleEditCategory = (category: any) => {
    setCurrentCategory(category);
    setIsMenuCategoryModalOpen(true);
  };

  const handleAddMenuItem = (categoryId: string) => {
    setCurrentMenuItem({ category_id: categoryId });
    setIsMenuItemModalOpen(true);
  };

  const handleEditMenuItem = (item: any) => {
    setCurrentMenuItem(item);
    setIsMenuItemModalOpen(true);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: restaurant?.name || 'Restaurante',
        text: `Confira o restaurante ${restaurant?.name || ''} no Food Explorer!`,
        url: window.location.href,
      })
        .then(() => toast.success('Link compartilhado com sucesso!'))
        .catch((error) => toast.error('Erro ao compartilhar: ' + error.message));
    } else {
      setIsShareModalOpen(true);
    }
  };

  const handleCopyLink = () => {
    navigator.clipboard.writeText(window.location.href);
    toast.success('Link copiado para a área de transferência!');
    setIsShareModalOpen(false);
  };

  if (isLoading) {
    return <div className="text-center py-8">Carregando perfil do restaurante...</div>;
  }

  if (error) {
    return <div className="text-center py-8 text-red-500">Erro ao carregar perfil: {error.message}</div>;
  }

  if (!restaurant) {
    return <div className="text-center py-8">Restaurante não encontrado.</div>;
  }

  const currentPlan = simulatedPlan || restaurant.plan;

  const formatOpeningHours = (hours: Record<string, Array<{ open: string; close: string }>>) => {
    if (!hours) return 'Não informado';
    const daysOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const formatted = daysOrder.map(day => {
      const dayHours = hours[day];
      if (!dayHours || dayHours.length === 0) {
        return `${day.charAt(0).toUpperCase() + day.slice(1)}: Fechado`;
      }
      return `${day.charAt(0).toUpperCase() + day.slice(1)}: ${dayHours.map(h => `${h.open} - ${h.close}`).join(', ')}`;
    });
    return formatted.join('\n');
  };

  const getSocialIcon = (platform: string) => {
    switch (platform) {
      case 'instagram': return <Instagram size={20} />;
      case 'facebook': return <Facebook size={20} />;
      case 'twitter': return <Twitter size={20} />;
      case 'whatsapp': return <Whatsapp size={20} />;
      default: return <LinkIcon size={20} />;
    }
  };

  return (
    <div className={cn("min-h-screen bg-gray-50", { "max-w-md mx-auto border shadow-lg": isCompact })}>
      {/* Cover Image for Premium */}
      {currentPlan === 'premium' && (
        <RestaurantProfileHeader
          restaurant={restaurant}
          isOwner={isOwner}
          onEdit={handleEditCoverImage}
        />
      )}

      {/* Main content container */}
      <div className={cn("max-w-md mx-auto relative z-10 bg-white shadow-lg rounded-lg", {
        "pt-24": currentPlan !== 'premium', // Adiciona padding-top apenas para perfis não-premium
        "pt-0 mt-[-450px]": currentPlan === 'premium' // Sem padding-top para premium, e margem negativa para sobrepor
      })}>
        {/* Profile Image and Basic Info */}
        <div className={cn("flex items-center p-4", {
          "flex-col text-center -mt-20": currentPlan === 'premium', // Ajusta posição da imagem de perfil para premium
          "space-x-4": currentPlan !== 'premium'
        })}>
          <div className="relative">
            <Avatar className={cn("w-24 h-24 border-4 border-white", {
              "w-32 h-32": currentPlan === 'premium'
            })}>
              <AvatarImage src={restaurant.image_url || '/placeholder.svg'} alt={restaurant.name} />
              <AvatarFallback>{restaurant.name.charAt(0)}</AvatarFallback>
            </Avatar>
            {isOwner && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute bottom-0 right-0 bg-white rounded-full shadow"
                onClick={handleEditProfileImage}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-pencil"><path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>
              </Button>
            )}
          </div>

          <div className={cn("flex-1", { "mt-4": currentPlan === 'premium' })}>
            <h1 className={cn("text-3xl font-bold", { "text-4xl": currentPlan === 'premium' })}>{restaurant.name}</h1>
            {restaurant.category && (
              <p className="text-gray-600 flex items-center justify-center gap-1 mt-1">
                <Utensils size={16} /> {restaurant.category}
              </p>
            )}
            <div className="flex items-center justify-center gap-2 mt-2">
              <Button
                variant={isFollowed ? 'default' : 'outline'}
                onClick={handleFollowToggle}
                className="flex items-center gap-2"
              >
                <Heart size={18} fill={isFollowed ? 'white' : 'none'} />
                {isFollowed ? 'Seguindo' : 'Seguir'}
              </Button>
              <Button variant="outline" size="icon" onClick={handleShare}>
                <Share2 size={18} />
              </Button>
            </div>
            <p className="text-gray-500 text-sm mt-1">{followersCount} seguidores</p>
          </div>
        </div>

        {isEditing ? (
          <form onSubmit={handleSave} className="p-4 space-y-4">
            <Input name="name" defaultValue={restaurant.name} placeholder="Nome do Restaurante" />
            <Textarea name="description" defaultValue={restaurant.description || ''} placeholder="Descrição" />
            <Input name="phone" defaultValue={restaurant.phone || ''} placeholder="Telefone" />
            <Input name="email" defaultValue={restaurant.email || ''} placeholder="Email" />
            <Input name="whatsapp_url" defaultValue={restaurant.whatsapp_url || ''} placeholder="Link do WhatsApp" />
            <Input name="ifood_url" defaultValue={restaurant.ifood_url || ''} placeholder="Link do iFood" />
            <Input name="other_url" defaultValue={restaurant.other_url || ''} placeholder="Outro Link" />
            <Input name="other_url_label" defaultValue={restaurant.other_url_label || ''} placeholder="Rótulo do Outro Link" />
            <Input name="address" defaultValue={restaurant.address || ''} placeholder="Endereço" />
            <Input name="number" defaultValue={restaurant.number || ''} placeholder="Número" />
            <Input name="neighborhood" defaultValue={restaurant.neighborhood || ''} placeholder="Bairro" />
            <Input name="city" defaultValue={restaurant.city || ''} placeholder="Cidade" />
            <Input name="state" defaultValue={restaurant.state || ''} placeholder="Estado" />
            <Input name="cep" defaultValue={restaurant.cep || ''} placeholder="CEP" />
            <Input name="category" defaultValue={restaurant.category || ''} placeholder="Categoria" />
            <Input name="external_url" defaultValue={restaurant.external_url || ''} placeholder="URL Externa" />
            <Button type="submit">Salvar</Button>
            <Button variant="outline" onClick={() => setIsEditing(false)} className="ml-2">Cancelar</Button>
          </form>
        ) : (
          <div className="p-4 space-y-4">
            {restaurant.description && <p className="text-gray-700 text-center">{restaurant.description}</p>}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {restaurant.address && (
                <div className="flex items-center gap-2 text-gray-700">
                  <MapPin size={20} />
                  <span>{restaurant.address}, {restaurant.number} - {restaurant.neighborhood}, {restaurant.city} - {restaurant.state}, {restaurant.cep}</span>
                </div>
              )}
              {restaurant.phone && (
                <a href={`tel:${restaurant.phone}`} className="flex items-center gap-2 text-blue-600 hover:underline">
                  <Phone size={20} />
                  <span>{restaurant.phone}</span>
                </a>
              )}
              {restaurant.email && (
                <a href={`mailto:${restaurant.email}`} className="flex items-center gap-2 text-blue-600 hover:underline">
                  <Mail size={20} />
                  <span>{restaurant.email}</span>
                </a>
              )}
              {restaurant.whatsapp_url && (
                <a href={restaurant.whatsapp_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-green-600 hover:underline">
                  <Whatsapp size={20} />
                  <span>WhatsApp</span>
                </a>
              )}
              {restaurant.ifood_url && (
                <a href={restaurant.ifood_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-red-600 hover:underline">
                  <img src="/ifood-icon.png" alt="iFood" className="w-5 h-5" />
                  <span>iFood</span>
                </a>
              )}
              {restaurant.other_url && (
                <a href={restaurant.other_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-600 hover:underline">
                  <LinkIcon size={20} />
                  <span>{restaurant.other_url_label || 'Website'}</span>
                </a>
              )}
              {restaurant.external_url && (
                <a href={restaurant.external_url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 text-blue-600 hover:underline">
                  <Globe size={20} />
                  <span>Visitar Site</span>
                </a>
              )}
            </div>

            {restaurant.opening_hours && (
              <div className="space-y-2">
                <h2 className="text-xl font-semibold flex items-center gap-2"><Clock size={20} /> Horário de Funcionamento</h2>
                <pre className="bg-gray-100 p-3 rounded-md text-sm whitespace-pre-wrap">{formatOpeningHours(restaurant.opening_hours)}</pre>
              </div>
            )}

            {restaurant.payment_methods && restaurant.payment_methods.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-xl font-semibold flex items-center gap-2"><DollarSign size={20} /> Formas de Pagamento</h2>
                <div className="flex flex-wrap gap-2">
                  {restaurant.payment_methods.map((method: string, index: number) => (
                    <span key={index} className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm">
                      {method}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {restaurant.social_networks && restaurant.social_networks.length > 0 && (
              <div className="space-y-2">
                <h2 className="text-xl font-semibold flex items-center gap-2"><Star size={20} /> Redes Sociais</h2>
                <div className="flex flex-wrap gap-3">
                  {restaurant.social_networks.map((social: { platform: string; url: string }, index: number) => (
                    <a key={index} href={social.url} target="_blank" rel="noopener noreferrer" className="text-gray-700 hover:text-blue-600 flex items-center gap-1">
                      {getSocialIcon(social.platform)}
                      <span className="capitalize">{social.platform}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {isOwner && (
              <div className="flex justify-end mt-4">
                <Button onClick={handleEdit}>Editar Perfil</Button>
              </div>
            )}
          </div>
        )}

        <Separator className="my-4" />

        {/* Gallery Section */}
        {currentPlan === 'premium' && restaurant.restaurant_gallery && restaurant.restaurant_gallery.length > 0 && (
          <div className="p-4">
            <h2 className="text-2xl font-bold mb-4">Galeria</h2>
            <RestaurantGallery
              images={restaurant.restaurant_gallery}
              restaurantId={restaurant.id}
              isOwner={isOwner}
              onOpen={() => setIsGalleryOpen(true)}
            />
          </div>
        )}

        <Separator className="my-4" />

        {/* Menu Section */}
        <div className="p-4">
          <h2 className="text-2xl font-bold mb-4">Cardápio</h2>
          {isOwner && (
            <Button onClick={handleAddCategory} className="mb-4">Adicionar Categoria</Button>
          )}
          {restaurant.menu_categories && restaurant.menu_categories.length > 0 ? (
            <MenuCategoryList
              categories={restaurant.menu_categories}
              restaurantId={restaurant.id}
              isOwner={isOwner}
              onEditCategory={handleEditCategory}
              onAddMenuItem={handleAddMenuItem}
              onEditMenuItem={handleEditMenuItem}
            />
          ) : (
            <p className="text-gray-600">Nenhuma categoria de cardápio adicionada ainda.</p>
          )}
        </div>
      </div>

      {/* Image Upload Modal */}
      <Dialog open={isImageUploadModalOpen} onOpenChange={setIsImageUploadModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Upload de Imagem</DialogTitle>
            <DialogDescription>
              Selecione uma imagem para {imageUploadType === 'cover_image_url' ? 'a capa' : 'o perfil'} do restaurante.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleImageUploadSubmit} className="space-y-4">
            <Input type="file" accept="image/*" onChange={handleImageFileChange} required />
            <DialogFooter>
              <Button type="submit" disabled={!imageFile || uploadImageMutation.isPending}>
                {uploadImageMutation.isPending ? 'Enviando...' : 'Upload'}
              </Button>
              <Button type="button" variant="outline" onClick={() => setIsImageUploadModalOpen(false)}>
                Cancelar
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Menu Category Modal */}
      <Dialog open={isMenuCategoryModalOpen} onOpenChange={setIsMenuCategoryModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{currentCategory ? 'Editar Categoria' : 'Adicionar Categoria'}</DialogTitle>
          </DialogHeader>
          <MenuCategoryForm
            restaurantId={restaurant.id}
            category={currentCategory}
            onSuccess={() => {
              setIsMenuCategoryModalOpen(false);
              queryClient.invalidateQueries({ queryKey: ['restaurant', restaurantId] });
            }}
            onCancel={() => setIsMenuCategoryModalOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Menu Item Modal */}
      <Dialog open={isMenuItemModalOpen} onOpenChange={setIsMenuItemModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{currentMenuItem?.id ? 'Editar Item do Cardápio' : 'Adicionar Item ao Cardápio'}</DialogTitle>
          </DialogHeader>
          <MenuItemForm
            restaurantId={restaurant.id}
            menuItem={currentMenuItem}
            onSuccess={() => {
              setIsMenuItemModalOpen(false);
              queryClient.invalidateQueries({ queryKey: ['restaurant', restaurantId] });
            }}
            onCancel={() => setIsMenuItemModalOpen(false)}
          />
        </DialogContent>
      </Dialog>

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
            <Button onClick={handleCopyLink}>Copiar</Button>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsShareModalOpen(false)}>Fechar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

// Componente de formulário para categoria de menu
const MenuCategoryForm = ({ restaurantId, category, onSuccess, onCancel }: { restaurantId: string; category: any; onSuccess: () => void; onCancel: () => void }) => {
  const queryClient = useQueryClient();
  const { id: restaurantProfileId } = useParams();

  const createCategoryMutation = useMutation({
    mutationFn: async (newCategory: { restaurant_id: string; name: string; is_active: boolean; is_popular: boolean }) => {
      const { data, error } = await supabase
        .from('menu_categories')
        .insert(newCategory)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Categoria adicionada com sucesso!');
      onSuccess();
    },
    onError: (err) => {
      toast.error('Erro ao adicionar categoria: ' + err.message);
    },
  });

  const updateCategoryMutation = useMutation({
    mutationFn: async (updatedCategory: { name: string; is_active: boolean; is_popular: boolean }) => {
      const { data, error } = await supabase
        .from('menu_categories')
        .update(updatedCategory)
        .eq('id', category.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Categoria atualizada com sucesso!');
      onSuccess();
    },
    onError: (err) => {
      toast.error('Erro ao atualizar categoria: ' + err.message);
    },
  });

  const deleteCategoryMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('menu_categories')
        .delete()
        .eq('id', category.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Categoria excluída com sucesso!');
      onSuccess();
    },
    onError: (err) => {
      toast.error('Erro ao excluir categoria: ' + err.message);
    },
  });

  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = String(formData.get('name'));
    const is_active = formData.get('is_active') === 'on';
    const is_popular = formData.get('is_popular') === 'on';

    if (category) {
      updateCategoryMutation.mutate({ name, is_active, is_popular });
    } else {
      createCategoryMutation.mutate({ restaurant_id: restaurantId, name, is_active, is_popular });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4">
      <div className="grid gap-2">
        <Label htmlFor="name">Nome da Categoria</Label>
        <Input id="name" name="name" defaultValue={category?.name || ''} required />
      </div>
      <div className="flex items-center space-x-2">
        <Switch id="is_active" name="is_active" defaultChecked={category?.is_active ?? true} />
        <Label htmlFor="is_active">Ativa</Label>
      </div>
      <div className="flex items-center space-x-2">
        <Switch id="is_popular" name="is_popular" defaultChecked={category?.is_popular ?? false} />
        <Label htmlFor="is_popular">Popular</Label>
      </div>
      <div className="flex justify-end gap-2">
        {category && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="destructive">Excluir</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita. Isso excluirá permanentemente esta categoria e todos os itens de menu associados.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => deleteCategoryMutation.mutate()} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={createCategoryMutation.isPending || updateCategoryMutation.isPending}>
          {category ? 'Salvar Alterações' : 'Adicionar Categoria'}
        </Button>
      </div>
    </form>
  );
};

// Componente de formulário para item de menu
const MenuItemForm = ({ restaurantId, menuItem, onSuccess, onCancel }: { restaurantId: string; menuItem: any; onSuccess: () => void; onCancel: () => void }) => {
  const queryClient = useQueryClient();
  const { id: restaurantProfileId } = useParams();
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState(menuItem?.image_url || '');

  const { data: categories } = useQuery({
    queryKey: ['menuCategories', restaurantId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('menu_categories')
        .select('id, name')
        .eq('restaurant_id', restaurantId)
        .order('order_index', { ascending: true });
      if (error) throw error;
      return data;
    },
    enabled: !!restaurantId,
  });

  const createMenuItemMutation = useMutation({
    mutationFn: async (newItem: { name: string; description: string; price: number; category_id: string; is_active: boolean; image_url: string | null }) => {
      const { data, error } = await supabase
        .from('menu_items')
        .insert(newItem)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Item do cardápio adicionado com sucesso!');
      onSuccess();
    },
    onError: (err) => {
      toast.error('Erro ao adicionar item do cardápio: ' + err.message);
    },
  });

  const updateMenuItemMutation = useMutation({
    mutationFn: async (updatedItem: { name: string; description: string; price: number; category_id: string; is_active: boolean; image_url: string | null }) => {
      const { data, error } = await supabase
        .from('menu_items')
        .update(updatedItem)
        .eq('id', menuItem.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      toast.success('Item do cardápio atualizado com sucesso!');
      onSuccess();
    },
    onError: (err) => {
      toast.error('Erro ao atualizar item do cardápio: ' + err.message);
    },
  });

  const deleteMenuItemMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase
        .from('menu_items')
        .delete()
        .eq('id', menuItem.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Item do cardápio excluído com sucesso!');
      onSuccess();
    },
    onError: (err) => {
      toast.error('Erro ao excluir item do cardápio: ' + err.message);
    },
  });

  const uploadImageToStorage = async (file: File) => {
    if (!file) return null;

    const fileExt = file.name.split('.').pop();
    const filePath = `${restaurantId}/menu-items/${menuItem?.id || 'new'}-${Math.random()}.${fileExt}`;

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('restaurant-images')
      .upload(filePath, file);

    if (uploadError) throw uploadError;

    const { data: publicUrlData } = supabase.storage
      .from('restaurant-images')
      .getPublicUrl(filePath);

    return publicUrlData.publicUrl;
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const name = String(formData.get('name'));
    const description = String(formData.get('description'));
    const price = parseFloat(String(formData.get('price')));
    const category_id = String(formData.get('category_id'));
    const is_active = formData.get('is_active') === 'on';

    let newImageUrl = imageUrl;
    if (imageFile) {
      try {
        newImageUrl = await uploadImageToStorage(imageFile);
      } catch (error: any) {
        toast.error('Erro ao fazer upload da imagem: ' + error.message);
        return;
      }
    }

    const itemData = {
      name,
      description,
      price,
      category_id,
      is_active,
      image_url: newImageUrl,
    };

    if (menuItem?.id) {
      updateMenuItemMutation.mutate(itemData);
    } else {
      createMenuItemMutation.mutate(itemData);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4 p-4">
      <div className="grid gap-2">
        <Label htmlFor="name">Nome do Item</Label>
        <Input id="name" name="name" defaultValue={menuItem?.name || ''} required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="description">Descrição</Label>
        <Textarea id="description" name="description" defaultValue={menuItem?.description || ''} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="price">Preço</Label>
        <Input id="price" name="price" type="number" step="0.01" defaultValue={menuItem?.price || ''} required />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="category_id">Categoria</Label>
        <Select name="category_id" defaultValue={menuItem?.category_id || ''} required>
          <SelectTrigger>
            <SelectValue placeholder="Selecione uma categoria" />
          </SelectTrigger>
          <SelectContent>
            {categories?.map((cat) => (
              <SelectItem key={cat.id} value={cat.id}>{cat.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="image">Imagem do Item</Label>
        {imageUrl && (
          <div className="relative w-24 h-24 mb-2">
            <img src={imageUrl} alt="Preview" className="w-full h-full object-cover rounded-md" />
            <Button
              type="button"
              variant="destructive"
              size="icon"
              className="absolute -top-2 -right-2 h-6 w-6"
              onClick={() => {
                setImageUrl('');
                setImageFile(null);
              }}
            >
              X
            </Button>
          </div>
        )}
        <Input id="image" name="image" type="file" accept="image/*" onChange={(e) => setImageFile(e.target.files[0])} />
      </div>
      <div className="flex items-center space-x-2">
        <Switch id="is_active" name="is_active" defaultChecked={menuItem?.is_active ?? true} />
        <Label htmlFor="is_active">Ativo</Label>
      </div>
      <div className="flex justify-end gap-2">
        {menuItem?.id && (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button type="button" variant="destructive">Excluir</Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Tem certeza?</AlertDialogTitle>
                <AlertDialogDescription>
                  Esta ação não pode ser desfeita. Isso excluirá permanentemente este item do cardápio.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancelar</AlertDialogCancel>
                <AlertDialogAction onClick={() => deleteMenuItemMutation.mutate()} className="bg-red-600 hover:bg-red-700">Excluir</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        )}
        <Button type="button" variant="outline" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" disabled={createMenuItemMutation.isPending || updateMenuItemMutation.isPending}>
          {menuItem?.id ? 'Salvar Alterações' : 'Adicionar Item'}
        </Button>
      </div>
    </form>
  );
};

export default RestaurantProfilePublic;