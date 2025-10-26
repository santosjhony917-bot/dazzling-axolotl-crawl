import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { z } from 'zod';
import { Loader2, AlertTriangle, Crown, ArrowLeft, Eye } from 'lucide-react';
import { useAuthContext } from '@/context/AuthContext';
import { useRestaurantProfile } from '@/hooks/useRestaurantProfile';
import { showError } from '@/utils/toast';
import { createPageUrl } from '@/utils/url';
import { WeekSchedule } from '@/types/schedule';
import { Restaurant } from '@/types/supabase'; // Adicionado import para Restaurant
import { Button } from '@/components/ui/button'; // Adicionado import para Button
import { DEFAULT_RESTAURANT_LOGO_URL } from '@/constants/assets';
import { RESTAURANT_IMAGES_BUCKET } from '@/integrations/supabase/storage';

// Componentes de Seção
import MainProfileCard from './profile/MainProfileCard';
import BasicInfoSection from './profile/BasicInfoSection';
import LocationHoursSection from './profile/LocationHoursSection';
import SalesChannelsSection from './profile/SalesChannelsSection';
import ContentManagementSection from './profile/ContentManagementSection';
import SubscriptionCard from './profile/SubscriptionCard';
import SubscriptionSupportSection from './profile/SubscriptionSupportSection';
import FollowerCountCard from './profile/FollowerCountCard'; // NOVO IMPORT

// Diálogos de Edição
import EditFieldDialog from '@/components/EditFieldDialog';
import { EditAddressDialog } from '@/components/EditAddressDialog';
import { EditHoursDialog } from '@/components/EditHoursDialog';

// --- Schemas de Validação ---
const nameSchema = z.string().min(3, "Mínimo de 3 caracteres.");
const emailSchema = z.string().email("E-mail inválido.");
const phoneSchema = z.string().regex(/^\(\d{2}\) \d{5}-\d{4}$/, "Formato: (XX) XXXXX-XXXX");
const cnpjSchema = z.string().regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, "Formato: XX.XXX.XXX/XXXX-XX");
const urlSchema = z.string().url("URL inválida").or(z.literal("")).optional();

// --- Máscaras ---
const cnpjMask = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\d{4})(\d)/, '$1-$2')
    .replace(/(-\d{2})\d+?$/, '$1');
};

const phoneMask = (value: string) => {
  return value
    .replace(/\D/g, '')
    .replace(/^(\d{2})(\d)/g, '($1) $2')
    .replace(/(\d{5})(\d)/, '$1-$2')
    .replace(/(-\d{4})\d+?$/, '$1');
};

// --- Componente Principal ---

export default function ProfileManagementLayout() {
  const navigate = useNavigate();
  const { restaurant, isLoading: authLoading, isPremium, refetchProfile } = useAuthContext();
  const { updateRestaurant, isUpdating } = useRestaurantProfile();

  // --- Estado para Edição de Campo Único ---
  const [isEditFieldOpen, setIsEditFieldOpen] = useState(false);
  const [editFieldConfig, setEditFieldConfig] = useState<{
    key: keyof Restaurant;
    title: string;
    fieldName: string;
    icon: React.ReactNode;
    validationSchema: z.ZodType<string>;
    type?: "text" | "tel" | "email";
    mask?: (value: string) => string;
    placeholder?: string;
  } | null>(null);

  // --- Estado para Edição de Endereço e Horários ---
  const [isAddressDialogOpen, setIsAddressDialogOpen] = useState(false);
  const [isHoursDialogOpen, setIsHoursDialogOpen] = useState(false);
  
  // --- Handlers ---

  const handleEditField = useCallback((
    key: keyof Restaurant,
    title: string,
    fieldName: string,
    icon: React.ReactNode,
    validationSchema: z.ZodType<string>,
    type: "text" | "tel" | "email" = "text",
    mask?: (value: string) => string,
    placeholder?: string,
  ) => {
    // CORREÇÃO 6: Cast key para unknown para permitir a comparação com as chaves de link
    const keyAsString = key as unknown as string;
    
    // Se não for Premium e o campo for um link externo, bloqueia
    if (!isPremium && (keyAsString === 'whatsapp_url' || keyAsString === 'ifood_url' || keyAsString === 'other_url')) {
        showError("Recurso Premium. Faça upgrade para desbloquear.");
        return;
    }
    
    setEditFieldConfig({ key, title, fieldName, icon, validationSchema, type, mask, placeholder });
    setIsEditFieldOpen(true);
  }, [isPremium]);

  const handleSaveField = useCallback(async (value: string) => {
    if (!editFieldConfig || !restaurant?.id) return;

    const key = editFieldConfig.key;
    let finalValue = value;

    // Aplica a máscara reversa se houver (ex: remove pontos e traços do CNPJ/Telefone)
    if (key === 'cnpj' || key === 'phone') {
        finalValue = value.replace(/\D/g, '');
    }
    
    try {
      await updateRestaurant({ [key]: finalValue });
      // O onSuccess do useRestaurantProfile já chama refetchProfile
    } catch (e) {
      // O onError do useRestaurantProfile já mostra o toast de erro
      throw e;
    }
  }, [editFieldConfig, restaurant?.id, updateRestaurant]);

  const handleLogoUploadComplete = useCallback(async (url: string) => {
    try {
      await updateRestaurant({ image_url: url });
    } catch (e) {
      showError("Falha ao salvar a URL da logo no perfil.");
    }
  }, [updateRestaurant]);
  
  const handleSaveHours = useCallback(async (newSchedule: WeekSchedule) => {
    try {
      await updateRestaurant({ opening_hours: newSchedule });
      setIsHoursDialogOpen(false);
    } catch (e) {
      showError("Falha ao salvar os horários.");
    }
  }, [updateRestaurant]);
  
  const handleViewPublicProfile = () => {
    if (restaurant?.id) {
      navigate(createPageUrl('restaurantProfile', { restaurantId: restaurant.id }));
    }
  };

  // --- Dados Derivados ---
  const currentSchedule = useMemo(() => {
    return (restaurant?.opening_hours || {
      monday: { isOpen: false, slots: [] },
      tuesday: { isOpen: false, slots: [] },
      wednesday: { isOpen: false, slots: [] },
      thursday: { isOpen: false, slots: [] },
      friday: { isOpen: false, slots: [] },
      saturday: { isOpen: false, slots: [] },
      sunday: { isOpen: false, slots: [] },
    }) as WeekSchedule;
  }, [restaurant?.opening_hours]);

  // --- Renderização de Carregamento/Erro ---
  if (authLoading || isUpdating) {
    return (
      <div className="flex justify-center items-center h-screen bg-[#f5f7f8]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="p-6 text-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-800 mb-2">Acesso Negado</h2>
        <p className="text-gray-600 mb-6">Você precisa ter um restaurante registrado para acessar esta página.</p>
        <Button onClick={() => navigate(createPageUrl('index'))}>
          Voltar para o Início
        </Button>
      </div>
    );
  }
  
  // --- Renderização Principal ---
  return (
    <div className="min-h-screen bg-[#f5f7f8] pb-20 max-w-md mx-auto">
      
      {/* Header Fixo */}
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
          <Crown className="h-6 w-6 text-[#022D68]" />
          <h2 className="text-[#022D68] text-xl font-bold">Meu Perfil</h2>
        </div>
        <div className="w-10"></div>
      </header>

      <main className="p-4 space-y-8">
        
        {/* Card Principal (Logo e Nome) */}
        <MainProfileCard
          restaurantName={restaurant.name}
          logoUrl={restaurant.image_url}
          isPremium={isPremium}
          uploading={isUpdating}
          onLogoUploadComplete={handleLogoUploadComplete}
          restaurantId={restaurant.id}
        />
        
        {/* Botão Ver Perfil Público */}
        <Button
          onClick={handleViewPublicProfile}
          variant="outline"
          className="w-full h-12 rounded-xl border-2 border-highlight text-highlight font-bold hover:bg-highlight/5"
        >
          <Eye className="w-5 h-5 mr-2" />
          Ver Perfil Público
        </Button>
        
        {/* Card de Seguidores (NOVO) */}
        <FollowerCountCard followerCount={120} isPremium={isPremium} />
        
        {/* Seção 1: Informações Básicas */}
        <BasicInfoSection
          restaurant={restaurant}
          isPremium={isPremium}
          handleEditField={handleEditField}
          cnpjMask={cnpjMask}
          phoneMask={phoneMask}
          nameSchema={nameSchema}
          emailSchema={emailSchema}
          phoneSchema={phoneSchema}
          cnpjSchema={cnpjSchema}
        />

        {/* Seção 2: Localização e Horários */}
        <LocationHoursSection
          restaurant={restaurant}
          isPremium={isPremium}
          currentSchedule={currentSchedule}
          setIsAddressDialogOpen={setIsAddressDialogOpen}
          setIsHoursDialogOpen={setIsHoursDialogOpen}
        />
        
        {/* Seção 3: Canais de Venda */}
        <SalesChannelsSection
          restaurant={restaurant}
          isPremium={isPremium}
          handleEditField={handleEditField}
          whatsappSchema={urlSchema}
          ifoodSchema={urlSchema}
          otherUrlSchema={urlSchema}
        />
        
        {/* Seção 4: Gerenciamento de Conteúdo */}
        <ContentManagementSection navigate={navigate} />
        
        {/* Seção 5: Plano e Assinatura */}
        <SubscriptionCard isPremium={isPremium} />
        
        {/* Seção 6: Suporte */}
        <SubscriptionSupportSection navigate={navigate} isPremium={isPremium} />
        
      </main>
      
      {/* Diálogo de Edição de Campo Único */}
      {editFieldConfig && (
        <EditFieldDialog
          isOpen={isEditFieldOpen}
          onClose={() => setIsEditFieldOpen(false)}
          title={editFieldConfig.title}
          fieldName={editFieldConfig.fieldName}
          currentValue={String(restaurant[editFieldConfig.key] || '')}
          icon={editFieldConfig.icon}
          onSave={handleSaveField}
          placeholder={editFieldConfig.placeholder}
          type={editFieldConfig.type}
          validationSchema={editFieldConfig.validationSchema}
          mask={editFieldConfig.mask}
        />
      )}
      
      {/* Diálogo de Edição de Endereço */}
      <EditAddressDialog
        open={isAddressDialogOpen}
        onOpenChange={setIsAddressDialogOpen}
        restaurantId={restaurant.id}
        currentAddress={{
          address: restaurant.address || '',
          city: restaurant.city || '',
          state: restaurant.state || '',
          cep: restaurant.cep || '',
          neighborhood: restaurant.neighborhood || '',
          latitude: restaurant.latitude,
          longitude: restaurant.longitude,
        }}
        onSave={refetchProfile}
      />
      
      {/* Diálogo de Edição de Horários */}
      <EditHoursDialog
        open={isHoursDialogOpen}
        onOpenChange={setIsHoursDialogOpen}
        currentSchedule={currentSchedule}
        onSave={handleSaveHours}
      />
    </div>
  );
}