import React from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { WeekSchedule } from '@/types/schedule';
import { Restaurant } from '@/types/supabase';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Settings, Utensils, Image, Link, Clock, Loader2, MapPin, MessageSquare, Globe, FileText, Phone, Mail, Crown } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createPageUrl } from '@/utils/url';
import { useRestaurantProfile } from '@/hooks/useRestaurantProfile';
import { useAuthContext } from '@/context/AuthContext';
import RestaurantBottomNav from './RestaurantBottomNav';
import MainProfileCard from './profile/MainProfileCard';
import FollowerCountCard from './profile/FollowerCountCard';
import SubscriptionCard from './profile/SubscriptionCard';
import ContentManagementSection from './profile/ContentManagementSection';
import SubscriptionSupportSection from './profile/SubscriptionSupportSection';
import BasicInfoSection from './profile/BasicInfoSection';
import LocationHoursSection from './profile/LocationHoursSection';
import SalesChannelsSection from './profile/SalesChannelsSection';
import EditFieldDialog from '@/components/EditFieldDialog';
import { EditAddressDialog } from '@/components/EditAddressDialog';
import { EditHoursDialog } from '@/components/EditHoursDialog';
import { z } from 'zod';
import { cnpjMask, phoneMask } from '@/utils/masks';
import { showError } from '@/utils/toast';

// Schemas de validação
const nameSchema = z.string().min(3, "O nome deve ter pelo menos 3 caracteres.");
const emailSchema = z.string().email("E-mail inválido.");
const phoneSchema = z.string().regex(/^\(\d{2}\) \d{5}-\d{4}$/, "Telefone inválido (Ex: (83) 99999-9999)");
const cnpjSchema = z.string().regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, "CNPJ inválido (Ex: 12.345.678/0001-90)");
const urlSchema = z.string().url("URL inválida.").optional().or(z.literal(''));

const ProfileManagementLayout: React.FC = () => {
  const navigate = useNavigate();
  const { restaurant, isLoading, updateRestaurant, refetchProfile } = useRestaurantProfile();
  const { isPremium } = useAuthContext();
  
  // Estados para Modais de Edição
  const [isEditDialogOpen, setIsEditDialogOpen] = React.useState(false);
  const [editConfig, setEditConfig] = React.useState<{ key: keyof Restaurant, title: string, fieldName: string, icon: React.ReactNode, validationSchema: z.ZodType<string>, type?: "text" | "tel" | "email", mask?: (value: string) => string, placeholder?: string } | null>(null);
  const [isAddressDialogOpen, setIsAddressDialogOpen] = React.useState(false);
  const [isHoursDialogOpen, setIsHoursDialogOpen] = React.useState(false);
  
  // Mock de Horários (para evitar erro de JSONB nulo)
  const defaultSchedule: WeekSchedule = {
    monday: { isOpen: true, slots: [{ start: '09:00', end: '18:00' }] },
    tuesday: { isOpen: true, slots: [{ start: '09:00', end: '18:00' }] },
    wednesday: { isOpen: true, slots: [{ start: '09:00', end: '18:00' }] },
    thursday: { isOpen: true, slots: [{ start: '09:00', end: '18:00' }] },
    friday: { isOpen: true, slots: [{ start: '09:00', end: '18:00' }] },
    saturday: { isOpen: false, slots: [] },
    sunday: { isOpen: false, slots: [] },
  };
  const currentSchedule: WeekSchedule = (restaurant?.opening_hours as WeekSchedule) || defaultSchedule;

  // Handlers de Edição
  const handleEditField = (key: keyof Restaurant, title: string, fieldName: string, icon: React.ReactNode, validationSchema: z.ZodType<string>, type?: "text" | "tel" | "email", mask?: (value: string) => string, placeholder?: string) => {
    if (!isPremium && (key === 'whatsapp_url' || key === 'ifood_url' || key === 'other_url')) {
      showError("Recurso Premium. Faça upgrade para desbloquear.");
      return;
    }
    setEditConfig({
      key,
      title,
      fieldName,
      icon,
      validationSchema,
      type,
      mask,
      placeholder,
    });
    setIsEditDialogOpen(true);
  };

  const handleSaveField = async (value: string) => {
    if (!editConfig) return;
    await updateRestaurant({ [editConfig.key]: value });
    refetchProfile();
  };
  
  const handleSaveHours = async (newSchedule: WeekSchedule) => {
    await updateRestaurant({ opening_hours: newSchedule });
    refetchProfile();
  };
  
  const handleLogoUploadComplete = async (url: string) => {
    await updateRestaurant({ image_url: url });
    refetchProfile();
  };

  if (isLoading) {
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
        <h2 className="text-xl font-bold text-gray-800 mb-2">Restaurante Não Encontrado</h2>
        <p className="text-gray-600 mb-6">Você precisa ter um restaurante registrado para acessar esta página.</p>
        <Button onClick={() => navigate(createPageUrl('restaurant-area-hub'))}>
          Acessar Hub
        </Button>
      </div>
    );
  }
  
  const currentAddressData = {
    address: restaurant.address || '',
    city: restaurant.city || '',
    state: restaurant.state || '',
    cep: restaurant.cep || '',
    neighborhood: restaurant.neighborhood || '',
    latitude: restaurant.latitude,
    longitude: restaurant.longitude,
  };

  return (
    <div className="min-h-screen bg-[#f5f7f8] pb-20 max-w-md mx-auto">
      
      {/* Header */}
      <header className="flex items-center bg-white p-4 pb-2 justify-between sticky top-0 z-20 shadow-soft-md w-full max-w-md mx-auto">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(createPageUrl('restaurant-area/home'))}
          className="text-[#022D68] hover:bg-[#022D68]/5 rounded-lg"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <div className="flex items-center gap-2">
          <Settings className="h-6 w-6 text-[#022D68]" />
          <h2 className="text-[#022D68] text-xl font-bold">Perfil do Restaurante</h2>
        </div>
        <div className="w-10"></div>
      </header>

      <main className="p-4 space-y-6">
        
        {/* 1. Card Principal (Logo e Nome) */}
        <MainProfileCard
          restaurantName={restaurant.name}
          logoUrl={restaurant.image_url}
          isPremium={isPremium}
          uploading={false} // Estado de upload gerenciado internamente
          onLogoUploadComplete={handleLogoUploadComplete}
          restaurantId={restaurant.id}
        />
        
        {/* 2. Estatísticas (Mock) */}
        <FollowerCountCard followerCount={120} isPremium={isPremium} />
        
        {/* 3. Plano e Assinatura */}
        <SubscriptionCard isPremium={isPremium} />

        {/* 4. Informações Básicas */}
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
        
        {/* 5. Localização e Horários */}
        <LocationHoursSection
          restaurant={restaurant}
          isPremium={isPremium}
          currentSchedule={currentSchedule}
          setIsAddressDialogOpen={setIsAddressDialogOpen}
          setIsHoursDialogOpen={setIsHoursDialogOpen}
        />
        
        {/* 6. Canais de Venda */}
        <SalesChannelsSection
          restaurant={restaurant}
          isPremium={isPremium}
          handleEditField={handleEditField}
          whatsappSchema={urlSchema}
          ifoodSchema={urlSchema}
          otherUrlSchema={urlSchema}
        />
        
        {/* 7. Gerenciamento de Conteúdo */}
        <ContentManagementSection navigate={navigate} isPremium={isPremium} />
        
        {/* 8. Suporte e Sair */}
        <SubscriptionSupportSection navigate={navigate} isPremium={isPremium} />
        
      </main>
      
      {/* Bottom Navigation */}
      <RestaurantBottomNav selectedTab="perfil" isFree={!isPremium} />

      {/* Modais de Edição */}
      {editConfig && (
        <EditFieldDialog
          isOpen={isEditDialogOpen}
          onClose={() => setIsEditDialogOpen(false)}
          title={editConfig.title}
          fieldName={editConfig.fieldName}
          currentValue={restaurant[editConfig.key] as string || ''}
          icon={editConfig.icon}
          onSave={handleSaveField}
          placeholder={editConfig.placeholder}
          type={editConfig.type}
          validationSchema={editConfig.validationSchema}
          mask={editConfig.mask}
        />
      )}
      
      <EditAddressDialog
        open={isAddressDialogOpen}
        onOpenChange={setIsAddressDialogOpen}
        restaurantId={restaurant.id}
        currentAddress={currentAddressData}
        onSave={refetchProfile}
      />
      
      <EditHoursDialog
        open={isHoursDialogOpen}
        onOpenChange={setIsHoursDialogOpen}
        currentSchedule={currentSchedule}
        onSave={handleSaveHours}
      />
    </div>
  );
};

export default ProfileManagementLayout;