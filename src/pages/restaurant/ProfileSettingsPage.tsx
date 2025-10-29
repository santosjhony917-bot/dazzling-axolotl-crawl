"use client";

import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRestaurantProfile } from '@/hooks/useRestaurantProfile';
import { useAuthData } from '@/context/AuthContext';
import { Loader2, Utensils, Eye } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { Restaurant } from '@/types/supabase'; // Corrected import
import { z } from 'zod';
import { cnpjMask, phoneMask } from '@/utils/masks';
import RestaurantAreaPageLayout from '@/components/restaurant/RestaurantAreaPageLayout';
import MainProfileCard from '@/components/restaurant/profile/MainProfileCard';
import BasicInfoSection from '@/components/restaurant/profile/BasicInfoSection';
import LocationHoursSection from '@/components/restaurant/profile/LocationHoursSection';
import SalesChannelsSection from '@/components/restaurant/profile/SalesChannelsSection';
import SubscriptionCard from '@/components/restaurant/profile/SubscriptionCard';
import SubscriptionSupportSection from '@/components/restaurant/profile/SubscriptionSupportSection';
import FollowerCountCard from '@/components/restaurant/profile/FollowerCountCard';
import EditFieldDialog from '@/components/EditFieldDialog';
import { EditAddressDialog } from '@/components/EditAddressDialog';
import { EditHoursDialog } from '@/components/EditHoursDialog';
import { WeekSchedule } from '@/types/schedule';
import { Button } from '@/components/ui/button';
import ContentManagementSection from '@/components/restaurant/profile/ContentManagementSection'; // Importando a seção de conteúdo

// --- Schemas de Validação ---
const nameSchema = z.string().min(3, "O nome deve ter pelo menos 3 caracteres.");
const emailSchema = z.string().email("E-mail inválido.");
const phoneSchema = z.string().regex(/^\(\d{2}\) \d{5}-\d{4}$/, "Telefone inválido (Ex: (83) 99999-9999)");
const cnpjSchema = z.string().regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, "CNPJ inválido (Ex: XX.XXX.XXX/XXXX-XX)");
const urlSchema = z.string().url("URL inválida.").optional().or(z.literal(''));

// --- Tipos de Diálogo ---
interface EditDialogConfig {
  key: keyof Restaurant;
  title: string;
  fieldName: string;
  icon: React.ReactNode;
  validationSchema: z.ZodType<string>;
  type?: "text" | "tel" | "email";
  mask?: (value: string) => string;
  placeholder?: string;
}

const ProfileSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { restaurant, isLoading: profileLoading, updateRestaurant, refetchProfile } = useRestaurantProfile();
  const { isPremium, isLoading: authLoading } = useAuthData();

  // Estados para Diálogos
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editConfig, setEditConfig] = useState<EditDialogConfig | null>(null);
  const [isAddressDialogOpen, setIsAddressDialogOpen] = useState(false);
  const [isHoursDialogOpen, setIsHoursDialogOpen] = useState(false);
  
  // Estados de Upload
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const isLoading = profileLoading || authLoading;

  // --- Handlers de Edição ---

  const handleEditField = useCallback((
    key: keyof Restaurant, 
    title: string, 
    fieldName: string, 
    icon: React.ReactNode, 
    validationSchema: z.ZodType<string>, 
    type: "text" | "tel" | "email" = "text", 
    mask?: (value: string) => string, 
    placeholder?: string
  ) => {
    // A lógica de bloqueio para Canais de Venda agora está no componente SalesChannelsSection
    setEditConfig({ key, title, fieldName, icon, validationSchema, type, mask, placeholder });
    setIsEditDialogOpen(true);
  }, [isPremium]);

  const handleSaveField = useCallback(async (value: string) => {
    if (!editConfig || !restaurant) return;
    
    // Aplica a máscara antes de salvar, se houver (ex: CNPJ, Telefone)
    const finalValue = editConfig.mask ? editConfig.mask(value) : value;
    
    const updates = { [editConfig.key]: finalValue };
    const result = await updateRestaurant(updates);
    
    if (result.error) {
      toast.error(`Falha ao salvar ${editConfig.fieldName}: ${result.error}`);
    } else {
      toast.success(`${editConfig.fieldName} atualizado!`);
    }
  }, [editConfig, restaurant, updateRestaurant]);

  const handleLogoUploadComplete = useCallback(async (url: string) => {
    setUploadingLogo(true);
    const cacheBustedUrl = `${url}?t=${Date.now()}`;
    const result = await updateRestaurant({ image_url: cacheBustedUrl });
    if (result.error) {
      toast.error(`Falha ao salvar URL do logo: ${result.error}`);
    }
    setUploadingLogo(false);
  }, [updateRestaurant]);

  const handleSaveHours = useCallback(async (newSchedule: WeekSchedule) => {
    const result = await updateRestaurant({ opening_hours: newSchedule as any });
    if (result.error) {
      toast.error(`Falha ao salvar horários: ${result.error}`);
      throw new Error(result.error);
    }
    toast.success("Horários de funcionamento atualizados!");
  }, [updateRestaurant]);

  // --- Renderização ---

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!restaurant) {
    return <div className="p-4 text-red-500">Nenhum restaurante associado ao usuário.</div>;
  }
  
  // Dados para os diálogos de endereço
  const currentAddressData = {
    address: restaurant.address || '',
    city: restaurant.city || '',
    state: restaurant.state || '',
    cep: restaurant.cep || '',
    neighborhood: restaurant.neighborhood || '',
    latitude: restaurant.latitude,
    longitude: restaurant.longitude,
  };
  
  // Dados para o diálogo de horários
  const defaultSchedule: WeekSchedule = {
    monday: { isOpen: true, slots: [{ start: '08:00', end: '18:00' }] },
    tuesday: { isOpen: true, slots: [{ start: '08:00', end: '18:00' }] },
    wednesday: { isOpen: true, slots: [{ start: '08:00', end: '18:00' }] },
    thursday: { isOpen: true, slots: [{ start: '08:00', end: '18:00' }] },
    friday: { isOpen: true, slots: [{ start: '08:00', end: '18:00' }] },
    saturday: { isOpen: false, slots: [] },
    sunday: { isOpen: false, slots: [] },
  };
  const currentSchedule = (restaurant.opening_hours as unknown as WeekSchedule) || defaultSchedule;
  
  const handleViewPublicProfile = () => {
    navigate(`/restaurant/${restaurant.id}`);
  };

  return (
    <RestaurantAreaPageLayout 
      title="Configurações do Perfil" 
      icon={Utensils} 
      backPath="restaurant-area/home"
      actions={
        <Button 
          variant="outline" 
          onClick={handleViewPublicProfile}
          className="flex items-center gap-2"
        >
          <Eye className="w-4 h-4" />
          Ver Perfil Público
        </Button>
      }
    >
      <div className="p-4 space-y-8">
        
        {/* 1. Card Principal (Logo e Nome) */}
        <MainProfileCard
          restaurantName={restaurant.name}
          logoUrl={restaurant.image_url}
          isPremium={isPremium}
          uploading={uploadingLogo}
          onLogoUploadComplete={handleLogoUploadComplete}
          restaurantId={restaurant.id}
        />
        
        {/* 2. Estatísticas (Mocked/Followers) */}
        <FollowerCountCard count={restaurant.followersCount || 0} />

        {/* 3. Informações Básicas */}
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

        {/* 4. Localização e Horários */}
        <LocationHoursSection
          restaurant={restaurant}
          isPremium={isPremium}
          currentSchedule={currentSchedule}
          setIsAddressDialogOpen={setIsAddressDialogOpen}
          setIsHoursDialogOpen={setIsHoursDialogOpen}
        />

        {/* 5. Canais de Venda (Premium) */}
        <SalesChannelsSection
          restaurant={restaurant}
          isPremium={isPremium}
          handleEditField={handleEditField}
          whatsappSchema={urlSchema}
          ifoodSchema={urlSchema}
          otherUrlSchema={urlSchema}
        />
        
        {/* 6. Gerenciamento de Conteúdo (Menu, Galeria) */}
        <ContentManagementSection navigate={navigate} isPremium={isPremium} />
        
        {/* 7. Assinatura (Substitui o Card de Upgrade) */}
        <SubscriptionCard isPremium={isPremium} />
        
        {/* 8. Suporte e Sair */}
        <SubscriptionSupportSection navigate={navigate} isPremium={isPremium} />
        
      </div>

      {/* --- Diálogos de Edição --- */}
      
      {/* Diálogo de Edição de Campo Único */}
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
      
      {/* Diálogo de Edição de Endereço */}
      <EditAddressDialog
        open={isAddressDialogOpen}
        onOpenChange={setIsAddressDialogOpen}
        restaurantId={restaurant.id}
        currentAddress={currentAddressData}
        onSave={refetchProfile}
      />
      
      {/* Diálogo de Edição de Horários */}
      <EditHoursDialog
        open={isHoursDialogOpen}
        onOpenChange={setIsHoursDialogOpen}
        currentSchedule={currentSchedule}
        onSave={handleSaveHours}
      />
    </RestaurantAreaPageLayout>
  );
};

export default ProfileSettingsPage;