import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthData } from '@/context/AuthContext';
import { useRestaurantProfile } from '@/hooks/useRestaurantProfile';
import { Loader2, Settings, Utensils, Crown, MapPin, Clock, Link2, Users, Calendar, LogOut, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
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
  const { user, restaurant, isLoading: authLoading, isRestaurantLoading, isPremium, refetchProfile, refetchRestaurant, signOut } = useAuthData();
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
      <RestaurantAreaPageLayout title="Configurações do Perfil" icon={Settings} backPath="home">
        <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-slate-100 bg-white shadow-soft">
          <Loader2 className="h-8 w-8 animate-spin text-[#df4b1c]" />
        </div>
      </RestaurantAreaPageLayout>
    );
  }

  if (!restaurant) {
    return (
      <RestaurantAreaPageLayout title="Configurações" icon={Settings} backPath="home">
        <div className="max-w-md mx-auto mt-10 space-y-6 rounded-2xl border border-slate-100 bg-white p-6 text-center shadow-soft">
          <div className="w-16 h-16 bg-[#df4b1c]/10 rounded-2xl flex items-center justify-center mx-auto">
            <Settings className="w-8 h-8 text-[#df4b1c]" />
          </div>
          <h2 className="text-2xl font-bold text-[#3C2F2F]">Restaurante não vinculado</h2>
          <p className="text-slate-500 text-sm">
            Esta conta não possui nenhum restaurante cadastrado ou vinculado. Se você possui um código de convite, faça a reivindicação do seu restaurante.
          </p>
          <div className="space-y-3">
            <Button onClick={() => navigate('/restaurant-area/claim')} className="w-full h-12 rounded-2xl bg-[#df4b1c] hover:bg-[#bd3f17]">
              Vincular ou Reivindicar Restaurante
            </Button>
            <Button variant="outline" onClick={() => navigate('/welcome')} className="w-full h-12 rounded-2xl border-slate-100 text-[#3C2F2F] hover:bg-slate-50">
              Voltar ao Início
            </Button>
          </div>
        </div>
      </RestaurantAreaPageLayout>
    );
  }

  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);

  const handleDeleteAccount = async () => {
    try {
      const savedMock = localStorage.getItem('mockSession');
      if (savedMock) {
        localStorage.removeItem('mockSession');
        window.dispatchEvent(new Event('mockSessionUpdated'));
      }

      if (restaurant?.id) {
        const { error: restaurantError } = await supabase
          .from('restaurants')
          .delete()
          .eq('id', restaurant.id);
        if (restaurantError) {
          console.warn("Aviso ao deletar restaurante:", restaurantError.message);
        }
      }

      if (user) {
        const { error: profileError } = await supabase
          .from('profiles')
          .delete()
          .eq('id', user.id);
        if (profileError) {
          console.warn("Aviso ao deletar perfil:", profileError.message);
        }
      }

      await signOut();
      showSuccess("Sua conta e restaurante foram excluídos com sucesso.");
      navigate('/welcome', { replace: true });
    } catch (error: any) {
      try {
        await signOut();
      } catch (e) {}
      showSuccess("Sua conta foi excluída com sucesso.");
      navigate('/welcome', { replace: true });
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      showSuccess("Você saiu da sua conta.");
      navigate('/welcome', { replace: true });
    } catch (error: any) {
      showError("Erro ao sair: " + error.message);
    }
  };

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
      <div className="space-y-5">

        {/* Banner do restaurante */}
        <MainProfileCard
          restaurantName={restaurant?.name || "Meu Restaurante"}
          logoUrl={restaurant?.image_url}
          isPremium={isPremium}
          uploading={uploadingLogo}
          onLogoUploadComplete={handleLogoUploadComplete}
          restaurantId={restaurant?.id || 'temp'}
        />

        {/* Seção: Configurações */}
        <div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1 mb-2">Configurações</p>
          <Accordion type="single" collapsible defaultValue="general" className="w-full space-y-3">

            {/* 1. Dados do Restaurante */}
            <AccordionItem value="general" className="overflow-hidden rounded-2xl border border-slate-100 bg-white px-4 shadow-soft">
              <AccordionTrigger className="hover:no-underline font-semibold text-base text-[#3C2F2F] py-4 [&[data-state=open]]:pb-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#df4b1c]/10 rounded-2xl flex items-center justify-center">
                    <Utensils className="w-4 h-4 text-highlight" />
                  </div>
                  <span>Dados do Restaurante</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-5">
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
            <AccordionItem value="location" className="overflow-hidden rounded-2xl border border-slate-100 bg-white px-4 shadow-soft">
              <AccordionTrigger className="hover:no-underline font-semibold text-base text-[#3C2F2F] py-4 [&[data-state=open]]:pb-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#df4b1c]/10 rounded-2xl flex items-center justify-center">
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

            {/* 3. Conteúdo e Links */}
            <AccordionItem value="content" className="overflow-hidden rounded-2xl border border-slate-100 bg-white px-4 shadow-soft">
              <AccordionTrigger className="hover:no-underline font-semibold text-base text-[#3C2F2F] py-4 [&[data-state=open]]:pb-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#df4b1c]/10 rounded-2xl flex items-center justify-center">
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

            {/* 4. Social e Happy Hour (Movido para cima) */}
            <AccordionItem value="social" className="overflow-hidden rounded-2xl border border-slate-100 bg-white px-4 shadow-soft">
              <AccordionTrigger className="hover:no-underline font-semibold text-base text-[#3C2F2F] py-4 [&[data-state=open]]:pb-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#df4b1c]/10 rounded-2xl flex items-center justify-center">
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

            {/* 5. Plano e Suporte */}
            <AccordionItem value="subscription" className="overflow-hidden rounded-2xl border border-slate-100 bg-white px-4 shadow-soft">
              <AccordionTrigger className="hover:no-underline font-semibold text-base text-[#3C2F2F] py-4 [&[data-state=open]]:pb-2">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 bg-[#df4b1c]/10 rounded-2xl flex items-center justify-center">
                    <Crown className="w-4 h-4 text-highlight" />
                  </div>
                  <span>Plano e Suporte</span>
                </div>
              </AccordionTrigger>
              <AccordionContent className="pt-2 pb-5">
                <SubscriptionSupportSection 
                  navigate={navigate} 
                  isPremium={isPremium} 
                  onDeleteAccount={() => setIsDeleteModalOpen(true)}
                />
              </AccordionContent>
            </AccordionItem>

          </Accordion>
        </div>

        {/* Botão Sair — separado e com área de respiro */}
        <div className="pt-2 pb-32 space-y-3">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest px-1 mb-2">Conta</p>
          <button
            onClick={handleLogout}
            className="w-full h-[50px] rounded-[18px] flex items-center justify-center gap-2 border-2 border-[#df4b1c]/30 text-[#df4b1c] font-semibold text-[15px] bg-[#FFF7ED] hover:bg-[#FFEDD5] active:scale-[0.98] transition-all duration-200"
          >
            <LogOut className="w-4 h-4" />
            Sair da Conta
          </button>
        </div>

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

      {/* Modal de Confirmação de Exclusão de Conta */}
      {isDeleteModalOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white rounded-[24px] p-6 max-w-sm w-full space-y-4 shadow-2xl border border-slate-100"
          >
            <div className="w-12 h-12 bg-red-100 rounded-full flex items-center justify-center text-red-500">
              <Trash2 className="h-6 w-6" />
            </div>
            <div className="space-y-2 text-left">
              <h3 className="text-lg font-bold text-[#3C2F2F]">Excluir Conta e Restaurante?</h3>
              <p className="text-xs text-slate-500 leading-relaxed whitespace-normal">
                Esta ação é irreversível. Todos os dados do seu restaurante (cardápio, fotos, métricas) e a sua conta de usuário serão apagados definitivamente.
              </p>
            </div>
            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsDeleteModalOpen(false)}
                className="flex-1 h-11 rounded-2xl bg-slate-100 text-[#3C2F2F] font-bold text-sm hover:bg-slate-200 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleDeleteAccount}
                className="flex-1 h-11 rounded-2xl bg-red-600 text-white font-bold text-sm hover:bg-red-700 transition-colors shadow-lg shadow-red-600/20"
              >
                Sim, Excluir
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </RestaurantAreaPageLayout>
  );
}
