import React, { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Camera, Building2, MapPin, Clock, Phone, Mail, CreditCard, Bell, Package, HelpCircle, MessageSquare, FileCheck, LogOut, Crown, Sparkles, ChevronRight, FileText, UtensilsCrossed, Eye, Check, Lock, Edit, Store, Badge as BadgeIcon, BarChart3, Utensils, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth"; // Mantendo o mock useAuth
import { useRestaurantProfile } from "@/hooks/useRestaurantProfile";
import { useUserRole } from "@/hooks/useUserRole";
import { useImageUpload } from "@/hooks/useImageUpload";
import RestaurantBottomNav from "@/components/restaurant/RestaurantBottomNav";
import EditFieldDialog from "@/components/EditFieldDialog";
import { EditHoursDialog } from "@/components/EditHoursDialog";
import { EditAddressDialog } from "@/components/EditAddressDialog";
import { ImageUploadButton } from "@/components/ImageUploadButton";
import NavCardItem from "@/components/NavCardItem"; 
import InfoCardItem from "@/components/InfoCardItem"; // Importando o novo componente
import restaurantLogo from "@/assets/restaurant-logo.png";
import { z } from "zod";
import { WeekSchedule } from "@/types/schedule";
import { createPageUrl } from "@/utils/url";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { showError, showSuccess } from "@/utils/toast";

// Validation schemas
const nameSchema = z.string().min(3, "Nome deve ter no mínimo 3 caracteres");
const phoneSchema = z.string().regex(/^\(\d{2}\)\s\d{4,5}-\d{4}$/, "Telefone inválido. Use o formato (XX) XXXX-XXXX ou (XX) XXXXX-XXXX");
const emailSchema = z.string().email("E-mail inválido");
const cnpjSchema = z.string().regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, "CNPJ inválido. Use o formato XX.XXX.XXX/XXXX-XX");
const whatsappSchema = z.string().url("URL do WhatsApp inválida");
const ifoodSchema = z.string().url("URL do iFood inválida");
const otherUrlSchema = z.string().url("URL inválida").or(z.literal(''));

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

// Phone mask function
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

// CNPJ mask function
const cnpjMask = (value: string) => {
  const numbers = value.replace(/\D/g, '');
  return numbers
    .replace(/^(\d{2})(\d)/, '$1.$2')
    .replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3')
    .replace(/\.(\d{3})(\d)/, '.$1/$2')
    .replace(/(\/\d{4})(\d)/, '$1-$2')
    .slice(0, 18);
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
  const { toast } = useToast();
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

  const handleEditField = (key: keyof typeof restaurant, title: string, fieldName: string, icon: React.ReactNode, validationSchema: z.ZodType<string>, type: "text" | "tel" | "email" = "text", mask?: (value: string) => string, placeholder?: string) => {
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
  };

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

  const handleSaveHours = async (newSchedule: WeekSchedule) => {
    const { error } = await updateRestaurant({ opening_hours: newSchedule });
    if (error) {
      showError(error);
      throw new Error(error);
    }
    showSuccess("Horários de funcionamento atualizados!");
  };

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

  // --- InfoItem antigo removido ---

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
    <div className="min-h-screen bg-[#f5f7f8] pb-20">
      <div className="max-w-md mx-auto">
        
        {/* Header (Voltar para o Hub) - Estilo da Imagem */}
        <header className="flex items-center bg-white p-4 justify-center sticky top-0 z-20 shadow-sm">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(createPageUrl('restaurant-area/home'))}
            className="text-[#022D68] hover:bg-[#022D68]/5 absolute left-4"
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <h2 className="text-[#022D68] text-xl font-bold">Meu Perfil</h2>
        </header>

        {/* Área de Fundo (Simulando a área cinza/capa) */}
        <div className="relative h-24 w-full bg-gray-300 dark:bg-gray-700">
          <img 
            src={restaurant?.cover_image_url || "https://via.placeholder.com/600x200?text=Capa+do+Restaurante"} 
            alt="Capa do Restaurante" 
            className="w-full h-full object-cover opacity-0" 
          />
        </div>

        {/* Restaurant Header & Logo - Card Flutuante */}
        <div className="px-4 -mt-12 mb-6">
          <Card className="bg-white border border-border/10 rounded-[2rem] p-6 relative shadow-xl">
            <div className="flex items-start gap-4">
              {/* Logo */}
              <div className="relative w-20 h-20 rounded-full border-4 border-white bg-gray-200 dark:bg-gray-600 shrink-0">
                <img 
                  src={restaurant?.logo_url || restaurantLogo} 
                  alt="Logo do Restaurante" 
                  className="w-full h-full object-cover rounded-full"
                />
                <ImageUploadButton
                  onFileSelect={(file) => handleFileSelect(file, 'logo')}
                  uploading={uploading}
                  className="absolute bottom-0 right-0 h-6 w-6 p-0 bg-[#E47948] text-white hover:bg-[#E47948]/90"
                  variant="default"
                  size="icon"
                >
                  <Camera className="h-3 w-3" />
                </ImageUploadButton>
              </div>
              
              {/* Info */}
              <div className="flex-1 pt-2">
                <h3 className="font-bold text-xl text-[#022D68]">{restaurant?.name || "Restaurante Teste Free"}</h3>
                <div className="flex items-center gap-2 mt-1">
                  <Badge 
                    variant="outline" 
                    className="text-xs font-semibold border-gray-400 text-gray-600 bg-white"
                  >
                    <Store className="w-3 h-3 mr-1" />
                    {isPremium ? "Premium" : "Free"}
                  </Badge>
                  <Badge 
                    variant="secondary" 
                    className="text-xs font-semibold bg-green-100 text-green-700"
                  >
                    <Check className="w-3 h-3 mr-1" />
                    Verificado
                  </Badge>
                </div>
              </div>
            </div>
          </Card>
        </div>

        {/* Informações Básicas */}
        <div className="px-4 mb-6 space-y-3">
          <h2 className="text-lg font-bold text-[#022D68]">Informações Básicas</h2>
          
          <InfoCardItem 
            label="Nome do Restaurante" 
            value={restaurant?.name || "Restaurante Teste Free"} 
            icon={Building2} 
            isPremium={isPremium}
            onClick={() => handleEditField('name', 'Editar Nome', 'Nome do Restaurante', <Building2 className="h-6 w-6 text-primary" />, nameSchema)}
          />
          <InfoCardItem 
            label="Categoria Principal" 
            value={restaurant?.category || "Não definida"} 
            icon={UtensilsCrossed} 
            isPremium={isPremium}
            onClick={() => handleEditField('category', 'Editar Categoria', 'Categoria Principal', <Utensils className="h-6 w-6 text-primary" />, nameSchema, "text", undefined, "Ex: Pizzaria, Hamburgueria")}
          />
          <InfoCardItem 
            label="CNPJ" 
            value={restaurant?.cnpj || "12.345.678/0001-90"} 
            icon={FileText} 
            isPremium={isPremium}
            onClick={() => handleEditField('cnpj', 'Editar CNPJ', 'CNPJ', <FileText className="h-6 w-6 text-primary" />, cnpjSchema, "text", cnpjMask, "XX.XXX.XXX/XXXX-XX")}
          />
          <InfoCardItem 
            label="E-mail de Contato" 
            value={restaurant?.email || "teste@filterfood.com"} 
            icon={Mail} 
            isPremium={isPremium}
            onClick={() => handleEditField('email', 'Editar E-mail', 'E-mail de Contato', <Mail className="h-6 w-6 text-primary" />, emailSchema, "email")}
          />
          <InfoCardItem 
            label="Telefone de Contato" 
            value={restaurant?.phone || "(83) 99999-9999"} 
            icon={Phone} 
            isPremium={isPremium}
            onClick={() => handleEditField('phone', 'Editar Telefone', 'Telefone de Contato', <Phone className="h-6 w-6 text-primary" />, phoneSchema, "tel", phoneMask)}
          />
        </div>

        {/* Localização e Horários */}
        <div className="px-4 mb-6 space-y-3">
          <h2 className="text-lg font-bold text-[#022D68]">Localização e Horários</h2>
          
          {/* Endereço */}
          <InfoCardItem
            label="Endereço Principal"
            value={restaurant?.address ? `${restaurant.address}, ${restaurant.neighborhood}, ${restaurant.city} - ${restaurant.state}` : null}
            icon={MapPin}
            isPremium={isPremium}
            onClick={() => setIsAddressDialogOpen(true)}
            extraContent={restaurant?.latitude && restaurant?.longitude ? (
              <p className="text-xs text-green-600 mt-1 flex items-center gap-1 font-normal">
                <Check className="h-3 w-3" /> Coordenadas Geográficas Salvas
              </p>
            ) : undefined}
          />

          {/* Horários */}
          <InfoCardItem
            label="Horários de Funcionamento"
            value={currentSchedule.monday.isOpen ? "Segunda a Sexta: 09h - 22h (Exemplo)" : null}
            icon={Clock}
            isPremium={isPremium}
            onClick={() => setIsHoursDialogOpen(true)}
          />
        </div>

        {/* Canais de Venda e Links */}
        <div className="px-4 mb-6 space-y-3">
          <h2 className="text-lg font-bold text-[#022D68]">Canais de Venda e Links</h2>
          
          <InfoCardItem 
            label="Link do WhatsApp" 
            value={restaurant?.whatsapp_url || ""} 
            icon={MessageSquare} 
            isPremium={isPremium}
            onClick={() => handleEditField('whatsapp_url', 'Editar WhatsApp', 'URL do WhatsApp', <MessageSquare className="h-6 w-6 text-primary" />, whatsappSchema, "text", undefined, "https://wa.me/5583999999999")}
          />
          <InfoCardItem 
            label="Link do iFood/Delivery App" 
            value={restaurant?.ifood_url || ""} 
            icon={UtensilsCrossed} 
            isPremium={isPremium}
            onClick={() => handleEditField('ifood_url', 'Editar iFood', 'URL do iFood', <UtensilsCrossed className="h-6 w-6 text-primary" />, ifoodSchema, "text", undefined, "https://www.ifood.com.br/restaurante/exemplo")}
          />
          <InfoCardItem 
            label="Outro Link (Ex: Site Próprio)" 
            value={restaurant?.other_url || ""} 
            icon={Globe} 
            isPremium={isPremium}
            onClick={() => handleEditField('other_url', 'Editar Outro Link', 'Outra URL', <Globe className="h-6 w-6 text-primary" />, otherUrlSchema, "text", undefined, "https://www.seusite.com.br")}
          />
        </div>

        {/* Gerenciamento de Conteúdo */}
        <div className="px-4 mb-6 space-y-3">
          <h2 className="text-lg font-bold text-[#022D68]">Gerenciamento de Conteúdo</h2>
          
          <NavCardItem 
            label="Cardápio e Itens" 
            description="Adicione, edite e remova pratos e produtos."
            icon={Utensils} 
            onClick={() => navigate(createPageUrl('restaurant-area/menu'))}
          />
          <NavCardItem 
            label="Categorias do Cardápio" 
            description="Organize seus itens em categorias."
            icon={Package} 
            onClick={() => navigate(createPageUrl('restaurant-area/categories'))}
          />
          <NavCardItem 
            label="Galeria de Fotos" 
            description="Gerencie as imagens do seu restaurante."
            icon={Camera} 
            onClick={() => showSuccess("Funcionalidade em desenvolvimento")}
          />
        </div>

        {/* Assinatura e Suporte */}
        <div className="px-4 mb-6 space-y-3">
          <h2 className="text-lg font-bold text-[#022D68]">Assinatura e Suporte</h2>
          
          <NavCardItem 
            label="Plano Premium" 
            description={isPremium ? "Ativo. Gerencie sua assinatura." : "Seja visto por mais clientes!"}
            icon={Crown} 
            onClick={() => navigate(createPageUrl('restaurant-area/upgrade'))}
          />
          <NavCardItem 
            label="Central de Ajuda" 
            description="Tutoriais e FAQ"
            icon={HelpCircle} 
            onClick={() => showSuccess("Funcionalidade em desenvolvimento")}
          />
        </div>

        {/* Logout Button */}
        <div className="px-4 mt-10 pt-6">
          <Button
            onClick={handleSignOut}
            variant="outline"
            className="w-full h-12 rounded-full border-2 border-red-500/50 hover:bg-red-50 active:scale-[0.98] transition-all justify-center px-4 shadow-md text-red-600 font-bold"
          >
            <LogOut className="h-5 w-5 mr-3" />
            <span className="font-medium">Sair da conta</span>
          </Button>
        </div>

        {/* Bottom Navigation */}
        <RestaurantBottomNav selectedTab="perfil" isFree={!isPremium} />

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
    </div>
  );
}

export default RestaurantProfileMenu;