import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthData } from '@/context/AuthContext';
import { useRestaurantProfile } from '@/hooks/useRestaurantProfile';
import { Loader2, Settings, Utensils, Crown, MapPin, Clock, Link2, Users, Calendar } from 'lucide-react';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '@/components/ui/accordion';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';
import RestaurantAreaPageLayout from '@/components/restaurant/RestaurantAreaPageLayout';
import MainProfileCard from '@/components/restaurant/profile/MainProfileCard';
import BasicInfoSection from '@/components/restaurant/profile/BasicInfoSection';
import LocationHoursSection from '@/components/restaurant/profile/LocationHoursSection';
import SalesChannelsSection from '@/components/restaurant/profile/SalesChannelsSection';
import SubscriptionSupportSection from '@/components/restaurant/profile/SubscriptionSupportSection';
import ContentManagementSection from '@/components/restaurant/profile/ContentManagementSection';
import NavCardItem from '@/components/NavCardItem';
import { Separator } from '@/components/ui/separator';
import { showError, showSuccess } from '@/utils/toast';
import { z } from 'zod';
import { cnpjMask, phoneMask } from '@/utils/masks';
import EditClientFieldDialog from '@/components/EditClientFieldDialog';
import { EditAddressDialog } from '@/components/EditAddressDialog';
import { EditHoursDialog } from '@/components/EditHoursDialog';
import PaymentMethodsDialog from '@/components/restaurant/PaymentMethodsDialog';
import SocialNetworksDialog from '@/components/restaurant/SocialNetworksDialog';
import SalesChannelsDialog from '@/components/restaurant/SalesChannelsDialog';
import { WeekSchedule } from '@/types/schedule';
import { DEFAULT_SCHEDULE } from '@/constants/schedule';
import { Restaurant } from '@/types/supabase';
import { PublicRestaurantData, SocialNetworkLink } from '@/types/restaurant';
import { getRestaurantOpenStatus } from '@/lib/schedule';

// Schemas de validação
const nameSchema = z.string().min(2, "O nome deve ter pelo menos 2 caracteres.");
const emailSchema = z.string().email("E-mail inválido.");
const phoneSchema = z.string().regex(/^\(\d{2}\) \d{4,5}-\d{4}$/, "Telefone inválido (Ex: (83) 99999-9999)").optional().or(z.literal(''));
const cnpjSchema = z.string().regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, "CNPJ inválido (XX.XXX.XXX/XXXX-XX)").optional().or(z.literal(''));
const urlSchema = z.string().url("URL inválida.").optional().or(z.literal(''));

export default function ProfileSettingsPage() {
  const navigate = useNavigate();
  const { restaurant, isLoading: authLoading, isRestaurantLoading, isPremium, refetchProfile, refetchRestaurant } = useAuthData();
  const { updateRestaurant } = useRestaurantProfile(restaurant?.id);
  
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editConfig, setEditConfig] = useState<{ key: string, title: string, fieldName: string, icon: React.ReactNode, validationSchema: z.ZodType<string>, type?: "text" | "tel" | "email", mask?: (value: string) => string, placeholder?: string } | null>(null);
  
  const [isAddressDialogOpen, setIsAddressDialogOpen] = useState(false);
  const [isHoursDialogOpen, setIsHoursDialogOpen] = useState(false);
  const [isPaymentMethodsDialogOpen, setIsPaymentMethodsDialogOpen] = useState(false);
  const [isSocialNetworksDialogOpen, setIsSocialNetworksDialogOpen] = useState(false);
  const [isSalesChannelsDialogOpen, setIsSalesChannelsDialogOpen] = useState(false);
  
  const [uploadingLogo, setUploadingLogo] = useState(false);

  const isLoading = authLoading || isRestaurantLoading;

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <RestaurantAreaPageLayout title="Configurações" icon={Settings} backPath="home">
        <div className="p-6 text-center max-w-md mx-auto space-y-6 mt-10">
          <div className="w-16 h-16 bg-primary/10 rounded-2xl flex items-center justify-center mx-auto">
            <Settings className="w-8 h-8 text-primary" />
          </div>
          <h2 className="text-2xl font-bold text-primary">Restaurante não vinculado</h2>
          <p className="text-gray-600 text-sm">
            Esta conta não possui nenhum restaurante cadastrado ou vinculado. Se você possui um código de convite, faça a reivindicação do seu restaurante.
          </p>
          <div className="space-y-3">
            <Button onClick={() => navigate('/restaurant-area/claim')} className="w-full h-12 rounded-xl">
              Vincular ou Reivindicar Restaurante
            </Button>
            <Button variant="outline" onClick={() => navigate('/welcome')} className="w-full h-12 rounded-xl">
              Voltar ao Início
            </Button>
          </div>
        </div>
      </RestaurantAreaPageLayout>
    );
  }

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
    
    const { error } = await updateRestaurant({ [editConfig.key]: cleanedValue });
    
    if (error) {
      showError(error);
    } else {
      showSuccess("Campo atualizado com sucesso!");
      refetchRestaurant();
    }
  }, [editConfig, updateRestaurant, refetchRestaurant]);
  
  const handleLogoUploadComplete = useCallback(async (url: string) => {
    setUploadingLogo(true);
    const cacheBustedUrl = url.startsWith('data:') ? url : `${url}?t=${Date.now()}`;
    const { error } = await updateRestaurant({ image_url: cacheBustedUrl });
    if (error) {
      showError(error);
    } else {
      showSuccess("Logo atualizado com sucesso!");
      refetchRestaurant();
    }
    setUploadingLogo(false);
  }, [updateRestaurant, refetchRestaurant]);
  
  const handleSaveHours = useCallback(async (newSchedule: WeekSchedule) => {
    const { error } = await updateRestaurant({ opening_hours: newSchedule as any });
    if (error) {
      showError(error);
    } else {
      showSuccess("Horários atualizados com sucesso!");
      refetchRestaurant();
    }
  }, [updateRestaurant, refetchRestaurant]);
  
  const handleSavePaymentMethods = useCallback(async (newMethods: string[]) => {
    const { error } = await updateRestaurant({ payment_methods: newMethods as any });
    if (error) {
      showError(error);
    } else {
      showSuccess("Formas de pagamento atualizadas com sucesso!");
      refetchRestaurant();
    }
  }, [updateRestaurant, refetchRestaurant]);
  
  // NOVO HANDLER: Salvar Redes Sociais
  const handleSaveSocialNetworks = useCallback(async (newLinks: SocialNetworkLink[]) => {
    const { error } = await updateRestaurant({ social_networks: newLinks as any });
    if (error) {
      showError(error);
    } else {
      showSuccess("Redes sociais atualizadas com sucesso!");
      refetchRestaurant();
    }
  }, [updateRestaurant, refetchRestaurant]);

  // NOVO HANDLER: Salvar Canais de Venda
  const handleSaveSalesChannels = useCallback(async (data: { whatsapp_url: string | null; ifood_url: string | null; other_url: string | null; external_url: string | null }) => {
    const { error } = await updateRestaurant(data);
    if (error) {
      showError(error);
    } else {
      showSuccess("Canais de venda atualizados com sucesso!");
      refetchRestaurant();
      setIsSalesChannelsDialogOpen(false); // Fechar o diálogo após salvar
    }
  }, [updateRestaurant, refetchRestaurant]);
  
  const currentSchedule = (restaurant?.opening_hours || DEFAULT_SCHEDULE) as unknown as WeekSchedule;
  const openStatus = getRestaurantOpenStatus(currentSchedule);
  
  // CORREÇÃO 2: Usando 'as unknown as string[]'
  const currentPaymentMethods = (restaurant?.payment_methods as string[] | null) || ['PIX', 'Crédito', 'Débito', 'Dinheiro'];
  
  // CORREÇÃO 3: Usando 'as unknown as SocialNetworkLink[]'
  const currentSocialLinks = (restaurant?.social_networks as unknown as SocialNetworkLink[] | null) || [];

  const publicRestaurantData: PublicRestaurantData = {
    ...(restaurant as Restaurant),
    opening_hours: currentSchedule,
    payment_methods: currentPaymentMethods,
    social_networks: currentSocialLinks, // ADICIONADO
    is_favorite: false,
    followers_count: 0,
    addressSummary: restaurant?.city || '',
    menu_categories: [],
    gallery_images: [],
    logoUrl: restaurant?.image_url || '', 
    isOpen: openStatus.isOpen,
    statusText: openStatus.statusText,
    nextOpenTime: openStatus.nextOpenTime,
    other_url_label: restaurant?.other_url_label || null, // Adicionado other_url_label
  };

  return (
    <RestaurantAreaPageLayout title="Configurações do Perfil" icon={Settings} backPath="home">
      <div className="p-4 space-y-6 max-w-md mx-auto">
        
        {/* 1. Card Principal (Logo e Nome) - Fixado acima das sanfonas */}
        <MainProfileCard
          restaurantName={restaurant?.name || "Meu Restaurante"}
          logoUrl={restaurant?.image_url}
          isPremium={isPremium}
          uploading={uploadingLogo}
          onLogoUploadComplete={handleLogoUploadComplete}
          restaurantId={restaurant?.id || 'temp'}
        />

        <Accordion type="single" collapsible defaultValue="general" className="w-full space-y-4">
          
          {/* 1. Informações Básicas (Geral) */}
          <AccordionItem value="general" className="bg-white border border-gray-200 rounded-2xl shadow-soft-md px-4 overflow-hidden border-none">
            <AccordionTrigger className="hover:no-underline font-extrabold text-lg text-primary py-4 [&[data-state=open]]:pb-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-highlight/10 rounded-lg flex items-center justify-center">
                  <Utensils className="w-4 h-4 text-highlight" />
                </div>
                <span>Dados do Restaurante</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-5">
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
            </AccordionContent>
          </AccordionItem>

          {/* 2. Localização e Horários */}
          <AccordionItem value="location" className="bg-white border border-gray-200 rounded-2xl shadow-soft-md px-4 overflow-hidden border-none">
            <AccordionTrigger className="hover:no-underline font-extrabold text-lg text-primary py-4 [&[data-state=open]]:pb-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-highlight/10 rounded-lg flex items-center justify-center">
                  <MapPin className="w-4 h-4 text-highlight" />
                </div>
                <span>Localização e Horários</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-5">
              <LocationHoursSection
                restaurant={restaurant}
                isPremium={isPremium}
                currentSchedule={currentSchedule}
                setIsAddressDialogOpen={setIsAddressDialogOpen}
                setIsHoursDialogOpen={setIsHoursDialogOpen}
              />
            </AccordionContent>
          </AccordionItem>

          {/* 3. Gestão de Conteúdo e Links */}
          <AccordionItem value="content" className="bg-white border border-gray-200 rounded-2xl shadow-soft-md px-4 overflow-hidden border-none">
            <AccordionTrigger className="hover:no-underline font-extrabold text-lg text-primary py-4 [&[data-state=open]]:pb-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-highlight/10 rounded-lg flex items-center justify-center">
                  <Link2 className="w-4 h-4 text-highlight" />
                </div>
                <span>Conteúdo e Links</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-5">
              <ContentManagementSection
                navigate={navigate}
                isPremium={isPremium}
                restaurantId={restaurant?.id || ''}
                restaurantName={restaurant?.name || 'Meu Restaurante'}
                setIsPaymentMethodsDialogOpen={setIsPaymentMethodsDialogOpen}
                setIsSocialNetworksDialogOpen={setIsSocialNetworksDialogOpen}
                setIsSalesChannelsDialogOpen={setIsSalesChannelsDialogOpen}
              />
            </AccordionContent>
          </AccordionItem>

          {/* 4. Plano e Suporte */}
          <AccordionItem value="subscription" className="bg-white border border-gray-200 rounded-2xl shadow-soft-md px-4 overflow-hidden border-none">
            <AccordionTrigger className="hover:no-underline font-extrabold text-lg text-primary py-4 [&[data-state=open]]:pb-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-highlight/10 rounded-lg flex items-center justify-center">
                  <Crown className="w-4 h-4 text-highlight" />
                </div>
                <span>Plano e Suporte</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-5">
              <SubscriptionSupportSection navigate={navigate} isPremium={isPremium} />
            </AccordionContent>
          </AccordionItem>

          {/* 5. Social e Happy Hour */}
          <AccordionItem value="social" className="bg-white border border-gray-200 rounded-2xl shadow-soft-md px-4 overflow-hidden border-none">
            <AccordionTrigger className="hover:no-underline font-extrabold text-lg text-primary py-4 [&[data-state=open]]:pb-2">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 bg-highlight/10 rounded-lg flex items-center justify-center">
                  <Users className="w-4 h-4 text-highlight" />
                </div>
                <span>Social e Happy Hour</span>
              </div>
            </AccordionTrigger>
            <AccordionContent className="pt-2 pb-5 space-y-3">
              <NavCardItem 
                title="Meus Amigos" 
                description="Adicione amigos e gerencie sua lista de contatos."
                icon={Users} 
                onClick={() => navigate('/friends')}
                isPremium={isPremium}
              />
              <NavCardItem 
                title="Happy Hours" 
                description="Crie ou participe de happy hours e votações."
                icon={Calendar} 
                onClick={() => navigate('/happy-hours')}
                isPremium={isPremium}
              />
            </AccordionContent>
          </AccordionItem>

        </Accordion>
      </div>
      
      {/* Dialogs */}
      {editConfig && (
        <EditClientFieldDialog
          isOpen={isEditDialogOpen}
          onClose={() => setIsEditDialogOpen(false)}
          title={editConfig.title}
          fieldName={editConfig.fieldName}
          currentValue={restaurant?.[editConfig.key as keyof Restaurant] as string || ''}
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
      
      <PaymentMethodsDialog
        isOpen={isPaymentMethodsDialogOpen}
        onClose={() => setIsPaymentMethodsDialogOpen(false)}
        currentMethods={currentPaymentMethods}
        onSave={handleSavePaymentMethods}
        isLoading={false}
      />
      
      {/* NOVO DIALOG: Redes Sociais */}
      <SocialNetworksDialog
        isOpen={isSocialNetworksDialogOpen}
        onClose={() => setIsSocialNetworksDialogOpen(false)}
        currentLinks={currentSocialLinks}
        onSave={handleSaveSocialNetworks}
        isLoading={false}
      />

      {/* NOVO DIALOG: Canais de Venda */}
      <SalesChannelsDialog
        isOpen={isSalesChannelsDialogOpen}
        onClose={() => setIsSalesChannelsDialogOpen(false)}
        initialWhatsappUrl={restaurant?.whatsapp_url || null}
        initialIfoodUrl={restaurant?.ifood_url || null}
        initialOtherUrl={restaurant?.other_url || null}
        initialExternalUrl={restaurant?.external_url || null}
        onSave={handleSaveSalesChannels}
        isLoading={false}
      />
    </RestaurantAreaPageLayout>
  );
}