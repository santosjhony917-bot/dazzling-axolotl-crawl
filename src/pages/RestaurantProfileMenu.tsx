import React, { useState, useCallback, useEffect, memo } from "react";
import { ArrowLeft, Phone, Mail, FileText, UtensilsCrossed, Store, Globe, Building2, Utensils, LogOut, Edit, Eye, ChevronRight, Lock, MessageSquare, Star, Bell, MapPin, Clock, Crown, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useRestaurantProfile } from "@/hooks/useRestaurantProfile";
import { useUserRole } from "@/hooks/useUserRole";
import { useImageUpload } from "@/hooks/useImageUpload";
import RestaurantBottomNav from "@/components/restaurant/RestaurantBottomNav";
import EditFieldDialog from "@/components/EditFieldDialog";
import { EditHoursDialog } from "@/components/EditHoursDialog";
import { EditAddressDialog } from "@/components/EditAddressDialog";
import { z } from "zod";
import { WeekSchedule } from "@/types/schedule";
import { createPageUrl } from "@/utils/url";
import { showError, showSuccess } from "@/utils/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

// Importando os componentes de seção (agora simplificados para itens de lista)
import ProfileHeaderManagement from "@/components/restaurant/profile/ProfileHeaderManagement";
import InfoCardItem from '@/components/InfoCardItem';
import NavCardItem from '@/components/NavCardItem';

// --- Schemas ---
const nameSchema = z.string().min(3, "Nome deve ter no mínimo 3 caracteres");
const emailSchema = z.string().email("E-mail inválido");
const phoneSchema = z.string().regex(/^\(\d{2}\)\s\d{4,5}-\d{4}$/, "Telefone inválido. Use o formato (XX) XXXX-XXXX ou (XX) XXXXX-XXXX");
const cnpjSchema = z.string().regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, "CNPJ inválido. Use o formato XX.XXX.XXX/XXXX-XX");
const whatsappSchema = z.string().url("URL do WhatsApp inválida").or(z.literal(''));
const ifoodSchema = z.string().url("URL do iFood inválida").or(z.literal(''));
const otherUrlSchema = z.string().url("URL inválida").or(z.literal(''));

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

// --- Componentes de Seção Refatorados para o Novo Design ---

// 1. Detalhes do Estabelecimento (Basic Info)
const BasicInfoSection: React.FC<{ restaurant: any, handleEditField: any, setIsAddressDialogOpen: (open: boolean) => void, setIsHoursDialogOpen: (open: boolean) => void }> = ({ restaurant, handleEditField, setIsAddressDialogOpen, setIsHoursDialogOpen }) => {
  
  // Helper para formatar o resumo dos horários (copiado de LocationHoursSection)
  const formatScheduleSummary = (schedule: WeekSchedule): string | null => {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as (keyof WeekSchedule)[];
    const openDays = days.filter(day => schedule[day]?.isOpen);
    if (openDays.length === 0) return "Fechado";
    const firstSlot = schedule[openDays[0]].slots[0];
    if (!firstSlot) return "Horários definidos";
    return `${firstSlot.start} - ${firstSlot.end}`;
  };
  
  const currentSchedule = restaurant.opening_hours || mockSchedule;
  const scheduleSummary = formatScheduleSummary(currentSchedule);
  
  return (
    <div className="divide-y divide-gray-200 dark:divide-gray-700">
      <InfoCardItem 
        label="Nome Comercial" 
        value={restaurant?.name || "Restaurante Teste Free"} 
        icon={Store} 
        isPremium={false}
        onClick={() => handleEditField('name', 'Editar Nome', 'Nome do Restaurante', <Building2 className="h-6 w-6 text-primary" />, nameSchema)}
      />
      <InfoCardItem
        label="Endereço"
        value={restaurant?.address ? `${restaurant.address}, ${restaurant.neighborhood}` : "Não definido"}
        icon={MapPin}
        isPremium={false}
        onClick={() => setIsAddressDialogOpen(true)}
      />
      <InfoCardItem
        label="Horários"
        value={scheduleSummary}
        icon={Clock}
        isPremium={false}
        onClick={() => setIsHoursDialogOpen(true)}
      />
      <InfoCardItem 
        label="Contato/WhatsApp" 
        value={restaurant?.phone || "(83) 99999-9999"} 
        icon={Phone} 
        isPremium={false}
        onClick={() => handleEditField('phone', 'Editar Telefone', 'Telefone de Contato', <Phone className="h-6 w-6 text-primary" />, phoneSchema, "tel", phoneMask)}
      />
      <InfoCardItem 
        label="E-mail" 
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
    </div>
  );
};

// 2. Cardápio Section
const MenuSection: React.FC<{ navigate: ReturnType<typeof useNavigate> }> = ({ navigate }) => (
  <div className="p-4 space-y-3">
    <Button 
      onClick={() => navigate(createPageUrl('restaurant-area/menu'))}
      className="w-full flex items-center justify-center gap-2 min-w-[84px] cursor-pointer overflow-hidden rounded-full h-12 px-4 bg-highlight hover:bg-highlight/90 text-white text-base font-bold leading-normal tracking-[0.015em]"
    >
      <Utensils className="w-5 h-5 mr-2" />
      Atualizar Cardápio
    </Button>
    <Button 
      onClick={() => navigate(createPageUrl('restaurant-area/categories'))}
      className="w-full flex items-center justify-center gap-2 min-w-[84px] cursor-pointer overflow-hidden rounded-full h-12 px-4 bg-highlight hover:bg-highlight/90 text-white text-base font-bold leading-normal tracking-[0.015em]"
    >
      <UtensilsCrossed className="w-5 h-5 mr-2" />
      Gerenciar Categorias
    </Button>
  </div>
);

// 3. Plano e Assinatura Section (SubscriptionCard - Novo Design)
const SubscriptionCardNew: React.FC<{ navigate: ReturnType<typeof useNavigate>, isPremium: boolean }> = ({ navigate, isPremium }) => {
  const handleUpgradeClick = () => navigate(createPageUrl('restaurant-area/upgrade'));
  
  return (
    <div className="bg-gradient-to-br from-yellow-50/50 to-yellow-100/50 dark:from-yellow-900/10 dark:to-yellow-900/20 rounded-xl shadow-sm border border-yellow-300 dark:border-yellow-700">
      <h3 className="text-primary dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] px-4 pb-2 pt-4">Plano e Assinatura</h3>
      <div className="p-4">
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Plano atual: <span className="font-bold text-primary dark:text-white">{isPremium ? 'Premium' : 'Free'}</span></p>
        
        {!isPremium && (
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
              onClick={handleUpgradeClick}
              className="w-full flex items-center justify-center gap-2 min-w-[84px] cursor-pointer overflow-hidden rounded-full h-12 px-4 bg-highlight text-white text-base font-bold leading-normal tracking-[0.015em] shadow-lg shadow-highlight/40 hover:bg-highlight/90"
            >
              <Crown className="w-5 h-5 fill-white" />
              Ativar Premium
            </Button>
          </>
        )}
        
        {isPremium && (
          <Button 
            onClick={handleUpgradeClick}
            variant="outline"
            className="w-full h-12 rounded-full border-2 border-[#022D68] text-[#022D68] font-bold hover:bg-[#022D68]/5"
          >
            Gerenciar Assinatura
          </Button>
        )}
      </div>
    </div>
  );
};

// 4. Preferências e Personalização Section
const PreferencesSection: React.FC = () => {
  const [orderAlerts, setOrderAlerts] = useState(true);
  const [visitAlerts, setVisitAlerts] = useState(true);
  const [followerAlerts, setFollowerAlerts] = useState(false);
  
  return (
    <div className="divide-y divide-gray-200 dark:divide-gray-700">
      <div className="p-4 flex justify-between items-center">
        <span className="text-sm text-gray-600 dark:text-gray-400">Alertas de pedidos</span>
        <Switch 
          checked={orderAlerts} 
          onCheckedChange={setOrderAlerts} 
          className="data-[state=checked]:bg-highlight" 
        />
      </div>
      <div className="p-4 flex justify-between items-center">
        <span className="text-sm text-gray-600 dark:text-gray-400">Alertas de visitas</span>
        <Switch 
          checked={visitAlerts} 
          onCheckedChange={setVisitAlerts} 
          className="data-[state=checked]:bg-highlight" 
        />
      </div>
      <div className="p-4 flex justify-between items-center">
        <span className="text-sm text-gray-600 dark:text-gray-400">Novos seguidores</span>
        <Switch 
          checked={followerAlerts} 
          onCheckedChange={setFollowerAlerts} 
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
  );
};

// 5. Suporte e Conta Section
const SupportAccountSection: React.FC<{ handleSignOut: () => void, navigate: ReturnType<typeof useNavigate> }> = ({ handleSignOut, navigate }) => (
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
);


const RestaurantProfileMenu: React.FC = () => {
  const navigate = useNavigate();
  const { signOut, user, isLoading: authLoading } = useAuth();
  
  const userId = user?.id || null;
  const { restaurant, loading: restaurantLoading, updateRestaurant, refetch } = useRestaurantProfile(userId);
  const { isPremium, isLoading: roleLoading } = useUserRole();
  const { uploadImage, uploading } = useImageUpload();

  const [editingField, setEditingField] = useState<EditingFieldState | null>(null);
  const [isHoursDialogOpen, setIsHoursDialogOpen] = useState(false);
  const [isAddressDialogOpen, setIsAddressDialogOpen] = useState(false);
  
  // Estados de upload movidos para o componente pai
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate(createPageUrl('restaurant-login'));
    }
  }, [authLoading, user, navigate]);

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      showError(error.message || "Erro ao sair.");
    } else {
      showSuccess("Logout realizado com sucesso.");
      navigate(createPageUrl('welcome'));
    }
  };

  const handleEditField = useCallback((key: keyof typeof restaurant, title: string, fieldName: string, icon: React.ReactNode, validationSchema: z.ZodType<string>, type: "text" | "tel" | "email" = "text", mask?: (value: string) => string, placeholder?: string) => {
    if (!restaurant) return;
    setEditingField({
      key: key,
      title,
      fieldName,
      icon,
      type,
      placeholder,
      validationSchema,
      mask,
      currentValue: (restaurant[key] as string) || '',
    });
  }, [restaurant]);

  const handleSaveField = async (value: string) => {
    if (!editingField) return;
    
    const key = editingField.key as keyof typeof restaurant;
    
    if (['address', 'city', 'state', 'cep', 'neighborhood'].includes(key)) {
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

  // A lógica de upload de imagem foi movida para ProfileHeaderManagement, mas mantemos o estado de loading aqui
  // para passar para o componente filho.

  if (authLoading || restaurantLoading || roleLoading) {
    return (
      <div className="min-h-screen bg-[#f5f7f8] p-4 pb-20 max-w-md mx-auto">
        <Skeleton className="h-40 w-full rounded-xl mb-6" />
        <Skeleton className="h-6 w-3/4 mb-4" />
        <Skeleton className="h-64 w-full rounded-xl mb-6" />
        <Skeleton className="h-40 w-full rounded-xl" />
        <RestaurantBottomNav selectedTab="perfil" isFree={!isPremium} />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-semibold text-[#022D68]">Restaurante não encontrado</h2>
        <p className="text-gray-600 mt-2">Parece que você ainda não tem um restaurante cadastrado ou vinculado a esta conta.</p>
        <Button onClick={() => navigate(createPageUrl('restaurant-signup'))} className="mt-4 bg-[#E47948] hover:bg-[#E47948]/90">
          Cadastrar Novo Restaurante
        </Button>
        <Button onClick={handleSignOut} variant="ghost" className="mt-2 text-red-500">
          Sair
        </Button>
      </div>
    );
  }

  const currentSchedule = restaurant.opening_hours || mockSchedule;
  const currentAddress = {
    address: restaurant.address || '',
    city: restaurant.city || '',
    state: restaurant.state || '',
    cep: restaurant.cep || '',
    neighborhood: restaurant.neighborhood || '',
    latitude: restaurant.latitude || null,
    longitude: restaurant.longitude || null,
  };
  
  const restaurantName = restaurant.name || "Estabelecimento Comercial";
  const restaurantType = "Estabelecimento Comercial"; // Mocked value
  
  // Usando o nome completo
  const displayName = restaurantName;

  return (
    <div className="relative bg-[#f5f7f8] font-sans antialiased flex min-h-screen w-full flex-col items-center overflow-x-hidden">
      
      {/* Header (Fixo no topo, estilo Hub) */}
      <header className="flex items-center bg-white p-4 pb-2 justify-between sticky top-0 z-20 shadow-sm w-full max-w-md mx-auto">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(createPageUrl('restaurant-area/home'))}
          className="text-[#022D68] hover:bg-[#022D68]/5"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <div className="flex items-center gap-2">
          <h2 className="text-[#022D68] text-xl font-bold">Meu Perfil</h2>
        </div>
        <div className="w-10"></div>
      </header>

      <main className="flex-1 flex flex-col w-full max-w-md pb-24">
        <div className="w-full space-y-4">
          
          {/* 1. Topo do Perfil (Capa e Logo) */}
          <div className="relative w-full h-56 bg-gray-300 dark:bg-gray-700">
            {/* Botão Editar Capa (Premium) */}
            <Button
              onClick={() => navigate(createPageUrl('restaurant-area/upgrade'))}
              className="absolute top-4 right-4 h-8 px-3 bg-gray-700/80 backdrop-blur-sm text-white text-xs font-semibold rounded-full hover:bg-gray-800/90 flex items-center gap-1"
            >
              <Lock className="w-3 h-3" />
              Editar capa (Premium)
            </Button>
            
            {/* Card Principal Flutuante */}
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
                      <p className="text-sm text-gray-500 mt-1">{restaurantType}</p>
                    </div>
                    <Badge 
                      variant="outline" 
                      className="text-xs font-semibold border-gray-400 text-gray-600 bg-white rounded-full px-3 py-1 mt-1 flex-shrink-0"
                    >
                      Plano {isPremium ? "Premium" : "Free"}
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

          {/* 3. Detalhes do Estabelecimento (Card) */}
          <div className="px-4">
            <Card className="bg-white dark:bg-gray-800 rounded-xl shadow-md border-none">
              <div className="flex justify-between items-center px-4 pt-4 pb-2">
                <h3 className="text-primary dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">Detalhes do Estabelecimento</h3>
                <button 
                  onClick={() => setIsAddressDialogOpen(true)} // Usando o diálogo de endereço como ponto de entrada para edição
                  className="flex items-center gap-1 text-highlight dark:text-highlight text-sm font-semibold hover:underline"
                >
                  <Edit className="w-4 h-4" />
                  Editar
                </button>
              </div>
              <BasicInfoSection 
                restaurant={restaurant} 
                handleEditField={handleEditField} 
                setIsAddressDialogOpen={setIsAddressDialogOpen}
                setIsHoursDialogOpen={setIsHoursDialogOpen}
              />
            </Card>
          </div>

          {/* 4. Cardápio (Card) */}
          <div className="px-4">
            <Card className="bg-white dark:bg-gray-800 rounded-xl shadow-md border-none">
              <h3 className="text-primary dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] px-4 pb-2 pt-4">Cardápio</h3>
              <MenuSection navigate={navigate} />
            </Card>
          </div>

          {/* 5. Plano e Assinatura (Card) */}
          <div className="px-4">
            <SubscriptionCardNew navigate={navigate} isPremium={isPremium} />
          </div>

          {/* 6. Preferências e Personalização (Card) */}
          <div className="px-4">
            <Card className="bg-white dark:bg-gray-800 rounded-xl shadow-md border-none">
              <h3 className="text-primary dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] px-4 pb-2 pt-4">Preferências e Personalização</h3>
              <PreferencesSection />
            </Card>
          </div>

          {/* 7. Suporte e Conta (Card) */}
          <div className="px-4">
            <Card className="bg-white dark:bg-gray-800 rounded-xl shadow-md border-none">
              <h3 className="text-primary dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] px-4 pb-2 pt-4">Suporte e Conta</h3>
              <SupportAccountSection handleSignOut={handleSignOut} navigate={navigate} />
            </Card>
          </div>
        </div>
      </main>

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 w-full max-w-md mx-auto z-30">
        <RestaurantBottomNav selectedTab="perfil" isFree={!isPremium} />
      </div>

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

export default memo(RestaurantProfileMenu);