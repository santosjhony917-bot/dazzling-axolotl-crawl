import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthData } from '@/context/AuthContext';
import { useRestaurantProfile } from '@/hooks/useRestaurantProfile';
import { Loader2, Settings, Utensils, Crown } from 'lucide-react';
import RestaurantAreaPageLayout from '@/components/restaurant/RestaurantAreaPageLayout';
import MainProfileCard from '@/components/restaurant/profile/MainProfileCard';
import BasicInfoSection from '@/components/restaurant/profile/BasicInfoSection';
import LocationHoursSection from '@/components/restaurant/profile/LocationHoursSection';
import SalesChannelsSection from '@/components/restaurant/profile/SalesChannelsSection';
import SubscriptionSupportSection from '@/components/restaurant/profile/SubscriptionSupportSection';
import ContentManagementSection from '@/components/restaurant/profile/ContentManagementSection'; // NOVO IMPORT
import { Separator } from '@/components/ui/separator';
import { showError, showSuccess } from '@/utils/toast';
import { z } from 'zod';
import { cnpjMask, phoneMask } from '@/utils/masks';
import EditClientFieldDialog from '@/components/EditClientFieldDialog'; // CORRIGIDO: Importando o componente correto
import { EditAddressDialog } from '@/components/EditAddressDialog';
import { EditHoursDialog } from '@/components/EditHoursDialog';
import { WeekSchedule } from '@/types/schedule';
import { DEFAULT_SCHEDULE } from '@/constants/schedule';
import { Restaurant } from '@/types/supabase'; // Importando o tipo base
import { PublicRestaurantData } from '@/types/restaurant'; // Importando o tipo estendido

// Schemas de validação
const nameSchema = z.string().min(2, "O nome deve ter pelo menos 2 caracteres.");
const emailSchema = z.string().email("E-mail inválido.");
const phoneSchema = z.string().regex(/^\(\d{2}\) \d{4,5}-\d{4}$/, "Telefone inválido (Ex: (83) 99999-9999)").optional().or(z.literal(''));
const cnpjSchema = z.string().regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, "CNPJ inválido (XX.XXX.XXX/XXXX-XX)").optional().or(z.literal(''));
const urlSchema = z.string().url("URL inválida.").optional().or(z.literal(''));

export default function ProfileSettingsPage() {
  const navigate = useNavigate();
  const { restaurant, isLoading: authLoading, isPremium, refetchProfile } = useAuthData();
  const { updateRestaurant } = useRestaurantProfile(restaurant);
  
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editConfig, setEditConfig] = useState<{ key: string, title: string, fieldName: string, icon: React.ReactNode, validationSchema: z.ZodType<string>, type?: "text" | "tel" | "email", mask?: (value: string) => string, placeholder?: string } | null>(null);
  
  const [isAddressDialogOpen, setIsAddressDialogOpen] = useState(false);
  const [isHoursDialogOpen, setIsHoursDialogOpen] = useState(false);
  
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const isLoading = authLoading || !restaurant;

  const handleEditField = useCallback((key: string, title: string, fieldName: string, icon: React.ReactNode, validationSchema: z.ZodType<string>, type?: "text" | "tel" | "email", mask?: (value: string) => string, placeholder?: string) => {
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
  }, [isPremium]);

  const handleSaveField = useCallback(async (value: string) => {
    if (!editConfig) return;
    
    // Remove máscara antes de salvar no DB
    const cleanedValue = editConfig.mask ? value.replace(/\D/g, '') : value;
    
    // CORREÇÃO: updateRestaurant agora retorna { error: string | null }
    const { error } = await updateRestaurant({ [editConfig.key]: cleanedValue });
    
    if (error) {
      showError(error);
    } else {
      showSuccess("Campo atualizado com sucesso!");
      refetchProfile();
    }
  }, [editConfig, updateRestaurant, refetchProfile]);
  
  const handleLogoUploadComplete = useCallback(async (url: string) => {
    setUploadingLogo(true);
    const cacheBustedUrl = `${url}?t=${Date.now()}`;
    // CORREÇÃO: updateRestaurant agora retorna { error: string | null }
    const { error } = await updateRestaurant({ image_url: cacheBustedUrl });
    if (error) {
      showError(error);
    } else {
      showSuccess("Logo atualizado com sucesso!");
      refetchProfile();
    }
    setUploadingLogo(false);
  }, [updateRestaurant, refetchProfile]);
  
  const handleSaveHours = useCallback(async (newSchedule: WeekSchedule) => {
    // CORREÇÃO: updateRestaurant agora retorna { error: string | null }
    const { error } = await updateRestaurant({ opening_hours: newSchedule as any });
    if (error) {
      showError(error);
    } else {
      showSuccess("Horários atualizados com sucesso!");
      refetchProfile();
    }
  }, [updateRestaurant, refetchProfile]);


  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  const currentSchedule = (restaurant?.opening_hours || DEFAULT_SCHEDULE) as unknown as WeekSchedule;
  
  // CORREÇÃO ERRO 4: Criando um objeto que satisfaça PublicRestaurantData para SalesChannelsSection
  const publicRestaurantData: PublicRestaurantData = {
    ...(restaurant as Restaurant),
    is_favorite: false, // Mocked
    followers_count: 0, // Mocked
    addressSummary: restaurant?.city || '', // Mocked
    menu_categories: [], // Mocked
    gallery_images: [], // Mocked
    logoUrl: restaurant?.image_url || '', // Mocked
  };

  return (
    <RestaurantAreaPageLayout title="Configurações do Perfil" icon={Settings} backPath="restaurant-area/home">
      <div className="p-4 space-y-8 max-w-md mx-auto">
        
        {/* 1. Card Principal (Logo e Nome) */}
        <MainProfileCard
          restaurantName={restaurant?.name || "Meu Restaurante"}
          logoUrl={restaurant?.image_url}
          isPremium={isPremium}
          uploading={uploadingLogo}
          onLogoUploadComplete={handleLogoUploadComplete}
          restaurantId={restaurant?.id || 'temp'}
        />
        
        {/* 2. Informações Básicas */}
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
        
        <Separator />

        {/* 3. Localização e Horários */}
        <LocationHoursSection
          restaurant={restaurant}
          isPremium={isPremium}
          currentSchedule={currentSchedule}
          setIsAddressDialogOpen={setIsAddressDialogOpen}
          setIsHoursDialogOpen={setIsHoursDialogOpen}
        />
        
        <Separator />

        {/* 4. GESTÃO DE CONTEÚDO (NOVA SEÇÃO) */}
        <ContentManagementSection
          navigate={navigate}
          isPremium={isPremium}
          restaurantId={restaurant?.id || ''}
          restaurantName={restaurant?.name || 'Meu Restaurante'}
        />
        
        <Separator />

        {/* 5. Canais de Venda */}
        <SalesChannelsSection
          restaurant={publicRestaurantData} // CORRIGIDO ERRO 4: Passando o tipo PublicRestaurantData
        />
        
        <Separator />

        {/* 6. Assinatura e Suporte */}
        <SubscriptionSupportSection navigate={navigate} isPremium={isPremium} />
        
      </div>
      
      {/* Dialogs */}
      {editConfig && (
        <EditClientFieldDialog // CORRIGIDO ERRO 5: Usando o componente correto
          isOpen={isEditDialogOpen}
          onClose={() => setIsEditDialogOpen(false)}
          title={editConfig.title}
          fieldName={editConfig.fieldName}
          currentValue={restaurant?.[editConfig.key as keyof Restaurant] as string || ''} // CORRIGIDO ERRO 5: Usando o tipo Restaurant
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
        restaurantId={restaurant?.id || ''}
        currentAddress={{
          address: restaurant?.address || '',
          city: restaurant?.city || '',
          state: restaurant?.state || '',
          cep: restaurant?.cep || '',
          neighborhood: restaurant?.neighborhood || '',
          latitude: restaurant?.latitude || null,
          longitude: restaurant?.longitude || null,
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