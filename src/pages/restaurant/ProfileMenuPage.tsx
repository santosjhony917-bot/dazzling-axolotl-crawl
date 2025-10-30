import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useRestaurantProfile } from '@/hooks/useRestaurantProfile';
import { useAuthData } from '@/context/AuthContext';
import { Loader2, Utensils, Settings, Crown, MapPin, Clock, MessageSquare, HelpCircle, LogOut, Image as ImageIcon } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import RestaurantAreaPageLayout from '@/components/restaurant/RestaurantAreaPageLayout';
import MainProfileCard from '@/components/restaurant/profile/MainProfileCard';
import BasicInfoSection from '@/components/restaurant/profile/BasicInfoSection';
import LocationHoursSection from '@/components/restaurant/profile/LocationHoursSection';
import SalesChannelsSection from '@/components/restaurant/profile/SalesChannelsSection';
import ContentManagementSection from '@/components/restaurant/profile/ContentManagementSection';
import SubscriptionSupportSection from '@/components/restaurant/profile/SubscriptionSupportSection';
import EditFieldDialog from '@/components/EditFieldDialog';
import { EditAddressDialog } from '@/components/EditAddressDialog';
import { EditHoursDialog } from '@/components/EditHoursDialog';
import { showError } from '@/utils/toast';
import { z } from 'zod';
import { cnpjMask, phoneMask } from '@/utils/masks';
import { WeekSchedule } from '@/types/schedule';
import FollowerCountCard from '@/components/restaurant/profile/FollowerCountCard';

// Schemas de Validação
const nameSchema = z.string().min(2, "O nome deve ter pelo menos 2 caracteres.");
const emailSchema = z.string().email("E-mail inválido.");
const phoneSchema = z.string().regex(/^\(\d{2}\) \d{5}-\d{4}$/, "Telefone inválido (Ex: (83) 99999-9999)");
const cnpjSchema = z.string().regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, "CNPJ inválido (Ex: 00.000.000/0000-00)");
const urlSchema = z.string().url("URL inválida.").optional().or(z.literal(''));

export default function ProfileMenuPage() {
  const navigate = useNavigate();
  const { restaurant, isLoading: isRestaurantLoading, updateRestaurant, refetchProfile } = useRestaurantProfile();
  const { isPremium, isLoading: isAuthLoading } = useAuthData();
  
  // Estados de Diálogo
  const [isFieldDialogOpen, setIsFieldDialogOpen] = useState(false);
  const [isAddressDialogOpen, setIsAddressDialogOpen] = useState(false);
  const [isHoursDialogOpen, setIsHoursDialogOpen] = useState(false);
  const [editConfig, setEditConfig] = useState<{ key: string, title: string, fieldName: string, icon: React.ReactNode, validationSchema: z.ZodType<string>, type?: "text" | "tel" | "email", mask?: (value: string) => string, placeholder?: string } | null>(null);
  
  // Estados de Upload
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);

  const isLoading = isRestaurantLoading || isAuthLoading;

  // --- Handlers de Edição ---

  const handleEditField = useCallback((key: string, title: string, fieldName: string, icon: React.ReactNode, validationSchema: z.ZodType<string>, type?: "text" | "tel" | "email", mask?: (value: string) => string, placeholder?: string) => {
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
    setIsFieldDialogOpen(true);
  }, []);

  const handleSaveField = useCallback(async (value: string) => {
    if (!editConfig) return;
    
    // Aplica a máscara antes de salvar se houver uma
    const finalValue = editConfig.mask ? editConfig.mask(value) : value;
    
    const { error } = await updateRestaurant({ [editConfig.key]: finalValue });
    if (error) {
      showError(error);
      throw new Error(error); // Lança para o EditFieldDialog saber que falhou
    }
  }, [editConfig, updateRestaurant]);
  
  const handleSaveHours = useCallback(async (newSchedule: WeekSchedule) => {
    const { error } = await updateRestaurant({ opening_hours: newSchedule });
    if (error) {
      showError(error);
      throw new Error(error);
    }
    refetchProfile();
  }, [updateRestaurant, refetchProfile]);
  
  const handleLogoUploadComplete = useCallback(async (url: string) => {
    setUploadingLogo(true);
    const { error } = await updateRestaurant({ image_url: url });
    if (error) {
      showError(error);
    }
    setUploadingLogo(false);
    refetchProfile();
  }, [updateRestaurant, refetchProfile]);

  // --- Renderização ---

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!restaurant) {
    return <div className="p-4 text-red-500">Nenhum restaurante associado.</div>;
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
  
  // Dados para o diálogo de horários (garantindo o formato WeekSchedule)
  const defaultDaySchedule = { isOpen: false, slots: [{ start: '09:00', end: '18:00' }] };
  const currentSchedule: WeekSchedule = (restaurant.opening_hours as unknown as WeekSchedule) || {
    monday: defaultDaySchedule, tuesday: defaultDaySchedule, wednesday: defaultDaySchedule,
    thursday: defaultDaySchedule, friday: defaultDaySchedule, saturday: defaultDaySchedule,
    sunday: defaultDaySchedule,
  };

  return (
    <RestaurantAreaPageLayout title="Meu Perfil" icon={Utensils} backPath="restaurant-area/home">
      <div className="p-4 space-y-6">
        
        {/* 1. Card Principal (Logo e Nome) */}
        <MainProfileCard
          restaurantName={restaurant.name}
          logoUrl={restaurant.image_url}
          isPremium={isPremium}
          uploading={uploadingLogo}
          onLogoUploadComplete={handleLogoUploadComplete}
          restaurantId={restaurant.id}
        />
        
        {/* 2. Contagem de Seguidores (Apenas se for Premium) */}
        {isPremium && (
          <FollowerCountCard count={restaurant.followersCount || 0} />
        )}

        {/* 3. Informações Básicas (Nome, Categoria, Contato) */}
        <Card className="shadow-soft-xl border-none rounded-2xl p-6 bg-white">
          <CardContent className="p-0 space-y-6">
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
          </CardContent>
        </Card>
        
        {/* 4. Localização e Horários */}
        <Card className="shadow-soft-xl border-none rounded-2xl p-6 bg-white">
          <CardContent className="p-0 space-y-6">
            <LocationHoursSection
              restaurant={restaurant}
              isPremium={isPremium}
              currentSchedule={currentSchedule}
              setIsAddressDialogOpen={setIsAddressDialogOpen}
              setIsHoursDialogOpen={setIsHoursDialogOpen}
            />
          </CardContent>
        </Card>

        {/* 5. Canais de Venda (Links) */}
        <Card className="shadow-soft-xl border-none rounded-2xl p-6 bg-white">
          <CardContent className="p-0 space-y-6">
            <SalesChannelsSection
              restaurant={restaurant}
              isPremium={isPremium}
              handleEditField={handleEditField}
              whatsappSchema={urlSchema}
              ifoodSchema={urlSchema}
              otherUrlSchema={urlSchema}
            />
          </CardContent>
        </Card>
        
        {/* 6. Gerenciamento de Conteúdo (Menu e Galeria) */}
        <Card className="shadow-soft-xl border-none rounded-2xl p-6 bg-white">
          <CardContent className="p-0 space-y-6">
            <ContentManagementSection
              navigate={navigate}
              isPremium={isPremium}
            />
          </CardContent>
        </Card>

        {/* 7. Assinatura e Suporte */}
        <Card className="shadow-soft-xl border-none rounded-2xl p-6 bg-white">
          <CardContent className="p-0 space-y-6">
            <SubscriptionSupportSection
              navigate={navigate}
              isPremium={isPremium}
            />
          </CardContent>
        </Card>
      </div>

      {/* Diálogo de Edição de Campo Único */}
      {editConfig && (
        <EditFieldDialog
          isOpen={isFieldDialogOpen}
          onClose={() => setIsFieldDialogOpen(false)}
          title={editConfig.title}
          fieldName={editConfig.fieldName}
          currentValue={restaurant[editConfig.key as keyof Restaurant] as string || ''}
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
}