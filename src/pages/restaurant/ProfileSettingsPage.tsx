import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { fetchOwnerRestaurantData, updateRestaurantProfile } from '@/integrations/supabase/restaurants';
import { Restaurant } from '@/types/restaurant';
import { WeekSchedule, OpeningHours } from '@/types/schedule'; // Importando OpeningHours
import { convertOpeningHoursToWeekSchedule } from '@/lib/schedule';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Loader2, Save, ArrowLeft, Utensils } from 'lucide-react';
import { toast } from 'sonner';
import ScheduleEditor from '@/components/restaurant/ScheduleEditor';
import ImageUpload from '@/components/restaurant/ImageUpload';
import { Separator } from '@/components/ui/separator';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RESTAURANT_CATEGORIES } from '@/constants/categories';
import { cn } from '@/lib/utils';
import RestaurantAreaPageLayout from '@/components/restaurant/RestaurantAreaPageLayout';
import { useAuthData } from '@/context/AuthContext';
import { EditAddressDialog } from '@/components/EditAddressDialog';
import { EditHoursDialog } from '@/components/EditHoursDialog';
import BasicInfoSection from '@/components/restaurant/profile/BasicInfoSection';
import LocationHoursSection from '@/components/restaurant/profile/LocationHoursSection';
import SalesChannelsSection from '@/components/restaurant/profile/SalesChannelsSection';
import SubscriptionSupportSection from '@/components/restaurant/profile/SubscriptionSupportSection';
import { cnpjMask, phoneMask } from '@/utils/masks';
import * as z from 'zod';
import EditFieldDialog from '@/components/EditFieldDialog';
import { useRestaurantUpdate } from '@/hooks/useRestaurantUpdate';

// --- Schemas de Validação ---
const nameSchema = z.string().min(2, "O nome deve ter pelo menos 2 caracteres.");
const emailSchema = z.string().email("E-mail inválido.");
const phoneSchema = z.string().regex(/^\(\d{2}\) \d{5}-\d{4}$/, "Telefone inválido (Ex: (83) 99999-9999)").optional().or(z.literal(''));
const cnpjSchema = z.string().regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, "CNPJ inválido (Ex: XX.XXX.XXX/XXXX-XX)").optional().or(z.literal(''));

// --- Componente Principal ---

const ProfileSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  // Usando useAuthData para obter o restaurante logado
  const { restaurant, isLoading: authLoading, isPremium, refetchProfile } = useAuthData();
  const currentRestaurantId = restaurant?.id;

  // Estados para Modais
  const [isAddressDialogOpen, setIsAddressDialogOpen] = useState(false);
  const [isHoursDialogOpen, setIsHoursDialogOpen] = useState(false);
  const [isFieldDialogOpen, setIsFieldDialogOpen] = useState(false);
  const [editConfig, setEditConfig] = useState<{ 
    key: keyof Restaurant; 
    title: string; 
    fieldName: string; 
    icon: React.ReactNode; 
    validationSchema: z.ZodType<string>; 
    type?: "text" | "tel" | "email" | "url"; 
    mask?: (value: string) => string; 
    placeholder?: string 
  } | null>(null);

  // Hook de Mutação
  const { mutate: updateRestaurant, isPending: isSaving } = useRestaurantUpdate();

  // Converte o horário do DB para o formato de edição (WeekSchedule)
  const currentSchedule: WeekSchedule = useMemo(() => {
    if (!restaurant?.opening_hours) return convertOpeningHoursToWeekSchedule(null);
    return convertOpeningHoursToWeekSchedule(restaurant.opening_hours as unknown as OpeningHours[]);
  }, [restaurant?.opening_hours]);

  // --- Handlers ---

  const handleUpdate = (updates: Partial<Restaurant>) => {
    if (!currentRestaurantId) {
      toast.error("ID do restaurante não encontrado.");
      return { error: "ID do restaurante não encontrado." };
    }
    
    return new Promise<{ error: string | null }>((resolve) => {
      updateRestaurant(
        { restaurantId: currentRestaurantId, data: updates },
        {
          onSuccess: () => {
            refetchProfile(); // Força a atualização do contexto
            resolve({ error: null });
          },
          onError: (error) => {
            resolve({ error: error.message });
          },
        }
      );
    });
  };
  
  const handleSaveHours = async (newSchedule: WeekSchedule) => {
    // Converte WeekSchedule de volta para OpeningHours[] (formato DB)
    const openingHoursArray: OpeningHours[] = Object.entries(newSchedule)
      .flatMap(([dayName, schedule]) => {
        if (!schedule.isOpen || schedule.slots.length === 0) {
          return [];
        }
        // Day index: Sunday=0, Monday=1, ..., Saturday=6
        const dayIndex = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'].indexOf(dayName);
        
        return schedule.slots.map(slot => ({
          day: dayIndex,
          open: slot.start,
          close: slot.end,
        }));
      }) as OpeningHours[];

    await handleUpdate({ opening_hours: openingHoursArray as any });
    toast.success("Horários de funcionamento atualizados!");
  };

  const handleEditField = (key: keyof Restaurant, title: string, fieldName: string, icon: React.ReactNode, validationSchema: z.ZodType<string>, type?: "text" | "tel" | "email" | "url", mask?: (value: string) => string, placeholder?: string) => {
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
  };
  
  const handleSaveField = async (fieldName: string, value: string | number) => {
    const updates = { [fieldName]: value };
    await handleUpdate(updates);
    setIsFieldDialogOpen(false);
  };

  if (authLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="p-4 text-center">
        <h1 className="text-2xl font-bold text-red-500">Restaurante não encontrado.</h1>
        <p className="text-gray-600 mt-2">Certifique-se de que sua conta de usuário está vinculada a um restaurante.</p>
        <Button onClick={() => navigate('/restaurant-area-hub')} className="mt-4">
          Voltar ao Hub
        </Button>
      </div>
    );
  }
  
  // --- Renderização ---

  // Helper para mapear tipos de input que EditFieldDialog aceita
  const getEditFieldInputType = (type: string | undefined): 'text' | 'url' | 'textarea' | 'number' => {
    if (type === 'url') return 'url';
    // Se for 'email' ou 'tel', tratamos como 'text' no componente de edição
    return 'text'; 
  };

  return (
    <RestaurantAreaPageLayout 
      title="Configurações do Perfil" 
      icon={Utensils} 
      backPath="restaurant-area/home"
    >
      <div className="p-4 space-y-6">
        
        {/* 1. Header e Logo */}
        <Card className="shadow-soft-xl border-none rounded-2xl p-6 bg-white">
          <div className="flex items-start gap-4">
            {/* Logo Upload (Simplificado) */}
            <div className="w-24 h-24 rounded-xl border-4 border-white bg-gray-200 dark:bg-gray-600 shrink-0 shadow-lg overflow-hidden">
              <ImageUpload
                label=""
                currentUrl={restaurant.image_url}
                onUploadComplete={(url) => handleUpdate({ image_url: url })}
                onRemove={() => handleUpdate({ image_url: null })}
                folder={`restaurants/${currentRestaurantId}/logo`}
                aspectRatio={1/1}
              />
            </div>
            
            <div className="flex-1 pt-2">
              <h3 className="font-bold text-2xl text-[#022D68] leading-tight">{restaurant.name}</h3>
              <p className="text-sm text-gray-500 mt-2">Clique na imagem para alterar o logo.</p>
            </div>
          </div>
        </Card>
        
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
        
        {/* 4. Canais de Venda */}
        <SalesChannelsSection restaurant={restaurant as any} />
        
        {/* 5. Assinatura e Suporte */}
        <SubscriptionSupportSection navigate={navigate} isPremium={isPremium} />
        
      </div>
      
      {/* Modais */}
      <EditAddressDialog
        open={isAddressDialogOpen}
        onOpenChange={setIsAddressDialogOpen}
        restaurantId={currentRestaurantId!}
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
      
      {editConfig && (
        <EditFieldDialog
          isOpen={isFieldDialogOpen}
          onClose={() => setIsFieldDialogOpen(false)}
          title={editConfig.title}
          description={`Insira o novo valor para ${editConfig.fieldName.toLowerCase()}.`}
          fieldName={editConfig.key}
          initialValue={restaurant[editConfig.key] as string | number | undefined}
          inputType={getEditFieldInputType(editConfig.type)}
          onSave={handleSaveField}
          loading={isSaving}
        />
      )}
    </RestaurantAreaPageLayout>
  );
};

export default ProfileSettingsPage;