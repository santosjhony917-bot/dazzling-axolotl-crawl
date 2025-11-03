import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Loader2, Utensils, Image as ImageIcon, Menu, MapPin, Clock, Link as LinkIcon, CreditCard, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Restaurant } from '@/types/supabase';
import AdminAreaHeader from '@/components/admin/AdminAreaHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { showError, showSuccess } from '@/utils/toast';
import EditFieldDialog from '@/components/EditFieldDialog';
import { z } from 'zod';
import { cnpjMask, phoneMask } from '@/utils/masks';
import { useRestaurantProfile } from '@/hooks/useRestaurantProfile';
import MainProfileCard from '@/components/restaurant/profile/MainProfileCard';
import GalleryManagement from '@/components/restaurant/GalleryManagement';
import ScheduleEditor from '@/components/restaurant/ScheduleEditor';
import PaymentMethodsDialog from '@/components/restaurant/PaymentMethodsDialog';
import SocialNetworksDialog from '@/components/restaurant/SocialNetworksDialog';
import SalesChannelsDialog from '@/components/restaurant/SalesChannelsDialog';
import { GalleryImage } from '@/types/restaurant';
import { createPageUrl } from '@/utils/url';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { RestaurantPlan } from '@/types/supabase';
import { AdminRestaurant, WeekSchedule, SocialNetworkLink } from '@/types/restaurant';

// Schemas de validação
const nameSchema = z.string().min(1, { message: "O nome é obrigatório." });
const descriptionSchema = z.string().min(1, { message: "A descrição é obrigatória." });
const emailSchema = z.string().email({ message: "E-mail inválido." });
const phoneSchema = z.string().regex(/^\(\d{2}\)\s\d{5}-\d{4}$/, { message: "Telefone inválido. Use o formato (XX) XXXXX-XXXX." });
const cnpjSchema = z.string().regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, { message: "CNPJ inválido. Use o formato XX.XXX.XXX/XXXX-XX." });
const categorySchema = z.string().min(1, { message: "A categoria é obrigatória." });
const urlSchema = z.string().url({ message: "URL inválida." });

const fetchRestaurantById = async (id: string): Promise<AdminRestaurant | null> => {
  const { data, error } = await supabase
    .from('restaurants')
    .select('*, restaurant_gallery(*)')
    .eq('id', id)
    .single();
  if (error) {
    throw new Error(error.message);
  }
  return data as AdminRestaurant;
};

const AdminEditRestaurant: React.FC = () => {
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const navigate = useNavigate();

  const { data: restaurant, isLoading, error, refetch } = useQuery<AdminRestaurant | null, Error>({
    queryKey: ['adminRestaurant', restaurantId],
    queryFn: () => fetchRestaurantById(restaurantId!),
    enabled: !!restaurantId,
  });

  const { updateRestaurant } = useRestaurantProfile(restaurant?.id); // Corrigido aqui: passando restaurant?.id

  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [editFieldConfig, setEditFieldConfig] = useState<{
    key: keyof Restaurant;
    title: string;
    description: string;
    initialValue: string | number | undefined;
    inputType: 'text' | 'textarea' | 'number' | 'url';
    validationSchema: z.ZodType<any>;
    mask?: (value: string) => string;
    placeholder?: string;
  } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const [isScheduleEditorOpen, setIsScheduleEditorOpen] = useState(false);
  const [isPaymentMethodsDialogOpen, setIsPaymentMethodsDialogOpen] = useState(false);
  const [isSocialNetworksDialogOpen, setIsSocialNetworksDialogOpen] = useState(false);
  const [isSalesChannelsDialogOpen, setIsSalesChannelsDialogOpen] = useState(false);

  useEffect(() => {
    if (error) {
      showError(`Erro ao carregar restaurante: ${error.message}`);
    }
  }, [error]);

  const handleEditField = useCallback((
    key: keyof Restaurant,
    title: string,
    description: string,
    initialValue: string | number | undefined,
    inputType: 'text' | 'textarea' | 'number' | 'url',
    validationSchema: z.ZodType<any>,
    mask?: (value: string) => string,
    placeholder?: string,
  ) => {
    setEditFieldConfig({ key, title, description, initialValue, inputType, validationSchema, mask, placeholder });
    setIsEditDialogOpen(true);
  }, []);

  const handleSaveField = useCallback(async (fieldName: string, value: string | number) => {
    if (!restaurantId) return;
    setIsSaving(true);
    const updates = { [fieldName]: value };
    const { error: updateError } = await updateRestaurant(updates);
    setIsSaving(false);
    if (updateError) {
      showError(`Falha ao atualizar ${fieldName}: ${updateError}`);
    } else {
      showSuccess(`${editFieldConfig?.title || 'Campo'} atualizado com sucesso!`);
      refetch(); // Recarrega os dados do restaurante
      setIsEditDialogOpen(false);
    }
  }, [restaurantId, updateRestaurant, editFieldConfig, refetch]);

  const handleLogoUploadComplete = useCallback(async (url: string) => {
    if (!restaurantId) return;
    setIsSaving(true);
    const { error: updateError } = await updateRestaurant({ image_url: url });
    setIsSaving(false);
    if (updateError) {
      showError(`Falha ao atualizar logo: ${updateError}`);
    } else {
      showSuccess('Logo atualizado com sucesso!');
      refetch();
    }
  }, [restaurantId, updateRestaurant, refetch]);

  const handleCoverImageChange = useCallback(async (url: string) => {
    if (!restaurantId) return;
    setIsSaving(true);
    const { error: updateError } = await updateRestaurant({ cover_image_url: url });
    setIsSaving(false);
    if (updateError) {
      showError(`Falha ao atualizar capa: ${updateError}`);
    } else {
      showSuccess('Capa atualizada com sucesso!');
      refetch();
    }
  }, [restaurantId, updateRestaurant, refetch]);

  const handleGalleryImagesChange = useCallback(() => {
    refetch(); // A GalleryManagement já faz as mutações, só precisamos recarregar o restaurante para ter os dados mais recentes
  }, [refetch]);

  const handleSaveSchedule = useCallback(async (schedule: any) => {
    if (!restaurantId) return;
    setIsSaving(true);
    const { error: updateError } = await updateRestaurant({ opening_hours: schedule });
    setIsSaving(false);
    if (updateError) {
      showError(`Falha ao atualizar horário de funcionamento: ${updateError}`);
    } else {
      showSuccess('Horário de funcionamento atualizado com sucesso!');
      refetch();
      setIsScheduleEditorOpen(false);
    }
  }, [restaurantId, updateRestaurant, refetch]);

  const handleSavePaymentMethods = useCallback(async (methods: string[]) => {
    if (!restaurantId) return;
    setIsSaving(true);
    const { error: updateError } = await updateRestaurant({ payment_methods: methods });
    setIsSaving(false);
    if (updateError) {
      showError(`Falha ao atualizar métodos de pagamento: ${updateError}`);
    } else {
      showSuccess('Métodos de pagamento atualizados com sucesso!');
      refetch();
      setIsPaymentMethodsDialogOpen(false);
    }
  }, [restaurantId, updateRestaurant, refetch]);

  const handleSaveSocialNetworks = useCallback(async (socials: any) => {
    if (!restaurantId) return;
    setIsSaving(true);
    const { error: updateError } = await updateRestaurant({ social_networks: socials });
    setIsSaving(false);
    if (updateError) {
      showError(`Falha ao atualizar redes sociais: ${updateError}`);
    } else {
      showSuccess('Redes sociais atualizadas com sucesso!');
      refetch();
      setIsSocialNetworksDialogOpen(false);
    }
  }, [restaurantId, updateRestaurant, refetch]);

  const handleSaveSalesChannels = useCallback(async (channels: any) => {
    if (!restaurantId) return;
    setIsSaving(true);
    const { error: updateError } = await updateRestaurant({
      whatsapp_url: channels.whatsapp_url,
      ifood_url: channels.ifood_url,
      other_url: channels.other_url,
      external_url: channels.external_url,
    });
    setIsSaving(false);
    if (updateError) {
      showError(`Falha ao atualizar canais de venda: ${updateError}`);
    } else {
      showSuccess('Canais de venda atualizados com sucesso!');
      refetch();
      setIsSalesChannelsDialogOpen(false);
    }
  }, [restaurantId, updateRestaurant, refetch]);

  const handlePlanChange = useCallback(async (newPlan: RestaurantPlan) => {
    if (!restaurantId) return;
    setIsSaving(true);
    const { error: updateError } = await updateRestaurant({ plan: newPlan });
    setIsSaving(false);
    if (updateError) {
      showError(`Falha ao atualizar plano: ${updateError}`);
    } else {
      showSuccess(`Plano atualizado para ${newPlan} com sucesso!`);
      refetch();
    }
  }, [restaurantId, updateRestaurant, refetch]);

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!restaurant) {
    return <div className="text-center text-red-500 p-4">Restaurante não encontrado.</div>;
  }

  const isPremium = restaurant.plan === 'premium' || restaurant.plan === 'premium_gift';

  return (
    <div className="space-y-6">
      <AdminAreaHeader
        title={`Editar Restaurante: ${restaurant.name}`}
        description="Gerencie todas as informações e conteúdo deste restaurante."
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Coluna Principal (Informações Básicas, Logo, Plano) */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="shadow-soft-lg border-none rounded-xl bg-white p-6">
            <CardHeader className="p-0 mb-4">
              <CardTitle className="text-xl text-[#022D68]">Informações Essenciais</CardTitle>
            </CardHeader>
            <CardContent className="p-0 space-y-4">
              <MainProfileCard
                restaurantName={restaurant.name}
                logoUrl={restaurant.image_url}
                isPremium={isPremium}
                uploading={isSaving}
                onLogoUploadComplete={handleLogoUploadComplete}
                restaurantId={restaurant.id}
              />
              <div className="space-y-2">
                <h3 className="font-semibold text-lg text-[#022D68]">Plano do Restaurante</h3>
                <Select value={restaurant.plan} onValueChange={handlePlanChange} disabled={isSaving}>
                  <SelectTrigger className="w-full">
                    <SelectValue placeholder="Selecione o plano" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="free">Free</SelectItem>
                    <SelectItem value="basic">Basic</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="premium_gift">Premium (Gift)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button
                variant="outline"
                className="w-full justify-start gap-3"
                onClick={() => handleEditField(
                  'name',
                  'Editar Nome',
                  'Nome do Restaurante',
                  restaurant.name,
                  'text',
                  nameSchema
                )}
                disabled={isSaving}
              >
                <Utensils className="h-4 w-4" /> Editar Nome
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-3"
                onClick={() => handleEditField(
                  'description',
                  'Editar Descrição',
                  'Descrição do Restaurante',
                  restaurant.description || '',
                  'textarea',
                  descriptionSchema
                )}
                disabled={isSaving}
              >
                <ImageIcon className="h-4 w-4" /> Editar Descrição
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-3"
                onClick={() => handleEditField(
                  'category',
                  'Editar Categoria',
                  'Categoria Principal',
                  restaurant.category || '',
                  'text',
                  categorySchema
                )}
                disabled={isSaving}
              >
                <Utensils className="h-4 w-4" /> Editar Categoria
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-3"
                onClick={() => handleEditField(
                  'cnpj',
                  'Editar CNPJ',
                  'CNPJ do Restaurante',
                  restaurant.cnpj || '',
                  'text',
                  cnpjSchema,
                  cnpjMask,
                  "XX.XXX.XXX/XXXX-XX"
                )}
                disabled={isSaving}
              >
                <CreditCard className="h-4 w-4" /> Editar CNPJ
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-3"
                onClick={() => handleEditField(
                  'email',
                  'Editar E-mail',
                  'E-mail de Contato',
                  restaurant.email || '',
                  'text',
                  emailSchema
                )}
                disabled={isSaving}
              >
                <Users className="h-4 w-4" /> Editar E-mail
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-3"
                onClick={() => handleEditField(
                  'phone',
                  'Editar Telefone',
                  'Telefone de Contato',
                  restaurant.phone || '',
                  'text',
                  phoneSchema,
                  phoneMask
                )}
                disabled={isSaving}
              >
                <Users className="h-4 w-4" /> Editar Telefone
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Coluna do Meio (Endereço, Horários, Canais de Venda) */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="shadow-soft-lg border-none rounded-xl bg-white p-6">
            <CardHeader className="p-0 mb-4">
              <CardTitle className="text-xl text-[#022D68]">Localização e Contato</CardTitle>
            </CardHeader>
            <CardContent className="p-0 space-y-4">
              <Button
                variant="outline"
                className="w-full justify-start gap-3"
                onClick={() => handleEditField(
                  'address',
                  'Editar Endereço',
                  'Endereço do Restaurante',
                  restaurant.address || '',
                  'text',
                  nameSchema
                )}
                disabled={isSaving}
              >
                <MapPin className="h-4 w-4" /> Editar Endereço
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-3"
                onClick={() => handleEditField(
                  'city',
                  'Editar Cidade',
                  'Cidade do Restaurante',
                  restaurant.city || '',
                  'text',
                  nameSchema
                )}
                disabled={isSaving}
              >
                <MapPin className="h-4 w-4" /> Editar Cidade
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-3"
                onClick={() => handleEditField(
                  'state',
                  'Editar Estado',
                  'Estado do Restaurante',
                  restaurant.state || '',
                  'text',
                  nameSchema
                )}
                disabled={isSaving}
              >
                <MapPin className="h-4 w-4" /> Editar Estado
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-3"
                onClick={() => handleEditField(
                  'cep',
                  'Editar CEP',
                  'CEP do Restaurante',
                  restaurant.cep || '',
                  'text',
                  nameSchema
                )}
                disabled={isSaving}
              >
                <MapPin className="h-4 w-4" /> Editar CEP
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-3"
                onClick={() => setIsScheduleEditorOpen(true)}
                disabled={isSaving}
              >
                <Clock className="h-4 w-4" /> Editar Horário de Funcionamento
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-3"
                onClick={() => setIsPaymentMethodsDialogOpen(true)}
                disabled={isSaving}
              >
                <CreditCard className="h-4 w-4" /> Editar Formas de Pagamento
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-3"
                onClick={() => setIsSocialNetworksDialogOpen(true)}
                disabled={isSaving}
              >
                <LinkIcon className="h-4 w-4" /> Editar Redes Sociais
              </Button>
              <Button
                variant="outline"
                className="w-full justify-start gap-3"
                onClick={() => setIsSalesChannelsDialogOpen(true)}
                disabled={isSaving}
              >
                <LinkIcon className="h-4 w-4" /> Editar Canais de Venda
              </Button>
            </CardContent>
          </Card>
        </div>

        {/* Coluna da Direita (Galeria e Cardápio) */}
        <div className="lg:col-span-1 space-y-6">
          <Card className="shadow-soft-lg border-none rounded-xl bg-white p-6">
            <CardHeader className="p-0 mb-4">
              <CardTitle className="text-xl text-[#022D68]">Conteúdo</CardTitle>
            </CardHeader>
            <CardContent className="p-0 space-y-4">
              <Button
                variant="outline"
                className="w-full justify-start gap-3"
                onClick={() => navigate(createPageUrl('adminRestaurantMenu', { restaurantId: restaurant.id }))}
                disabled={isSaving}
              >
                <Menu className="h-4 w-4" /> Gerenciar Cardápio
              </Button>
              <GalleryManagement
                restaurantId={restaurant.id}
                initialGalleryImages={restaurant.restaurant_gallery || []}
                initialCoverImageUrl={restaurant.cover_image_url || undefined}
                onGalleryImagesChange={handleGalleryImagesChange}
                onCoverImageChange={handleCoverImageChange}
              />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Dialogs */}
      {editFieldConfig && (
        <EditFieldDialog
          isOpen={isEditDialogOpen}
          onClose={() => setIsEditDialogOpen(false)}
          title={editFieldConfig.title}
          description={editFieldConfig.description}
          fieldName={editFieldConfig.key as string}
          initialValue={editFieldConfig.initialValue}
          inputType={editFieldConfig.inputType}
          onSave={handleSaveField}
          loading={isSaving}
        />
      )}
      {restaurant.opening_hours && (
        <ScheduleEditor
          isOpen={isScheduleEditorOpen}
          onClose={() => setIsScheduleEditorOpen(false)}
          initialSchedule={restaurant.opening_hours as unknown as WeekSchedule}
          onSave={handleSaveSchedule}
          isLoading={isSaving}
        />
      )}
      <PaymentMethodsDialog
        isOpen={isPaymentMethodsDialogOpen}
        onClose={() => setIsPaymentMethodsDialogOpen(false)}
        currentMethods={(restaurant.payment_methods as string[] | null) || []}
        onSave={handleSavePaymentMethods}
        isLoading={isSaving}
      />
      {restaurant.social_networks && (
        <SocialNetworksDialog
          isOpen={isSocialNetworksDialogOpen}
          onClose={() => setIsSocialNetworksDialogOpen(false)}
          currentLinks={restaurant.social_networks as unknown as SocialNetworkLink[]}
          onSave={handleSaveSocialNetworks}
          isLoading={isSaving}
        />
      )}
      <SalesChannelsDialog
        isOpen={isSalesChannelsDialogOpen}
        onClose={() => setIsSalesChannelsDialogOpen(false)}
        initialWhatsappUrl={restaurant.whatsapp_url || null}
        initialIfoodUrl={restaurant.ifood_url || null}
        initialOtherUrl={restaurant.other_url || null}
        initialExternalUrl={restaurant.external_url || null}
        onSave={handleSaveSalesChannels}
        isLoading={isSaving}
      />
    </div>
  );
};

export default AdminEditRestaurant;