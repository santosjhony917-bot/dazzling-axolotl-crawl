import React, { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthContext } from '@/context/AuthContext';
import { useRestaurantProfile } from '@/hooks/useRestaurantProfile';
import { Loader2, Utensils, Crown, MapPin, Clock, MessageSquare, Globe, FileText, Phone, Mail, Building2, UtensilsCrossed } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { createPageUrl } from '@/utils/url';
import { showError, showSuccess } from '@/utils/toast';
import { z } from 'zod';
import { cnpjMask, phoneMask } from '@/utils/masks';
import EditFieldDialog from '@/components/EditFieldDialog';
import { EditAddressDialog } from '@/components/EditAddressDialog';
import { EditHoursDialog } from '@/components/EditHoursDialog';
import { WeekSchedule } from '@/types/schedule';
import MainProfileCard from '@/components/restaurant/profile/MainProfileCard';
import FollowerCountCard from '@/components/restaurant/profile/FollowerCountCard';
import BasicInfoSection from '@/components/restaurant/profile/BasicInfoSection';
import LocationHoursSection from '@/components/restaurant/profile/LocationHoursSection';
import SalesChannelsSection from '@/components/restaurant/profile/SalesChannelsSection';
import ContentManagementSection from '@/components/restaurant/profile/ContentManagementSection';
import SubscriptionSupportSection from '@/components/restaurant/profile/SubscriptionSupportSection';
import RestaurantAreaPageLayout from '@/components/restaurant/RestaurantAreaPageLayout';

// --- Schemas de Validação ---
const nameSchema = z.string().min(2, "O nome deve ter pelo menos 2 caracteres.");
const emailSchema = z.string().email("E-mail inválido.");
const phoneSchema = z.string().regex(/^\(\d{2}\) \d{5}-\d{4}$/, "Telefone inválido (Ex: (83) 99999-9999)");
const cnpjSchema = z.string().regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, "CNPJ inválido (Ex: XX.XXX.XXX/XXXX-XX)");
const urlSchema = z.string().url("URL inválida.").optional().or(z.literal(''));

// --- Tipos de Configuração de Edição ---
interface EditConfig {
  key: keyof typeof initialEditConfig;
  title: string;
  fieldName: string;
  icon: React.ReactNode;
  validationSchema: z.ZodType<string>;
  type?: "text" | "tel" | "email";
  mask?: (value: string) => string;
  placeholder?: string;
}

const initialEditConfig = {
  key: 'name',
  title: '',
  fieldName: '',
  icon: <div />,
  validationSchema: nameSchema,
};

export default function RestaurantProfileSettingsPage() {
  const navigate = useNavigate();
  const { restaurant, isLoading: profileLoading, updateRestaurant, refetchProfile } = useRestaurantProfile();
  const { isPremium, isLoading: authLoading } = useAuthContext();
  
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editConfig, setEditConfig] = useState<EditConfig>(initialEditConfig);
  const [isAddressDialogOpen, setIsAddressDialogOpen] = useState(false);
  const [isHoursDialogOpen, setIsHoursDialogOpen] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const isLoading = profileLoading || authLoading;

  // --- Dados do Restaurante ---
  const currentRestaurant = restaurant || {};
  const currentSchedule: WeekSchedule = useMemo(() => {
    // Converte o JSONB de opening_hours para o tipo WeekSchedule
    return (currentRestaurant.opening_hours as WeekSchedule) || {
      monday: { isOpen: false, slots: [] },
      tuesday: { isOpen: false, slots: [] },
      wednesday: { isOpen: false, slots: [] },
      thursday: { isOpen: false, slots: [] },
      friday: { isOpen: false, slots: [] },
      saturday: { isOpen: false, slots: [] },
      sunday: { isOpen: false, slots: [] },
    };
  }, [currentRestaurant.opening_hours]);

  // --- Handlers de Edição Genérica ---
  const handleEditField = useCallback((
    key: keyof typeof currentRestaurant, 
    title: string, 
    fieldName: string, 
    icon: React.ReactNode, 
    validationSchema: z.ZodType<string>, 
    type: "text" | "tel" | "email" = "text", 
    mask?: (value: string) => string, 
    placeholder?: string
  ) => {
    setEditConfig({
      key: key as keyof typeof initialEditConfig, // Cast necessário para compatibilidade
      title,
      fieldName,
      icon,
      validationSchema,
      type,
      mask,
      placeholder,
    });
    setIsEditDialogOpen(true);
  }, []);

  const handleSaveField = useCallback(async (value: string) => {
    if (!currentRestaurant.id || !editConfig) return;
    
    // Aplica a máscara antes de salvar, se houver
    const finalValue = editConfig.mask ? editConfig.mask(value) : value;
    
    await updateRestaurant({ [editConfig.key]: finalValue });
    refetchProfile();
  }, [currentRestaurant.id, editConfig, updateRestaurant, refetchProfile]);

  // --- Handlers de Imagem ---
  const handleLogoUploadComplete = useCallback(async (url: string) => {
    setUploadingLogo(true);
    const cacheBustedUrl = `${url}?t=${Date.now()}`;
    const { error } = await updateRestaurant({ image_url: cacheBustedUrl });
    if (error) {
      showError("Falha ao salvar URL do logo.");
    } else {
      showSuccess("Logo atualizado com sucesso!");
    }
    setUploadingLogo(false);
  }, [updateRestaurant]);

  // --- Handlers de Horário ---
  const handleSaveHours = useCallback(async (newSchedule: WeekSchedule) => {
    if (!currentRestaurant.id) return;
    await updateRestaurant({ opening_hours: newSchedule });
    refetchProfile();
  }, [currentRestaurant.id, updateRestaurant, refetchProfile]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!restaurant) {
    // O wrapper deve lidar com isso, mas garantimos o fallback
    return <div className="p-4 text-red-500">Restaurante não encontrado.</div>;
  }

  return (
    <RestaurantAreaPageLayout title="Perfil do Restaurante" icon={Utensils} backPath="restaurant-area/home">
      <div className="relative w-full max-w-md mx-auto p-4">
        
        {/* Botão de Visualização Pública */}
        <div className="flex justify-end mb-4">
          <Button 
            variant="outline" 
            className="border-primary text-primary hover:bg-primary/5 rounded-xl"
            onClick={() => navigate(createPageUrl('restaurantProfile', { restaurantId: restaurant.id }))}
          >
            Ver Perfil Público <Eye className="w-4 h-4 ml-2" />
          </Button>
        </div>

        {/* 1. Card Principal (Logo, Nome, Plano) */}
        <MainProfileCard
          restaurantName={restaurant.name}
          logoUrl={restaurant.image_url}
          isPremium={isPremium}
          uploading={uploadingLogo}
          onLogoUploadComplete={handleLogoUploadComplete}
          restaurantId={restaurant.id}
        />
        
        <div className="space-y-6 mt-6">
          
          {/* 2. Card de Seguidores (Mock) */}
          <FollowerCountCard followerCount={1234} isPremium={isPremium} />

          {/* 3. Informações Básicas */}
          <BasicInfoSection
            restaurant={currentRestaurant}
            isPremium={isPremium}
            handleEditField={handleEditField}
            cnpjMask={cnpjMask}
            phoneMask={phoneMask}
            nameSchema={nameSchema}
            emailSchema={emailSchema}
            phoneSchema={phoneSchema}
            cnpjSchema={cnpjSchema}
          />

          {/* 4. Localização e Horários */}
          <LocationHoursSection
            restaurant={currentRestaurant}
            isPremium={isPremium}
            currentSchedule={currentSchedule}
            setIsAddressDialogOpen={setIsAddressDialogOpen}
            setIsHoursDialogOpen={setIsHoursDialogOpen}
          />

          {/* 5. Canais de Venda e Links (Premium Feature) */}
          <SalesChannelsSection
            restaurant={currentRestaurant}
            isPremium={isPremium}
            handleEditField={handleEditField}
            whatsappSchema={urlSchema}
            ifoodSchema={urlSchema}
            otherUrlSchema={urlSchema}
          />
          
          {/* 6. Gerenciamento de Conteúdo (Menu e Galeria) */}
          <ContentManagementSection navigate={navigate} isPremium={isPremium} />

          {/* 7. Assinatura e Suporte */}
          <SubscriptionSupportSection navigate={navigate} isPremium={isPremium} />
        </div>
      </div>

      {/* Dialogs */}
      {editConfig && (
        <EditFieldDialog
          isOpen={isEditDialogOpen}
          onClose={() => setIsEditDialogOpen(false)}
          title={editConfig.title}
          fieldName={editConfig.fieldName}
          currentValue={currentRestaurant[editConfig.key] as string || ''}
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
      
      <EditHoursDialog
        open={isHoursDialogOpen}
        onOpenChange={setIsHoursDialogOpen}
        currentSchedule={currentSchedule}
        onSave={handleSaveHours}
      />
    </RestaurantAreaPageLayout>
  );
}