"use client";

import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Utensils, MapPin, Phone, Mail, Clock, Image, Menu, BarChart3, Crown, ExternalLink, Instagram, Facebook, Globe, Loader2, Edit, CheckCircle, XCircle, Settings, MessageSquare } from 'lucide-react'; // Corrigido: importação de Settings e MessageSquare (substituindo Whatsapp)
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import RestaurantAreaPageLayout from '@/components/restaurant/RestaurantAreaPageLayout';
import { useAuth } from '@/context/AuthContext'; // Corrigido: importação de useAuth
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

interface Restaurant {
  id: string;
  name: string;
  description: string | null;
  image_url: string | null;
  cover_image_url: string | null;
  category: string | null;
  address: string | null;
  number: string | null;
  neighborhood: string | null;
  city: string | null;
  state: string | null;
  cep: string | null;
  phone: string | null;
  email: string | null;
  whatsapp_url: string | null;
  ifood_url: string | null;
  other_url: string | null;
  other_url_label: string | null;
  plan: 'free' | 'basic' | 'premium';
  opening_hours: any; // JSONB type
  payment_methods: any; // JSONB type
  social_networks: any; // JSONB type
  visit_status: 'Pendente' | 'Agendada' | 'Realizada' | 'Cancelada';
  visit_notes: string | null;
}

const RestaurantDashboardPage: React.FC = () => {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const { user } = useAuth();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editedRestaurant, setEditedRestaurant] = useState<Partial<Restaurant>>({});
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetchRestaurantDetails();
  }, [restaurantId]);

  const fetchRestaurantDetails = async () => {
    if (!restaurantId) return;
    setLoading(true);
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', restaurantId)
      .single();

    if (error) {
      console.error('Error fetching restaurant:', error.message);
      toast.error('Erro ao carregar detalhes do restaurante.');
    } else {
      setRestaurant(data);
      setEditedRestaurant(data);
    }
    setLoading(false);
  };

  const handleEditClick = () => {
    if (restaurant) {
      setEditedRestaurant(restaurant);
      setIsEditDialogOpen(true);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!restaurantId) return;

    setIsSaving(true);
    const { error } = await supabase
      .from('restaurants')
      .update(editedRestaurant)
      .eq('id', restaurantId);

    if (error) {
      console.error('Error updating restaurant:', error.message);
      toast.error('Erro ao salvar alterações.');
    } else {
      toast.success('Restaurante atualizado com sucesso!');
      setIsEditDialogOpen(false);
      fetchRestaurantDetails(); // Re-fetch to update UI
    }
    setIsSaving(false);
  };

  if (loading) {
    return (
      <RestaurantAreaPageLayout title="Carregando Restaurante" icon={Loader2}>
        <div className="flex justify-center items-center h-full">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </RestaurantAreaPageLayout>
    );
  }

  if (!restaurant) {
    return (
      <RestaurantAreaPageLayout title="Restaurante Não Encontrado" icon={Utensils}>
        <div className="flex flex-col items-center justify-center h-full text-gray-500">
          <Utensils className="h-16 w-16 mb-4" />
          <p className="text-xl">O restaurante que você procura não existe ou você não tem permissão para vê-lo.</p>
        </div>
      </RestaurantAreaPageLayout>
    );
  }

  const fullAddress = [restaurant.address, restaurant.number, restaurant.neighborhood, restaurant.city, restaurant.state, restaurant.cep]
    .filter(Boolean)
    .join(', ');

  const renderOpeningHours = () => {
    if (!restaurant.opening_hours || Object.keys(restaurant.opening_hours).length === 0) {
      return <p className="text-gray-600">Horário de funcionamento não informado.</p>;
    }
    const daysOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    return (
      <ul className="space-y-1">
        {daysOrder.map(dayKey => {
          const dayHours = restaurant.opening_hours[dayKey];
          const dayName = new Date(0, 0, daysOrder.indexOf(dayKey) + 1).toLocaleDateString('pt-BR', { weekday: 'long' });
          return (
            <li key={dayKey} className="flex justify-between text-gray-700">
              <span className="capitalize">{dayName}:</span>
              <span>{dayHours || 'Fechado'}</span>
            </li>
          );
        })}
      </ul>
    );
  };

  const renderPaymentMethods = () => {
    if (!restaurant.payment_methods || restaurant.payment_methods.length === 0) {
      return <p className="text-gray-600">Métodos de pagamento não informados.</p>;
    }
    return (
      <ul className="list-disc list-inside space-y-1">
        {restaurant.payment_methods.map((method: string, index: number) => (
          <li key={index}>{method}</li>
        ))}
      </ul>
    );
  };

  const renderSocialNetworks = () => {
    if (!restaurant.social_networks || restaurant.social_networks.length === 0) {
      return <p className="text-gray-600">Redes sociais não informadas.</p>;
    }
    return (
      <div className="flex flex-wrap gap-3">
        {restaurant.social_networks.map((social: { platform: string; url: string }, index: number) => (
          <a key={index} href={social.url} target="_blank" rel="noopener noreferrer" className="text-primary hover:text-primary-foreground">
            {social.platform === 'instagram' && <Instagram className="h-6 w-6" />}
            {social.platform === 'facebook' && <Facebook className="h-6 w-6" />}
            {social.platform === 'website' && <Globe className="h-6 w-6" />}
            {social.platform === 'whatsapp' && <MessageSquare className="h-6 w-6" />} {/* Usando MessageSquare para WhatsApp */}
            {/* Add more social icons as needed */}
          </a>
        ))}
      </div>
    );
  };

  return (
    <RestaurantAreaPageLayout
      title={restaurant.name}
      icon={Utensils}
    >
      <div className="space-y-8 p-4">
        {/* Cover Image and Basic Info */}
        <Card>
          <CardContent className="p-0">
            {restaurant.cover_image_url && (
              <AspectRatio ratio={16 / 5}>
                <img
                  src={restaurant.cover_image_url}
                  alt="Capa do Restaurante"
                  className="rounded-t-lg object-cover w-full h-full"
                />
              </AspectRatio>
            )}
            <div className="p-6 relative">
              {restaurant.image_url && (
                <img
                  src={restaurant.image_url}
                  alt="Logo do Restaurante"
                  className="w-24 h-24 rounded-full object-cover absolute -top-12 left-6 border-4 border-white shadow-md"
                />
              )}
              <div className="flex justify-end mb-4">
                <Button variant="outline" size="sm" onClick={handleEditClick}>
                  <Edit className="h-4 w-4 mr-2" /> Editar Informações
                </Button>
              </div>
              <div className="mt-8 sm:mt-0 sm:ml-32">
                <h1 className="text-3xl font-bold">{restaurant.name}</h1>
                <div className="flex items-center space-x-2 mt-2">
                  <Badge variant="secondary">{restaurant.category || 'Não Definido'}</Badge>
                  <Badge variant="outline">{restaurant.plan.toUpperCase()}</Badge>
                  {restaurant.visit_status === 'Realizada' && (
                    <Badge className="bg-green-500 text-white">
                      <CheckCircle className="h-3 w-3 mr-1" /> Visita Realizada
                    </Badge>
                  )}
                  {restaurant.visit_status === 'Pendente' && (
                    <Badge className="bg-yellow-500 text-white">
                      <Clock className="h-3 w-3 mr-1" /> Visita Pendente
                    </Badge>
                  )}
                  {restaurant.visit_status === 'Cancelada' && (
                    <Badge className="bg-red-500 text-white">
                      <XCircle className="h-3 w-3 mr-1" /> Visita Cancelada
                    </Badge>
                  )}
                </div>
                <p className="text-gray-700 mt-4">{restaurant.description || 'Nenhuma descrição fornecida.'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Contact and Location */}
        <Card>
          <CardHeader>
            <CardTitle>Contato e Localização</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {fullAddress && (
              <div className="flex items-center text-gray-700">
                <MapPin className="h-5 w-5 mr-2 text-primary" />
                <span>{fullAddress}</span>
              </div>
            )}
            {restaurant.phone && (
              <div className="flex items-center text-gray-700">
                <Phone className="h-5 w-5 mr-2 text-primary" />
                <span>{restaurant.phone}</span>
              </div>
            )}
            {restaurant.email && (
              <div className="flex items-center text-gray-700">
                <Mail className="h-5 w-5 mr-2 text-primary" />
                <span>{restaurant.email}</span>
              </div>
            )}
            {restaurant.whatsapp_url && (
              <a href={restaurant.whatsapp_url} target="_blank" rel="noopener noreferrer" className="flex items-center text-primary hover:underline">
                <MessageSquare className="h-5 w-5 mr-2" /> {/* Usando MessageSquare para WhatsApp */}
                <span>WhatsApp</span>
                <ExternalLink className="h-4 w-4 ml-1" />
              </a>
            )}
            {restaurant.ifood_url && (
              <a href={restaurant.ifood_url} target="_blank" rel="noopener noreferrer" className="flex items-center text-primary hover:underline">
                <Utensils className="h-5 w-5 mr-2" />
                <span>iFood</span>
                <ExternalLink className="h-4 w-4 ml-1" />
              </a>
            )}
            {restaurant.other_url && (
              <a href={restaurant.other_url} target="_blank" rel="noopener noreferrer" className="flex items-center text-primary hover:underline">
                <Globe className="h-5 w-5 mr-2" />
                <span>{restaurant.other_url_label || 'Website'}</span>
                <ExternalLink className="h-4 w-4 ml-1" />
              </a>
            )}
          </CardContent>
        </Card>

        {/* Operational Details */}
        <Card>
          <CardHeader>
            <CardTitle>Detalhes Operacionais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2 flex items-center"><Clock className="h-4 w-4 mr-2" /> Horário de Funcionamento</h3>
              {renderOpeningHours()}
            </div>
            <Separator />
            <div>
              <h3 className="font-semibold mb-2 flex items-center"><Utensils className="h-4 w-4 mr-2" /> Métodos de Pagamento</h3>
              {renderPaymentMethods()}
            </div>
            <Separator />
            <div>
              <h3 className="font-semibold mb-2 flex items-center"><Globe className="h-4 w-4 mr-2" /> Redes Sociais</h3>
              {renderSocialNetworks()}
            </div>
          </CardContent>
        </Card>

        {/* Quick Actions */}
        <Card>
          <CardHeader>
            <CardTitle>Ações Rápidas</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <Link to={`/restaurant-area/menu-management/${restaurantId}`}>
              <Button variant="outline" className="w-full h-auto py-4">
                <Menu className="h-5 w-5 mr-2" /> Gerenciar Cardápio
              </Button>
            </Link>
            <Link to={`/restaurant-area/gallery-management/${restaurantId}`}>
              <Button variant="outline" className="w-full h-auto py-4">
                <Image className="h-5 w-5 mr-2" /> Gerenciar Galeria
              </Button>
            </Link>
            <Link to={`/restaurant-area/metrics/${restaurantId}`}>
              <Button variant="outline" className="w-full h-auto py-4">
                <BarChart3 className="h-5 w-5 mr-2" /> Ver Métricas
              </Button>
            </Link>
            <Link to={`/restaurant-area/upgrade`}>
              <Button variant="outline" className="w-full h-auto py-4">
                <Crown className="h-5 w-5 mr-2" /> Fazer Upgrade
              </Button>
            </Link>
            <Link to={`/restaurant-area/profile-settings`}>
              <Button variant="outline" className="w-full h-auto py-4">
                <Settings className="h-5 w-5 mr-2" /> Configurações do Perfil
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>

      {/* Edit Restaurant Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Editar Restaurante</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSave} className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="name" className="text-right">Nome</Label>
              <Input id="name" value={editedRestaurant.name || ''} onChange={(e) => setEditedRestaurant({ ...editedRestaurant, name: e.target.value })} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="description" className="text-right">Descrição</Label>
              <Textarea id="description" value={editedRestaurant.description || ''} onChange={(e) => setEditedRestaurant({ ...editedRestaurant, description: e.target.value })} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="category" className="text-right">Categoria</Label>
              <Input id="category" value={editedRestaurant.category || ''} onChange={(e) => setEditedRestaurant({ ...editedRestaurant, category: e.target.value })} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="image_url" className="text-right">URL Logo</Label>
              <Input id="image_url" value={editedRestaurant.image_url || ''} onChange={(e) => setEditedRestaurant({ ...editedRestaurant, image_url: e.target.value })} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="cover_image_url" className="text-right">URL Capa</Label>
              <Input id="cover_image_url" value={editedRestaurant.cover_image_url || ''} onChange={(e) => setEditedRestaurant({ ...editedRestaurant, cover_image_url: e.target.value })} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="phone" className="text-right">Telefone</Label>
              <Input id="phone" value={editedRestaurant.phone || ''} onChange={(e) => setEditedRestaurant({ ...editedRestaurant, phone: e.target.value })} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="email" className="text-right">Email</Label>
              <Input id="email" value={editedRestaurant.email || ''} onChange={(e) => setEditedRestaurant({ ...editedRestaurant, email: e.target.value })} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="whatsapp_url" className="text-right">WhatsApp URL</Label>
              <Input id="whatsapp_url" value={editedRestaurant.whatsapp_url || ''} onChange={(e) => setEditedRestaurant({ ...editedRestaurant, whatsapp_url: e.target.value })} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="ifood_url" className="text-right">iFood URL</Label>
              <Input id="ifood_url" value={editedRestaurant.ifood_url || ''} onChange={(e) => setEditedRestaurant({ ...editedRestaurant, ifood_url: e.target.value })} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="other_url_label" className="text-right">Outro Link (Label)</Label>
              <Input id="other_url_label" value={editedRestaurant.other_url_label || ''} onChange={(e) => setEditedRestaurant({ ...editedRestaurant, other_url_label: e.target.value })} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="other_url" className="text-right">Outro Link (URL)</Label>
              <Input id="other_url" value={editedRestaurant.other_url || ''} onChange={(e) => setEditedRestaurant({ ...editedRestaurant, other_url: e.target.value })} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="address" className="text-right">Endereço</Label>
              <Input id="address" value={editedRestaurant.address || ''} onChange={(e) => setEditedRestaurant({ ...editedRestaurant, address: e.target.value })} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="number" className="text-right">Número</Label>
              <Input id="number" value={editedRestaurant.number || ''} onChange={(e) => setEditedRestaurant({ ...editedRestaurant, number: e.target.value })} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="neighborhood" className="text-right">Bairro</Label>
              <Input id="neighborhood" value={editedRestaurant.neighborhood || ''} onChange={(e) => setEditedRestaurant({ ...editedRestaurant, neighborhood: e.target.value })} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="city" className="text-right">Cidade</Label>
              <Input id="city" value={editedRestaurant.city || ''} onChange={(e) => setEditedRestaurant({ ...editedRestaurant, city: e.target.value })} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="state" className="text-right">Estado</Label>
              <Input id="state" value={editedRestaurant.state || ''} onChange={(e) => setEditedRestaurant({ ...editedRestaurant, state: e.target.value })} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="cep" className="text-right">CEP</Label>
              <Input id="cep" value={editedRestaurant.cep || ''} onChange={(e) => setEditedRestaurant({ ...editedRestaurant, cep: e.target.value })} className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="visit_status" className="text-right">Status da Visita</Label>
              <Select
                value={editedRestaurant.visit_status || 'Pendente'}
                onValueChange={(value) => setEditedRestaurant({ ...editedRestaurant, visit_status: value as 'Pendente' | 'Agendada' | 'Realizada' | 'Cancelada' })}
              >
                <SelectTrigger className="col-span-3">
                  <SelectValue placeholder="Selecione o status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Pendente">Pendente</SelectItem>
                  <SelectItem value="Agendada">Agendada</SelectItem>
                  <SelectItem value="Realizada">Realizada</SelectItem>
                  <SelectItem value="Cancelada">Cancelada</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="visit_notes" className="text-right">Notas da Visita</Label>
              <Textarea id="visit_notes" value={editedRestaurant.visit_notes || ''} onChange={(e) => setEditedRestaurant({ ...editedRestaurant, visit_notes: e.target.value })} className="col-span-3" />
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>Cancelar</Button>
              <Button type="submit" disabled={isSaving}>
                {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Salvar Alterações
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </RestaurantAreaPageLayout>
  );
};

export default RestaurantDashboardPage;