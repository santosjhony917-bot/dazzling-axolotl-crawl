"use client";

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link, MapPin, MessageCircle, Utensils, Clock, Image, Pencil, Phone, Mail, FileText, Globe, Loader2, ArrowLeft, AlertTriangle } from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { InfoCardItem } from '@/components/InfoCardItem';

import { useAuthData } from '@/context/AuthContext';
import { useToast } from '@/components/ui/use-toast';
import { ModalType, useModal } from '@/hooks/useModal';
import { UpdateRestaurantPayload } from '@/types/payloads';
import { useRestaurantUpdate } from '@/hooks/useRestaurantUpdate';
import RestaurantAreaPageLayout from '@/components/restaurant/RestaurantAreaPageLayout';
import { createPageUrl } from '@/utils/url';
import EditFieldDialog from '@/components/EditFieldDialog';
import { cnpjMask, phoneMask } from '@/utils/masks';
import * as z from 'zod';

// Schemas de validação específicos
const phoneSchema = z.string().regex(/^\(\d{2}\) \d{5}-\d{4}$/, "Telefone inválido. Use o formato (XX) XXXXX-XXXX.");
const cnpjSchema = z.string().regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, "CNPJ inválido. Use o formato XX.XXX.XXX/XXXX-XX.");
const urlSchema = z.string().url("URL inválida. Deve começar com http:// ou https://").optional().or(z.literal(''));

const ProfileSettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { restaurant, isLoading: authLoading, refetchProfile } = useAuthData();
  const { toast } = useToast();
  
  const isOwner = !!restaurant; 
  const restaurantId = restaurant?.id;
  
  const { mutateAsync: updateRestaurantMutation, isPending: isUpdating } = useRestaurantUpdate();

  const handleUpdate = useCallback(async (payload: UpdateRestaurantPayload) => {
    if (!restaurantId) return;

    try {
      await updateRestaurantMutation({ restaurantId, data: payload });
      // Força o refetch do AuthContext para atualizar o estado global imediatamente
      refetchProfile(); 
    } catch (error) {
      console.error("Failed to update restaurant:", error);
      toast({
        title: "Erro",
        description: "Falha ao atualizar as informações do restaurante.",
        variant: "destructive",
      });
    }
  }, [restaurantId, updateRestaurantMutation, refetchProfile, toast]);

  // Memoized data extraction
  const data = useMemo(() => {
    if (!restaurant) return null;
    return {
      name: restaurant.name,
      description: restaurant.description,
      category: restaurant.category,
      phone: restaurant.phone,
      email: restaurant.email,
      cnpj: restaurant.cnpj,
      address: restaurant.address,
      number: restaurant.number,
      neighborhood: restaurant.neighborhood,
      city: restaurant.city,
      state: restaurant.state,
      cep: restaurant.cep,
      latitude: restaurant.latitude,
      longitude: restaurant.longitude,
      opening_hours: restaurant.opening_hours,
      whatsapp_url: restaurant.whatsapp_url,
      ifood_url: restaurant.ifood_url,
      other_url: restaurant.other_url,
      image_url: restaurant.image_url,
      cover_image_url: restaurant.cover_image_url,
    };
  }, [restaurant]);

  // --- Modais de Edição de Campo Único ---
  
  const [editModal, setEditModal] = useState<{
    isOpen: boolean;
    title: string;
    fieldName: keyof UpdateRestaurantPayload;
    currentValue: string;
    icon: React.ReactNode;
    inputType?: 'text' | 'textarea' | 'number' | 'url' | 'tel' | 'email';
    placeholder?: string;
    validationSchema?: z.ZodType<string>;
    mask?: (value: string) => string;
  } | null>(null);
  
  const openEditModal = (
    title: string, 
    fieldName: keyof UpdateRestaurantPayload, 
    currentValue: string | null | undefined, 
    icon: React.ReactNode, 
    inputType: 'text' | 'textarea' | 'number' | 'url' | 'tel' | 'email' = 'text',
    placeholder?: string,
    validationSchema?: z.ZodType<string>,
    mask?: (value: string) => string,
  ) => {
    setEditModal({
      isOpen: true,
      title,
      fieldName,
      currentValue: String(currentValue || ''),
      icon,
      inputType,
      placeholder,
      validationSchema,
      mask,
    });
  };
  
  const handleSaveField = async (fieldName: string, value: string | number) => {
    const payload: UpdateRestaurantPayload = {
      [fieldName]: value,
    };
    await handleUpdate(payload);
    setEditModal(null);
  };
  
  // --- Renderização ---

  if (authLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!restaurant || !data) {
    return (
      <div className="p-6 text-center">
        <AlertTriangle className="w-12 h-12 text-red-500 mx-auto mb-4" />
        <h2 className="text-xl font-bold text-gray-800 mb-2">Restaurante Não Encontrado</h2>
        <p className="text-gray-600 mb-6">
          Se você acabou de se cadastrar, pode ser que o vínculo ainda não tenha sido estabelecido. 
          Se o problema persistir, verifique se você está logado com a conta correta ou tente reivindicar seu restaurante.
        </p>
        <Button onClick={() => navigate(createPageUrl('restaurant-area-hub'))}>
          Voltar para o Hub
        </Button>
      </div>
    );
  }
  
  const fullAddress = [data.address, data.number, data.neighborhood, data.city, data.state, data.cep]
    .filter(Boolean)
    .join(', ');

  return (
    <RestaurantAreaPageLayout title="Configurações do Perfil" icon={Utensils} backPath="restaurant-area/home">
      <div className="p-4 space-y-8">
        
        {/* Header de Gerenciamento de Imagens (Logo e Capa) */}
        <Card className="shadow-soft-lg border-none rounded-xl bg-white">
          <CardHeader>
            <CardTitle className="text-xl text-primary">Imagens do Perfil</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Logo Section */}
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 rounded-full border flex items-center justify-center overflow-hidden bg-gray-100">
                {data.image_url ? (
                  <img src={data.image_url} alt="Logo" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-gray-400 text-xs">Logo</span>
                )}
              </div>
              <Button 
                variant="outline" 
                onClick={() => navigate(createPageUrl('restaurant-area/gallery'))}
                className="text-primary border-primary hover:bg-primary/5"
              >
                <Image className="w-4 h-4 mr-2" /> Gerenciar Galeria
              </Button>
            </div>
            <Separator />
            {/* Cover Image Section */}
            <div className="relative w-full h-32 bg-gray-100 rounded-lg overflow-hidden border">
              {data.cover_image_url ? (
                <img src={data.cover_image_url} alt="Capa" className="w-full h-full object-cover" />
              ) : (
                <div className="flex items-center justify-center h-full text-gray-400">
                  Nenhuma imagem de capa
                </div>
              )}
              <Button 
                variant="outline" 
                onClick={() => navigate(createPageUrl('restaurant-area/gallery'))}
                className="absolute bottom-2 right-2 bg-white/80 text-sm px-3 py-1 rounded-md shadow hover:bg-white transition-colors"
              >
                {data.cover_image_url ? 'Alterar Capa' : 'Adicionar Capa'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Informações Gerais */}
        <Card>
          <CardHeader>
            <CardTitle>Informações Gerais</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <InfoCardItem
              label="Nome do Restaurante"
              value={data.name}
              icon={Building2}
              onClick={() => openEditModal('Editar Nome', 'name', data.name, <Building2 className="w-6 h-6 text-primary" />)}
            />
            <InfoCardItem
              label="Descrição"
              value={data.description}
              icon={UtensilsCrossed}
              onClick={() => openEditModal('Editar Descrição', 'description', data.description, <UtensilsCrossed className="w-6 h-6 text-primary" />, 'textarea')}
            />
            <InfoCardItem
              label="Categoria"
              value={data.category}
              icon={UtensilsCrossed}
              onClick={() => openEditModal('Editar Categoria', 'category', data.category, <UtensilsCrossed className="w-6 h-6 text-primary" />)}
            />
          </CardContent>
        </Card>

        {/* Localização (Simplificado para edição complexa) */}
        <Card>
          <CardHeader>
            <CardTitle>Localização</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <InfoCardItem
              label="Endereço Completo"
              value={fullAddress || 'Não definido'}
              icon={MapPin}
              onClick={() => alert("A edição de endereço completo será implementada em um modal dedicado.")}
            />
          </CardContent>
        </Card>

        {/* Contato */}
        <Card>
          <CardHeader>
            <CardTitle>Contato</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <InfoCardItem
              label="Telefone"
              value={data.phone}
              icon={Phone}
              onClick={() => openEditModal('Editar Telefone', 'phone', data.phone, <Phone className="w-6 h-6 text-primary" />, 'tel', '(XX) XXXXX-XXXX', phoneSchema, phoneMask)}
            />
            <InfoCardItem
              label="Email"
              value={data.email}
              icon={Mail}
              onClick={() => openEditModal('Editar Email', 'email', data.email, <Mail className="w-6 h-6 text-primary" />, 'email')}
            />
          </CardContent>
        </Card>

        {/* Documentos */}
        <Card>
          <CardHeader>
            <CardTitle>Documentos</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <InfoCardItem
              label="CNPJ"
              value={data.cnpj}
              icon={FileText}
              onClick={() => openEditModal('Editar CNPJ', 'cnpj', data.cnpj, <FileText className="w-6 h-6 text-primary" />, 'text', 'XX.XXX.XXX/XXXX-XX', cnpjSchema, cnpjMask)}
            />
          </CardContent>
        </Card>

        {/* Horário de Funcionamento (Simplificado para edição complexa) */}
        <Card>
          <CardHeader>
            <CardTitle>Horário de Funcionamento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <InfoCardItem
              label="Horário"
              value={data.opening_hours ? 'Horário definido' : 'Não definido'}
              icon={Clock}
              onClick={() => alert("A edição de horários será implementada em um modal dedicado.")}
            />
          </CardContent>
        </Card>
        
        {/* Canais de Venda */}
        <Card>
          <CardHeader>
            <CardTitle>Canais de Venda</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {salesChannelItems.map((item, index) => (
              <InfoCardItem
                key={index}
                label={item.label}
                value={item.value}
                icon={item.icon}
                onClick={() => openEditModal(`Editar ${item.label}`, item.fieldName as keyof UpdateRestaurantPayload, item.value, <item.icon className="w-6 h-6 text-primary" />, 'url', 'Ex: https://wa.me/5511999999999', urlSchema)}
              />
            ))}
          </CardContent>
        </Card>
      </div>
      
      {/* Modal de Edição de Campo Único */}
      {editModal?.isOpen && (
        <EditFieldDialog
          isOpen={editModal.isOpen}
          onClose={() => setEditModal(null)}
          title={editModal.title}
          description={`Edite o campo ${editModal.fieldName}`}
          fieldName={editModal.fieldName}
          currentValue={editModal.currentValue}
          icon={editModal.icon}
          onSave={handleSaveField}
          loading={isUpdating}
          inputType={editModal.inputType}
          placeholder={editModal.placeholder}
          validationSchema={editModal.validationSchema}
          mask={editModal.mask}
        />
      )}
    </RestaurantAreaPageLayout>
  );
};

export default ProfileSettingsPage;