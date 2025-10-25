import React, { useState } from 'react';
import { MapPin, Clock, Phone, Utensils, Crown, ChevronRight, Lock, Check, Mail, FileText, Store, Building2, LogOut, Edit, Eye, ArrowLeft, MessageSquare, Globe } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils/url';
import { useAuth } from '@/hooks/useAuth';
import { showError, showSuccess } from '@/utils/toast';
import { Switch } from '@/components/ui/switch';
import { z } from 'zod';
import EditFieldDialog from '@/components/EditFieldDialog';
import { EditHoursDialog } from '@/components/EditHoursDialog';
import { EditAddressDialog } from '@/components/EditAddressDialog';
import { WeekSchedule } from '@/types/schedule';
import ProfileHeaderManagement from '@/components/restaurant/profile/ProfileHeaderManagement';
import InfoCardItem from '@/components/InfoCardItem';
import { useRestaurantProfile } from '@/hooks/useRestaurantProfile';
import { useUserRole } from '@/hooks/useUserRole';
import { Skeleton } from '@/components/ui/skeleton';
import { supabase } from '@/integrations/supabase/client';

// --- Schemas ---
const nameSchema = z.string().min(3, "Nome deve ter no mínimo 3 caracteres");
const emailSchema = z.string().email("E-mail inválido");
const phoneSchema = z.string().regex(/^\(\d{2}\)\s\d{4,5}-\d{4}$/, "Telefone inválido. Use o formato (XX) XXXX-XXXX ou (XX) XXXXX-XXXX");
const cnpjSchema = z.string().regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, "CNPJ inválido. Use o formato XX.XXX.XXX/XXXX-XX");
const whatsappSchema = z.string().url("URL inválida").optional().or(z.literal(''));
const ifoodSchema = z.string().url("URL inválida").optional().or(z.literal(''));
const otherUrlSchema = z.string().url("URL inválida").optional().or(z.literal(''));

// --- Masks ---
const phoneMask = (value: string) => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 10) {
    return numbers
      .replace(/(\d{2})(\d)/, '($1) $2')
      .replace(/(\d{4})(\d)/, '$1-$2')
      .slice(0, 14);
  }
  return numbers
    .replace(/(\d{2})(\d)/, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .slice(0, 15);
};

const cnpjMask = (value: string) => {
  const numbers = value.replace(/\D/g, '');
  return numbers
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\/\d{4})(\d)/, '$1-$2')
    .slice(0, 18);
};

// Mock Schedule (Fallback)
const mockSchedule: WeekSchedule = {
  monday: { isOpen: true, slots: [{ start: '09:00', end: '22:00' }] },
  tuesday: { isOpen: true, slots: [{ start: '09:00', end: '22:00' }] },
  wednesday: { isOpen: true, slots: [{ start: '09:00', end: '22:00' }] },
  thursday: { isOpen: true, slots: [{ start: '09:00', end: '22:00' }] },
  friday: { isOpen: true, slots: [{ start: '09:00', end: '23:00' }] },
  saturday: { isOpen: true, slots: [{ start: '11:00', end: '23:00' }] },
  sunday: { isOpen: false, slots: [] },
};

interface EditingFieldState {
  key: string;
  title: string;
  fieldName: string;
  icon: React.ReactNode;
  currentValue: string;
  placeholder?: string;
  type: "text" | "tel" | "email";
  validationSchema: z.ZodType<string>;
  mask?: (value: string) => string;
}

const ProfileEdit: React.FC = () => {
  const navigate = useNavigate();
  const { user, isLoading: authLoading } = useAuth();
  const userId = user?.id || null;
  
  const { restaurant, loading: restaurantLoading, updateRestaurant, refetch } = useRestaurantProfile(userId);
  const { isPremium } = useUserRole(); // Assuming this is the user's role, not the restaurant's plan
  
  const [editingField, setEditingField] = useState<EditingFieldState | null>(null);
  const [isHoursDialogOpen, setIsHoursDialogOpen] = useState(false);
  const [isAddressDialogOpen, setIsAddressDialogOpen] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    if (user) {
      showSuccess("Logout realizado com sucesso.");
    }
    navigate(createPageUrl('welcome'));
  };

  const handleEditField = (key: keyof typeof restaurant, title: string, fieldName: string, icon: React.ReactNode, validationSchema: z.ZodType<string>, type: "text" | "tel" | "email" = "text", mask?: (value: string) => string, placeholder?: string) => {
    if (!restaurant) return;
    
    setEditingField({
      key: key as string,
      title,
      fieldName,
      icon,
      type,
      placeholder,
      validationSchema,
      mask,
      currentValue: (restaurant[key as keyof typeof restaurant] as string) || '',
    });
  };

  const handleSaveField = async (value: string) => {
    if (!editingField) return;
    
    const key = editingField.key as keyof typeof restaurant;
    
    if (['address', 'city', 'state', 'cep', 'neighborhood', 'number'].includes(key as string)) {
        showError("Use o botão 'Editar Endereço' para atualizar a localização completa.");
        return;
    }

    const updates = { [key]: value };
    const { error } = await updateRestaurant(updates);

    if (error) {
      showError(error);
      throw new Error(error);
    }
    showSuccess(`${editingField.fieldName} atualizado com sucesso!`);
  };

  const handleSaveHours = async (newSchedule: WeekSchedule) => {
    const { error } = await updateRestaurant({ opening_hours: newSchedule });
    if (error) {
      showError(error);
      throw new Error(error);
    }
    showSuccess("Horários de funcionamento atualizados!");
  };

  const formatScheduleSummary = (schedule: WeekSchedule): string | null => {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as (keyof WeekSchedule)[];
    const openDays = days.filter(day => schedule[day]?.isOpen);
    if (openDays.length === 0) return "Fechado";
    const firstSlot = schedule[openDays[0]].slots[0];
    if (!firstSlot) return "Horários definidos";
    return `${firstSlot.start} - ${firstSlot.end}`;
  };

  if (authLoading || restaurantLoading || !restaurant) {
    return (
      <div className="min-h-screen bg-[#f5f7f8] p-4 max-w-md mx-auto">
        <header className="flex items-center bg-white p-4 pb-2 justify-between sticky top-0 z-20 shadow-sm w-full max-w-md mx-auto">
          <Button variant="ghost" size="icon" onClick={() => navigate(createPageUrl('restaurant-area/profile-menu'))} className="text-[#022D68] hover:bg-[#022D68]/5">
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <h2 className="text-[#022D68] text-xl font-bold">Meu Perfil</h2>
          <div className="w-10"></div>
        </header>
        <div className="p-4 space-y-6">
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-64 w-full rounded-xl" />
          <Skeleton className="h-40 w-full rounded-xl" />
        </div>
      </div>
    );
  }

  const currentSchedule = restaurant.opening_hours || mockSchedule;
  const scheduleSummary = formatScheduleSummary(currentSchedule);
  
  const currentAddress = {
    address: restaurant.address || '',
    city: restaurant.city || '',
    state: restaurant.state || '',
    cep: restaurant.cep || '',
    neighborhood: restaurant.neighborhood || '',
    latitude: restaurant.latitude || null,
    longitude: restaurant.longitude || null,
    number: restaurant.number || '',
  };

  const restaurantName = restaurant.name || "Estabelecimento Comercial";
  const displayName = restaurantName;

  return (
    <div className="relative bg-[#f5f7f8] font-sans antialiased flex min-h-screen w-full flex-col items-center overflow-x-hidden">
      
      {/* Header (Fixo no topo, estilo Hub) */}
      <header className="flex items-center bg-white p-4 pb-2 justify-between sticky top-0 z-20 shadow-sm w-full max-w-md mx-auto">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(createPageUrl('restaurant-area/profile-menu'))}
          className="text-[#022D68] hover:bg-[#022D68]/5"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <div className="flex items-center gap-2">
          <h2 className="text-[#022D68] text-xl font-bold">Editar Perfil</h2>
        </div>
        <div className="w-10"></div>
      </header>

      <main className="flex-1 flex flex-col w-full max-w-md pb-24">
        <div className="w-full space-y-4 p-4">
          
          {/* 1. Topo do Perfil (Capa e Logo) */}
          <div className="relative w-full h-56 bg-gray-300 dark:bg-gray-700 rounded-xl overflow-hidden">
            {restaurant.cover_image_url && (
                <img
                    src={restaurant.cover_image_url}
                    alt="Capa do Restaurante"
                    className="w-full h-full object-cover"
                />
            )}
            {/* Botão Editar Capa (Premium) */}
            <Button
              onClick={() => navigate(createPageUrl('restaurant-area/upgrade'))}
              className="absolute top-4 right-4 h-8 px-3 bg-gray-700/80 backdrop-blur-sm text-white text-xs font-semibold rounded-full hover:bg-gray-800/90 flex items-center gap-1"
            >
              <Lock className="w-3 h-3" />
              Editar capa (Premium)
            </Button>
            
            {/* Card Principal Flutuante (Logo) */}
            <Card className="absolute -bottom-12 left-4 right-4 shadow-xl border-none rounded-xl p-4 bg-white dark:bg-gray-800">
              <div className="flex items-start gap-4">
                {/* Logo e Botão de Upload */}
                <ProfileHeaderManagement
                  restaurant={restaurant}
                  onUpdate={updateRestaurant}
                  uploadingLogo={uploadingLogo}
                  setUploadingLogo={setUploadingLogo}
                  uploadingCover={uploadingCover}
                  setUploadingCover={setUploadingCover}
                />
                
                {/* Info e Plano */}
                <div className="flex-1 pt-1">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <h3 className="font-bold text-2xl text-[#022D68] leading-tight">
                        {displayName}
                      </h3>
                      <p className="text-sm text-gray-500 mt-1">{restaurant.category || "Estabelecimento Comercial"}</p>
                    </div>
                    <Badge 
                      variant="outline" 
                      className="text-xs font-semibold border-gray-400 text-gray-600 bg-white rounded-full px-3 py-1 mt-1 flex-shrink-0"
                    >
                      Plano {restaurant.plan === 'premium' ? "Premium" : "Free"}
                    </Badge>
                  </div>
                </div>
              </div>
              
              {/* Botão Ver Perfil Público */}
              <div className="mt-4 pt-4 border-t border-gray-100 dark:border-gray-700">
                <Button 
                  onClick={() => navigate(createPageUrl(`restaurant-profile/${restaurant.id}`))}
                  className="w-full flex items-center justify-center gap-2 min-w-[84px] cursor-pointer overflow-hidden rounded-full h-12 px-4 bg-highlight text-white text-base font-bold leading-normal tracking-[0.015em] shadow-lg shadow-highlight/40 hover:bg-highlight/90"
                >
                  <Eye className="w-5 h-5" />
                  <span className="truncate">Ver meu perfil público</span>
                </Button>
              </div>
            </Card>
          </div>
          
          {/* Espaçamento para o Card Flutuante */}
          <div className="h-20"></div> 

          {/* 2. Detalhes do Estabelecimento (Card) */}
          <div className="px-4 space-y-4">
            <Card className="bg-white dark:bg-gray-800 rounded-xl shadow-md border-none">
              <div className="flex justify-between items-center px-4 pt-4 pb-2">
                <h3 className="text-primary dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">Detalhes do Estabelecimento</h3>
                <button 
                  onClick={() => setIsAddressDialogOpen(true)}
                  className="flex items-center gap-1 text-highlight dark:text-highlight text-sm font-semibold hover:underline"
                >
                  <Edit className="w-4 h-4" />
                  Editar Endereço
                </button>
              </div>
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                <InfoCardItem 
                  label="Nome Comercial" 
                  value={restaurant?.name || "Restaurante Teste Free"} 
                  icon={Store} 
                  isPremium={false}
                  onClick={() => handleEditField('name', 'Editar Nome', 'Nome do Restaurante', <Building2 className="h-6 w-6 text-primary" />, nameSchema)}
                />
                <InfoCardItem
                  label="Endereço Principal"
                  value={restaurant?.address ? `${restaurant.address}, ${restaurant.number} - ${restaurant.neighborhood}` : "Não definido"}
                  icon={MapPin}
                  isPremium={false}
                  onClick={() => setIsAddressDialogOpen(true)}
                />
                <InfoCardItem
                  label="Horários de Funcionamento"
                  value={scheduleSummary}
                  icon={Clock}
                  isPremium={false}
                  onClick={() => setIsHoursDialogOpen(true)}
                />
                <InfoCardItem 
                  label="Telefone de Contato" 
                  value={restaurant?.phone || "(83) 99999-9999"} 
                  icon={Phone} 
                  isPremium={false}
                  onClick={() => handleEditField('phone', 'Editar Telefone', 'Telefone de Contato', <Phone className="h-6 w-6 text-primary" />, phoneSchema, "tel", phoneMask)}
                />
                <InfoCardItem 
                  label="E-mail de Contato" 
                  value={restaurant?.email || "contato@zedog.com"} 
                  icon={Mail} 
                  isPremium={false}
                  onClick={() => handleEditField('email', 'Editar E-mail', 'E-mail de Contato', <Mail className="h-6 w-6 text-primary" />, emailSchema, "email")}
                />
                <InfoCardItem 
                  label="CNPJ" 
                  value={restaurant?.cnpj || "12.345.678/0001-99"} 
                  icon={FileText} 
                  isPremium={false}
                  onClick={() => handleEditField('cnpj', 'Editar CNPJ', 'CNPJ', <FileText className="h-6 w-6 text-primary" />, cnpjSchema, "text", cnpjMask)}
                />
                <InfoCardItem 
                  label="Categoria Principal" 
                  value={restaurant?.category || "Não definida"} 
                  icon={Utensils} 
                  isPremium={false}
                  onClick={() => handleEditField('category', 'Editar Categoria', 'Categoria Principal', <Utensils className="h-6 w-6 text-primary" />, nameSchema, "text", undefined, "Ex: Pizzaria, Hamburgueria")}
                />
              </div>
            </Card>
          </div>

          {/* 3. Canais de Venda (Card) */}
          <div className="px-4">
            <Card className="bg-white dark:bg-gray-800 rounded-xl shadow-md border-none">
              <h3 className="text-primary dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] px-4 pb-2 pt-4">Canais de Venda e Links</h3>
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                <InfoCardItem 
                  label="Link do WhatsApp" 
                  value={restaurant?.whatsapp_url || "Não definido"} 
                  icon={MessageSquare} 
                  isPremium={false}
                  onClick={() => handleEditField('whatsapp_url', 'Editar WhatsApp', 'URL do WhatsApp', <MessageSquare className="h-6 w-6 text-primary" />, whatsappSchema, "text", undefined, "https://wa.me/5583999999999")}
                />
                <InfoCardItem 
                  label="Link do iFood/Delivery App" 
                  value={restaurant?.ifood_url || "Recurso Premium"} 
                  icon={Utensils} 
                  isPremiumFeature={true}
                  isPremium={restaurant.plan === 'premium'}
                  onClick={() => handleEditField('ifood_url', 'Editar iFood', 'URL do iFood', <Utensils className="h-6 w-6 text-primary" />, ifoodSchema, "text", undefined, "https://www.ifood.com.br/restaurante/exemplo")}
                />
                <InfoCardItem 
                  label="Outro Link (Ex: Site Próprio)" 
                  value={restaurant?.other_url || "Recurso Premium"} 
                  icon={Globe} 
                  isPremiumFeature={true}
                  isPremium={restaurant.plan === 'premium'}
                  onClick={() => handleEditField('other_url', 'Editar Outro Link', 'Outra URL', <Globe className="h-6 w-6 text-primary" />, otherUrlSchema, "text", undefined, "https://www.seusite.com.br")}
                />
              </div>
            </Card>
          </div>

          {/* 4. Cardápio (Card) */}
          <div className="px-4">
            <Card className="bg-white dark:bg-gray-800 rounded-xl shadow-md border-none">
              <h3 className="text-primary dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] px-4 pb-2 pt-4">Cardápio</h3>
              <div className="p-4 space-y-3">
                <Button 
                  onClick={() => navigate(createPageUrl('restaurant-area/menu'))}
                  className="w-full flex items-center justify-center gap-2 min-w-[84px] cursor-pointer overflow-hidden rounded-full h-12 px-4 bg-highlight text-white text-base font-bold leading-normal tracking-[0.015em] shadow-lg shadow-highlight/40 hover:bg-highlight/90"
                >
                  <Utensils className="w-5 h-5 mr-2" />
                  Atualizar Cardápio
                </Button>
              </div>
            </Card>
          </div>

          {/* 5. Plano e Assinatura (Card) */}
          <div className="px-4">
            <div className="bg-gradient-to-br from-yellow-50/50 to-yellow-100/50 dark:from-yellow-900/10 dark:to-yellow-900/20 rounded-xl shadow-sm border border-yellow-300 dark:border-yellow-700">
              <h3 className="text-primary dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] px-4 pb-2 pt-4">Plano e Assinatura</h3>
              <div className="p-4">
                <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Plano atual: <span className="font-bold text-primary dark:text-white">{restaurant.plan === 'premium' ? 'Premium' : 'Free'}</span></p>
                
                {restaurant.plan !== 'premium' && (
                  <>
                    <div className="bg-white/50 dark:bg-gray-800/50 p-4 rounded-lg space-y-2 mb-4 border border-gray-200 dark:border-gray-700">
                      <p className="text-sm font-semibold text-amber-700 dark:text-amber-400 flex items-center">
                        <Crown className="w-4 h-4 mr-1 fill-amber-500 text-amber-500" />
                        Opções Premium:
                      </p>
                      <ul className="space-y-1.5 text-gray-700 dark:text-gray-300">
                        <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-amber-500" /> Destaque nas buscas</li>
                        <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-amber-500" /> Mais fotos no perfil e cardápio</li>
                        <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-amber-500" /> Gerenciar canais de pedido (iFood, Rappi)</li>
                      </ul>
                    </div>
                    <Button 
                      onClick={() => navigate(createPageUrl('restaurant-area/upgrade'))}
                      className="w-full flex items-center justify-center gap-2 min-w-[84px] cursor-pointer overflow-hidden rounded-full h-12 px-4 bg-highlight text-white text-base font-bold leading-normal tracking-[0.015em] shadow-lg shadow-highlight/40 hover:bg-highlight/90"
                    >
                      <Crown className="w-5 h-5 fill-white" />
                      Ativar Premium
                    </Button>
                  </>
                )}
                
                {restaurant.plan === 'premium' && (
                  <Button 
                    onClick={() => navigate(createPageUrl('restaurant-area/upgrade'))}
                    variant="outline"
                    className="w-full h-12 rounded-full border-2 border-[#022D68] text-[#022D68] font-bold hover:bg-[#022D68]/5"
                  >
                    Gerenciar Assinatura
                  </Button>
                )}
              </div>
            </div>
          </div>

          {/* 6. Preferências e Personalização (Card) */}
          <div className="px-4">
            <Card className="bg-white dark:bg-gray-800 rounded-xl shadow-md border-none">
              <h3 className="text-primary dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] px-4 pb-2 pt-4">Preferências e Personalização</h3>
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                <div className="p-4 flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Alertas de pedidos</span>
                  <Switch 
                    checked={true} 
                    onCheckedChange={() => {}} 
                    className="data-[state=checked]:bg-highlight" 
                  />
                </div>
                <div className="p-4 flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Alertas de visitas</span>
                  <Switch 
                    checked={true} 
                    onCheckedChange={() => {}} 
                    className="data-[state=checked]:bg-highlight" 
                  />
                </div>
                <div className="p-4 flex justify-between items-center">
                  <span className="text-sm text-gray-600 dark:text-gray-400">Novos seguidores</span>
                  <Switch 
                    checked={false} 
                    onCheckedChange={() => {}} 
                    className="data-[state=checked]:bg-highlight" 
                  />
                </div>
                <div className="p-4 flex justify-between items-center text-highlight dark:text-highlight font-semibold cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50" onClick={() => showError("Recurso Premium")}>
                  <span className="flex items-center gap-2 text-sm">
                    <Lock className="w-4 h-4" /> Premium: Gerenciar canais
                  </span>
                  <ChevronRight className="w-5 h-5" />
                </div>
              </div>
            </Card>
          </div>

          {/* 7. Suporte e Conta (Card) */}
          <div className="px-4">
            <Card className="bg-white dark:bg-gray-800 rounded-xl shadow-md border-none">
              <h3 className="text-primary dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] px-4 pb-2 pt-4">Suporte e Conta</h3>
              <div className="divide-y divide-gray-200 dark:divide-gray-700">
                <a onClick={() => navigate(createPageUrl('restaurant-area/help'))} className="p-4 flex justify-between items-center text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer">
                  <span className="text-sm">Central de Ajuda</span>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </a>
                <a onClick={() => showSuccess("Suporte em breve")} className="p-4 flex justify-between items-center text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer">
                  <span className="text-sm">Falar com o Suporte</span>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </a>
                <a onClick={() => showSuccess("Termos em breve")} className="p-4 flex justify-between items-center text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer">
                  <span className="text-sm">Termos e Política de Privacidade</span>
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                </a>
                <div className="p-4">
                  <button 
                    onClick={handleSignOut}
                    className="w-full flex items-center justify-center gap-2 min-w-[84px] cursor-pointer overflow-hidden rounded-full h-12 px-4 bg-red-600/10 text-red-600 dark:bg-red-500/20 dark:text-red-500 text-base font-bold leading-normal tracking-[0.015em] hover:bg-red-600/20"
                  >
                    <LogOut className="w-5 h-5 mr-2" />
                    Sair da conta
                  </button>
                </div>
              </div>
            </Card>
          </div>
        </div>
      </main>

      {/* Edit Dialogs */}
      {editingField && (
        <EditFieldDialog
          isOpen={!!editingField}
          onClose={() => setEditingField(null)}
          title={editingField.title}
          fieldName={editingField.fieldName}
          currentValue={editingField.currentValue}
          icon={editingField.icon}
          onSave={handleSaveField}
          placeholder={editingField.placeholder}
          type={editingField.type}
          validationSchema={editingField.validationSchema}
          mask={editingField.mask}
        />
      )}

      {/* Edit Hours Dialog */}
      <EditHoursDialog
        open={isHoursDialogOpen}
        onOpenChange={setIsHoursDialogOpen}
        currentSchedule={currentSchedule}
        onSave={handleSaveHours}
      />

      {/* Edit Address Dialog */}
      <EditAddressDialog
        open={isAddressDialogOpen}
        onOpenChange={setIsAddressDialogOpen}
        restaurantId={restaurant.id}
        currentAddress={currentAddress}
        onSave={refetch}
      />
    </div>
  );
};

export default ProfileEdit;