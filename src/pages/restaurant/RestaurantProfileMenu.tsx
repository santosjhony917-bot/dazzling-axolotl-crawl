import React, { useState, useCallback } from "react";
import { ArrowLeft, Phone, Mail, FileText, UtensilsCrossed, Store, Globe, Building2, Utensils, LogOut } from "lucide-react";
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
import { Skeleton } from "@/components/ui/skeleton";
import { showError, showSuccess } from "@/utils/toast";

// Importando os novos componentes de seção
import MainProfileCard from "@/components/restaurant/profile/MainProfileCard.tsx";
import BasicInfoSection from "@/components/restaurant/profile/BasicInfoSection.tsx";
import LocationHoursSection from "@/components/restaurant/profile/LocationHoursSection.tsx";
import SalesChannelsSection from "@/components/restaurant/profile/SalesChannelsSection.tsx";
import ContentManagementSection from "@/components/restaurant/profile/ContentManagementSection.tsx";
import SubscriptionSupportSection from "@/components/restaurant/profile/SubscriptionSupportSection.tsx";

// --- Schemas ---
const nameSchema = z.string().min(3, "Nome deve ter no mínimo 3 caracteres");
const emailSchema = z.string().email("E-mail inválido");
const phoneSchema = z.string().regex(/^\(\d{2}\)\s\d{4,5}-\d{4}$/, "Telefone inválido. Use o formato (XX) XXXX-XXXX ou (XX) XXXXX-XXXX");
const cnpjSchema = z.string().regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, "CNPJ inválido. Use o formato XX.XXX.XXX/XXXX-XX");
const whatsappSchema = z.string().url("URL do WhatsApp inválida");
const ifoodSchema = z.string().url("URL do iFood inválida");
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

// Mock Schedule
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

const RestaurantProfileMenu: React.FC = () => {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  
  const MOCK_RESTAURANT_ID = "a1b2c3d4-e5f6-7890-1234-567890abcdef"; 
  const { restaurant, loading: restaurantLoading, updateRestaurant, refetch } = useRestaurantProfile(MOCK_RESTAURANT_ID);
  const { isPremium, isLoading: roleLoading } = useUserRole();
  const { uploadImage, uploading } = useImageUpload();

  const [editingField, setEditingField] = useState<EditingFieldState | null>(null);
  const [isHoursDialogOpen, setIsHoursDialogOpen] = useState(false);
  const [isAddressDialogOpen, setIsAddressDialogOpen] = useState(false);

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      showError(error.message || "Erro ao sair.");
    } else {
      showSuccess("Logout realizado com sucesso.");
      navigate(createPageUrl('welcome'));
    }
  };

  // Função para abrir o diálogo de edição de campo
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

  // Função para salvar o campo editado
  const handleSaveField = async (value: string) => {
    if (!editingField) return;
    
    const key = editingField.key as keyof typeof restaurant;
    
    if (key === 'address' || key === 'city' || key === 'state' || key === 'cep' || key === 'neighborhood') {
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

  // Função para salvar os horários
  const handleSaveHours = async (newSchedule: WeekSchedule) => {
    const { error } = await updateRestaurant({ opening_hours: newSchedule });
    if (error) {
      showError(error);
      throw new Error(error);
    }
    showSuccess("Horários de funcionamento atualizados!");
  };

  // Função para upload de imagem
  const handleFileSelect = async (file: File, type: 'logo' | 'cover') => {
    if (!restaurant?.id) {
      showError("Restaurante não carregado.");
      return;
    }
    
    const { url, error } = await uploadImage(file, 'restaurant_images', restaurant.id, type);
    
    if (error) {
      showError(`Falha ao fazer upload da imagem: ${error.message}`);
      return;
    }
    
    const updateKey = type === 'logo' ? 'logo_url' : 'cover_image_url';
    const { error: updateError } = await updateRestaurant({ [updateKey]: url });
    
    if (updateError) {
      showError(`Imagem enviada, mas falha ao salvar URL: ${updateError}`);
      return;
    }
    showSuccess("Imagem atualizada com sucesso!");
  };

  if (restaurantLoading || roleLoading) {
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

  const currentSchedule = restaurant?.opening_hours || mockSchedule;
  const currentAddress = {
    address: restaurant?.address || '',
    city: restaurant?.city || '',
    state: restaurant?.state || '',
    cep: restaurant?.cep || '',
    neighborhood: restaurant?.neighborhood || '',
    latitude: restaurant?.latitude || null,
    longitude: restaurant?.longitude || null,
  };

  return (
    <div className="relative bg-[#f5f7f8] font-sans antialiased flex min-h-screen w-full flex-col items-center p-4">
      
      {/* Header (Fixo no topo, estilo Hub) */}
      <header className="flex items-center bg-white p-4 pb-2 justify-between sticky top-0 z-20 shadow-sm w-full max-w-md absolute top-0">
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

      <main className="flex-1 flex flex-col w-full max-w-md pt-20 pb-24">
        <div className="w-full space-y-3"> {/* Alterado de space-y-6 para space-y-3 */}
          
          {/* Icon and Title (Estilo Hub) */}
          <div className="flex flex-col items-center justify-center pb-2 w-full max-w-sm mx-auto text-center">
            <div className="flex items-center justify-center size-16 bg-[#E47948]/10 rounded-full mx-auto mb-4">
              <Store className="w-8 h-8 text-[#E47948]" />
            </div>
            <h1 className="text-[#022D68] tracking-tight text-3xl font-bold leading-tight">
              {restaurant?.name || "Restaurante Teste Free"}
            </h1>
            <p className="text-gray-600 text-base mt-1">
              Gerencie as informações do seu estabelecimento.
            </p>
          </div>

          {/* 1. Card Principal (Logo e Status) */}
          <MainProfileCard
            restaurantName={restaurant?.name || "Restaurante Teste Free"}
            logoUrl={restaurant?.logo_url}
            isPremium={isPremium}
            uploading={uploading}
            handleFileSelect={handleFileSelect}
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

          {/* 3. Localização e Horários */}
          <LocationHoursSection
            restaurant={restaurant}
            isPremium={isPremium}
            currentSchedule={currentSchedule}
            setIsAddressDialogOpen={setIsAddressDialogOpen}
            setIsHoursDialogOpen={setIsHoursDialogOpen}
          />

          {/* 4. Canais de Venda e Links */}
          <SalesChannelsSection
            restaurant={restaurant}
            isPremium={isPremium}
            handleEditField={handleEditField}
            whatsappSchema={whatsappSchema}
            ifoodSchema={ifoodSchema}
            otherUrlSchema={otherUrlSchema}
          />

          {/* 5. Gerenciamento de Conteúdo */}
          <ContentManagementSection navigate={navigate} />

          {/* 6. Assinatura e Suporte */}
          <SubscriptionSupportSection navigate={navigate} isPremium={isPremium} />

          {/* Logout Button */}
          <div className="mt-4 pt-6">
            <Button
              onClick={handleSignOut}
              variant="outline"
              className="w-full h-12 rounded-full border-2 border-red-500/50 hover:bg-red-50 active:scale-[0.98] transition-all justify-center px-4 shadow-md text-red-600 font-bold"
            >
              <LogOut className="h-5 w-5 mr-3" />
              <span className="font-medium">Sair da conta</span>
            </Button>
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
        restaurantId={MOCK_RESTAURANT_ID}
        currentAddress={currentAddress}
        onSave={refetch}
      />
    </div>
  );
}

export default RestaurantProfileMenu;