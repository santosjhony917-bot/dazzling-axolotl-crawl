import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Camera, Utensils, MapPin, Phone, Mail, Link as LinkIcon, Loader2, Check, X, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Separator } from '@/components/ui/separator';
import { createPageUrl } from '@/utils/url';
import { useAuthContext } from '@/context/AuthContext'; // Corrigido
import { showError, showSuccess } from '@/utils/toast';
import { supabase } from '@/integrations/supabase/client';
import { Restaurant } from '@/types/restaurant';
import MenuManagement from '@/pages/MenuManagement'; // Corrigido
import GalleryManagement from '@/pages/restaurant/GalleryManagement'; // Corrigido
import OpeningHoursManagement from './OpeningHoursManagement'; // Corrigido

// Tipagem para o estado de edição
interface RestaurantEditState {
  name: string;
  description: string;
  category: string;
  phone: string;
  email: string;
  whatsapp_url: string;
  ifood_url: string;
  other_url: string;
  external_url: string;
  address: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  cep: string;
}

const ProfileManagementLayout: React.FC = () => {
  const navigate = useNavigate();
  const { restaurant, updateRestaurant, refetch, isPremium, isLoading: isAuthLoading } = useAuthContext();
  const [isEditing, setIsEditing] = useState(false);
  const [editState, setEditState] = useState<RestaurantEditState | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (restaurant) {
      setEditState({
        name: restaurant.name || '',
        description: restaurant.description || '',
        category: restaurant.category || '',
        phone: restaurant.phone || '',
        email: restaurant.email || '',
        whatsapp_url: restaurant.whatsapp_url || '',
        ifood_url: restaurant.ifood_url || '',
        other_url: restaurant.other_url || '',
        external_url: restaurant.external_url || '',
        address: restaurant.address || '',
        number: restaurant.number || '',
        neighborhood: restaurant.neighborhood || '',
        city: restaurant.city || '',
        state: restaurant.state || '',
        cep: restaurant.cep || '',
      });
    }
  }, [restaurant]);

  if (isAuthLoading || !restaurant || !editState) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-[#f5f7f8]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        <p className="ml-2 text-primary">Carregando perfil...</p>
      </div>
    );
  }

  const handleEditToggle = () => {
    if (isEditing) {
      // Cancelar edição: resetar o estado
      setEditState({
        name: restaurant.name || '',
        description: restaurant.description || '',
        category: restaurant.category || '',
        phone: restaurant.phone || '',
        email: restaurant.email || '',
        whatsapp_url: restaurant.whatsapp_url || '',
        ifood_url: restaurant.ifood_url || '',
        other_url: restaurant.other_url || '',
        external_url: restaurant.external_url || '',
        address: restaurant.address || '',
        number: restaurant.number || '',
        neighborhood: restaurant.neighborhood || '',
        city: restaurant.city || '',
        state: restaurant.state || '',
        cep: restaurant.cep || '',
      });
    }
    setIsEditing(!isEditing);
  };

  const handleSave = async () => {
    if (!editState) return;
    setIsSaving(true);

    try {
      const updates = {
        ...editState,
        updated_at: new Date().toISOString(),
      };

      const { data, error } = await supabase
        .from('restaurants')
        .update(updates)
        .eq('id', restaurant.id)
        .select()
        .single();

      if (error) throw error;

      // Atualiza o contexto localmente
      updateRestaurant(data as Restaurant);
      
      showSuccess("Perfil atualizado com sucesso!");
      setIsEditing(false);
    } catch (error) {
      console.error("Erro ao salvar perfil:", error);
      showError("Falha ao atualizar o perfil. Tente novamente.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (field: keyof RestaurantEditState, value: string) => {
    setEditState(prev => (prev ? { ...prev, [field]: value } : null));
  };

  const renderEditableField = (
    field: keyof RestaurantEditState, 
    label: string, 
    Icon: React.ElementType, 
    type: 'text' | 'textarea' | 'tel' | 'email' = 'text'
  ) => (
    <div className="space-y-2">
      <label className="text-sm font-medium text-gray-700 flex items-center gap-2">
        <Icon className="w-4 h-4 text-highlight" /> {label}
      </label>
      {isEditing ? (
        type === 'textarea' ? (
          <Textarea
            value={editState[field]}
            onChange={(e) => handleChange(field, e.target.value)}
            className="rounded-lg border-gray-300 focus:border-highlight focus:ring-highlight"
            rows={3}
          />
        ) : (
          <Input
            type={type}
            value={editState[field]}
            onChange={(e) => handleChange(field, e.target.value)}
            className="h-10 rounded-lg border-gray-300 focus:border-highlight focus:ring-highlight"
          />
        )
      ) : (
        <p className="text-base text-gray-900 p-2 bg-gray-50 rounded-lg border border-gray-200 min-h-[40px]">
          {editState[field] || `N/A - Adicionar ${label}`}
        </p>
      )}
    </div>
  );

  return (
    <div className="min-h-screen bg-[#f5f7f8] flex flex-col max-w-md mx-auto">
      {/* Header */}
      <header className="bg-white p-4 sticky top-0 z-10 shadow-sm flex items-center justify-between">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(createPageUrl('restaurant-area/home'))}
          className="text-primary hover:bg-primary/5"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-xl font-bold text-primary">Gerenciar Perfil</h1>
        <Button
          onClick={handleEditToggle}
          variant={isEditing ? "outline" : "default"}
          className="text-sm font-semibold"
          disabled={isSaving}
        >
          {isEditing ? "Cancelar" : "Editar"}
        </Button>
      </header>

      <main className="flex-1 flex flex-col w-full max-w-md pb-24">
        <div className="w-full space-y-4">
          
          {/* 1. Topo do Perfil (Capa e Logo) */}
          <div className="relative w-full h-56 bg-gray-300 dark:bg-gray-700">
            {/* Imagem de Capa */}
            <img 
              src={restaurant.cover_image_url || "https://via.placeholder.com/600x200?text=Capa+do+Restaurante"} 
              alt="Capa do Restaurante" 
              className="w-full h-full object-cover"
            />
            {isEditing && (
              <Button 
                variant="secondary" 
                size="icon" 
                className="absolute top-2 right-2 rounded-full opacity-80"
                onClick={() => alert("Abrir upload de capa")}
              >
                <Camera className="w-5 h-5" />
              </Button>
            )}

            {/* Logo/Avatar */}
            <div className="absolute -bottom-10 left-4">
              <div className="w-24 h-24 bg-white rounded-full shadow-lg border-4 border-white flex items-center justify-center relative">
                <img 
                  src={restaurant.image_url || "https://via.placeholder.com/100?text=Logo"} 
                  alt="Logo do Restaurante" 
                  className="w-full h-full object-cover rounded-full"
                />
                {isEditing && (
                  <Button 
                    variant="secondary" 
                    size="icon" 
                    className="absolute bottom-0 right-0 w-6 h-6 rounded-full opacity-90 p-1"
                    onClick={() => alert("Abrir upload de logo")}
                  >
                    <Camera className="w-4 h-4" />
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* 2. Nome e Status */}
          <div className="pt-12 px-4 space-y-1">
            {isEditing ? (
              <Input
                value={editState.name}
                onChange={(e) => handleChange('name', e.target.value)}
                className="text-2xl font-bold text-primary h-10"
              />
            ) : (
              <h2 className="text-2xl font-bold text-primary">{restaurant.name}</h2>
            )}
            <p className={`text-sm font-medium ${isPremium ? 'text-green-600' : 'text-yellow-600'}`}>
              {isPremium ? 'Plano Premium Ativo' : 'Plano Gratuito'}
            </p>
          </div>

          {/* 3. Botão Salvar (Aparece apenas em edição) */}
          {isEditing && (
            <div className="px-4 pt-2">
              <Button 
                onClick={handleSave} 
                disabled={isSaving}
                className="w-full h-12 bg-highlight hover:bg-highlight/90 text-white font-bold rounded-xl shadow-md"
              >
                {isSaving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <><Check className="w-5 h-5 mr-2" /> Salvar Alterações</>
                )}
              </Button>
            </div>
          )}

          {/* 4. Tabs de Gerenciamento */}
          <Tabs defaultValue="info" className="w-full p-4 pt-0">
            <TabsList className="grid w-full grid-cols-3 h-12 bg-gray-200 rounded-xl">
              <TabsTrigger value="info" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-md font-semibold">Informações</TabsTrigger>
              <TabsTrigger value="menu" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-md font-semibold">Cardápio</TabsTrigger>
              <TabsTrigger value="gallery" className="rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-md font-semibold">Mídia</TabsTrigger>
            </TabsList>

            {/* Tab: Informações */}
            <TabsContent value="info" className="mt-4 space-y-6">
              <Card className="rounded-xl shadow-md border-none">
                <CardContent className="p-4 space-y-4">
                  <h3 className="text-lg font-bold text-primary border-b pb-2 mb-2">Detalhes Básicos</h3>
                  {renderEditableField('description', 'Descrição', Utensils, 'textarea')}
                  {renderEditableField('category', 'Categoria (Ex: Italiana, Japonesa)', Utensils)}
                </CardContent>
              </Card>

              <Card className="rounded-xl shadow-md border-none">
                <CardContent className="p-4 space-y-4">
                  <h3 className="text-lg font-bold text-primary border-b pb-2 mb-2">Contato</h3>
                  {renderEditableField('phone', 'Telefone', Phone, 'tel')}
                  {renderEditableField('email', 'Email', Mail, 'email')}
                </CardContent>
              </Card>

              <Card className="rounded-xl shadow-md border-none">
                <CardContent className="p-4 space-y-4">
                  <h3 className="text-lg font-bold text-primary border-b pb-2 mb-2">Links Externos</h3>
                  {renderEditableField('whatsapp_url', 'Link WhatsApp', LinkIcon)}
                  {renderEditableField('ifood_url', 'Link iFood', LinkIcon)}
                  {renderEditableField('other_url', 'Outro Link (Ex: Site)', LinkIcon)}
                  {renderEditableField('external_url', 'Link de Pedido Direto', LinkIcon)}
                </CardContent>
              </Card>

              <Card className="rounded-xl shadow-md border-none">
                <CardContent className="p-4 space-y-4">
                  <h3 className="text-lg font-bold text-primary border-b pb-2 mb-2">Endereço</h3>
                  {renderEditableField('cep', 'CEP', MapPin)}
                  {renderEditableField('address', 'Rua/Avenida', MapPin)}
                  {renderEditableField('number', 'Número', MapPin)}
                  {renderEditableField('neighborhood', 'Bairro', MapPin)}
                  <div className="flex gap-4">
                    <div className="flex-1">{renderEditableField('city', 'Cidade', MapPin)}</div>
                    <div className="w-20">{renderEditableField('state', 'Estado (UF)', MapPin)}</div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Horário de Funcionamento */}
              <OpeningHoursManagement restaurantId={restaurant.id} isEditing={isEditing} />

              {/* Opções de Conta */}
              <Card className="rounded-xl shadow-md border-none">
                <CardContent className="p-4 space-y-4">
                  <h3 className="text-lg font-bold text-red-600 border-b pb-2 mb-2">Opções de Conta</h3>
                  <Button variant="destructive" className="w-full flex items-center gap-2">
                    <Trash2 className="w-5 h-5" /> Excluir Restaurante
                  </Button>
                </CardContent>
              </Card>
            </TabsContent>

            {/* Tab: Cardápio */}
            <TabsContent value="menu" className="mt-4">
              <MenuManagement />
            </TabsContent>

            {/* Tab: Galeria */}
            <TabsContent value="gallery" className="mt-4">
              <GalleryManagement restaurantId={restaurant.id} isEditing={isEditing} />
            </TabsContent>
          </Tabs>
        </div>
      </main>
    </div>
  );
};

export default ProfileManagementLayout;