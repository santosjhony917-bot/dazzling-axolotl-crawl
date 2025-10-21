import React, { useState, useEffect, useCallback } from "react";
import { ArrowLeft, Camera, Building2, MapPin, Clock, Phone, Mail, CreditCard, Bell, Package, HelpCircle, MessageSquare, FileCheck, LogOut, Crown, Sparkles, ChevronRight, FileText, UtensilsCrossed, Eye, Check, Lock, Edit, Store, Badge as BadgeIcon, BarChart3, Utensils, Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useRestaurantProfile } from "@/hooks/useRestaurantProfile";
import { useUserRole } from "@/hooks/useUserRole";
import { useImageUpload } from "@/hooks/useImageUpload";
import RestaurantBottomNav from "@/components/restaurant/RestaurantBottomNav";
import EditFieldDialog from "@/components/EditFieldDialog";
import { EditHoursDialog } from "@/components/EditHoursDialog";
import { EditAddressDialog } from "@/components/EditAddressDialog";
import { ImageUploadButton } from "@/components/ImageUploadButton";
import restaurantLogo from "@/assets/restaurant-logo.png";
import { z } from "zod";
import { WeekSchedule, DaySchedule } from "@/types/schedule";
import { geocodeAddress } from "@/services/geocoding";
import { supabase } from "@/integrations/supabase/client";
import { createPageUrl } from "@/utils/url";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import RestaurantHeader from "@/components/restaurant/RestaurantHeader";
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

// Definindo a interface EditingFieldState
interface EditingFieldState {
  key: string;
  title: string;
  fieldName: string;
  icon: React.ReactNode;
  currentValue: string;
  placeholder?: string;
  type: "text" | "tel" | "email";
  validationSchema: z.ZodType<string>; // Ajustado para aceitar ZodType<string>
  mask?: (value: string) => string;
}

export default function RestaurantProfileMenu() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { signOut } = useAuth();
  
  // Mock restaurant ID for development until proper auth flow is implemented
  const MOCK_RESTAURANT_ID = "a1b2c3d4-e5f6-7890-1234-567890abcdef"; 
  const { restaurant, loading: restaurantLoading, updateRestaurant, refetch } = useRestaurantProfile(MOCK_RESTAURANT_ID);
  const { isPremium, isLoading: roleLoading } = useUserRole();
  const { uploadImage, uploading } = useImageUpload();

  // --- Dialog States ---
  const [editingField, setEditingField] = useState<EditingFieldState | null>(null);
  const [isHoursDialogOpen, setIsHoursDialogOpen] = useState(false);
  const [isAddressDialogOpen, setIsAddressDialogOpen] = useState(false);

  // --- Handlers ---
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
    
    // Special handling for address fields (which require geocoding)
    if (key === 'address' || key === 'city' || key === 'state' || key === 'cep' || key === 'neighborhood') {
        // We use the dedicated EditAddressDialog for full address updates
        showError("Use o botão 'Editar Endereço' para atualizar a localização completa.");
        return;
    }

    const updates = { [key]: value };
    const { error } = await updateRestaurant(updates);

    if (error) {
      showError(error);
      throw new Error(error); // Throw to keep the dialog open
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

  // --- Renderização de Componentes Auxiliares ---
  const InfoItem: React.FC<{ label: string; value: string | null; icon: React.ElementType; onClick: () => void; isPremiumFeature?: boolean }> = ({ label, value, icon: Icon, onClick, isPremiumFeature = false }) => (
    <div className="flex items-start gap-3 pb-3 border-b border-border/50 last:border-b-0">
      <Icon className="h-5 w-5 text-[#E47948] mt-0.5 shrink-0" />
      <div className="flex-1">
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className={cn("text-sm font-medium text-foreground mt-0.5", !value && "italic text-gray-400")}>
          {value || "Não definido"}
        </p>
      </div>
      <Button 
        size="sm" 
        variant="ghost"
        className="h-7 w-7 p-0 hover:bg-[#E47948]/10 text-[#E47948] shrink-0"
        onClick={(e) => {
          e.stopPropagation();
          if (isPremiumFeature && !isPremium) {
            navigate(createPageUrl('restaurant-area/upgrade'));
          } else {
            onClick();
          }
        }}
        disabled={isPremiumFeature && !isPremium}
      >
        {isPremiumFeature && !isPremium ? <Lock className="h-3.5 w-3.5 text-gray-400" /> : <Edit className="h-3.5 w-3.5" />}
      </Button>
    </div>
  );

  const NavItem: React.FC<{ label: string; icon: React.ElementType; onClick: () => void; description?: string }> = ({ label, icon: Icon, onClick, description }) => (
    <button 
      onClick={onClick}
      className={cn(
        "w-full p-4 flex justify-between items-center transition-colors text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50"
      )}
    >
      <span className="flex items-center gap-3 text-left">
        <Icon className="w-5 h-5 shrink-0 text-[#022D68]" />
        <div>
          <p className="text-sm font-medium text-foreground">
            {label}
          </p>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
      </span>
      <ChevronRight className="w-5 h-5 text-gray-400" />
    </button>
  );

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
    <div className="min-h-screen bg-[#f5f7f8] pb-20 max-w-md mx-auto">
      
      {/* Cover Image Area */}
      <div className="relative h-40 w-full bg-gray-300 dark:bg-gray-700">
        <img 
          src={restaurant?.cover_image_url || "https://via.placeholder.com/600x200?text=Capa+do+Restaurante"} 
          alt="Capa do Restaurante" 
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/20" />
        
        {/* Upload Cover Button */}
        <ImageUploadButton
          onFileSelect={(file) => handleFileSelect(file, 'cover')}
          uploading={uploading}
          className="absolute bottom-2 right-2 h-8 w-8 p-0 bg-white/80 text-primary hover:bg-white"
          variant="ghost"
          size="icon"
        >
          <Camera className="h-4 w-4" />
        </ImageUploadButton>
      </div>

      {/* Restaurant Header & Logo */}
      <div className="px-4 -mt-12 mb-6">
        <Card className="bg-white border border-border/10 rounded-3xl p-6 relative shadow-xl">
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
                className="absolute bottom-0 right-0 h-6 w-6 p-0 bg-highlight text-white hover:bg-highlight/90"
                variant="default"
                size="icon"
              >
                <Camera className="h-3 w-3" />
              </ImageUploadButton>
            </div>
            
            {/* Info */}
            <div className="flex-1 pt-2">
              <h3 className="font-bold text-xl text-[#022D68]">{restaurant?.name || "Nome do Restaurante"}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge 
                  variant={isPremium ? "default" : "outline"} 
                  className={cn(
                    "text-xs font-semibold",
                    isPremium ? "bg-highlight text-white hover:bg-highlight/90" : "border-gray-400 text-gray-600"
                  )}
                >
                  {isPremium ? <Crown className="w-3 h-3 mr-1 fill-white" /> : <Store className="w-3 h-3 mr-1" />}
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
      <div className="px-4 mb-6 space-y-4">
        <h2 className="text-base font-bold text-[#022D68]">Informações Básicas</h2>
        
        <Card className="bg-white border border-border/10 rounded-3xl p-4 space-y-4 shadow-sm">
          <InfoItem 
            label="Nome do Restaurante" 
            value={restaurant?.name || ""} 
            icon={Building2} 
            onClick={() => handleEditField('name', 'Editar Nome', 'Nome do Restaurante', <Building2 className="h-6 w-6 text-primary" />, nameSchema)}
          />
          <InfoItem 
            label="Categoria Principal" 
            value={restaurant?.category || "Não definida"} 
            icon={Utensils} 
            onClick={() => handleEditField('category', 'Editar Categoria', 'Categoria Principal', <Utensils className="h-6 w-6 text-primary" />, nameSchema, "text", undefined, "Ex: Pizzaria, Hamburgueria")}
          />
          <InfoItem 
            label="CNPJ" 
            value={restaurant?.cnpj || "Não definido"} 
            icon={FileText} 
            onClick={() => handleEditField('cnpj', 'Editar CNPJ', 'CNPJ', <FileText className="h-6 w-6 text-primary" />, cnpjSchema, "text", cnpjMask, "XX.XXX.XXX/XXXX-XX")}
          />
          <InfoItem 
            label="E-mail de Contato" 
            value={restaurant?.email || ""} 
            icon={Mail} 
            onClick={() => handleEditField('email', 'Editar E-mail', 'E-mail de Contato', <Mail className="h-6 w-6 text-primary" />, emailSchema, "email")}
          />
          <InfoItem 
            label="Telefone de Contato" 
            value={restaurant?.phone || ""} 
            icon={Phone} 
            onClick={() => handleEditField('phone', 'Editar Telefone', 'Telefone de Contato', <Phone className="h-6 w-6 text-primary" />, phoneSchema, "tel", phoneMask)}
          />
        </Card>
      </div>

      {/* Localização e Horários */}
      <div className="px-4 mb-6 space-y-4">
        <h2 className="text-base font-bold text-[#022D68]">Localização e Horários</h2>
        
        <Card className="bg-white border border-border/10 rounded-3xl p-4 space-y-4 shadow-sm">
          {/* Endereço */}
          <div className="flex items-start gap-3 pb-3 border-b border-border/50">
            <MapPin className="h-5 w-5 text-[#E47948] mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Endereço Principal</p>
              <p className={cn("text-sm font-medium text-foreground mt-0.5", !restaurant?.address && "italic text-gray-400")}>
                {restaurant?.address ? `${restaurant.address}, ${restaurant.neighborhood}, ${restaurant.city} - ${restaurant.state}` : "Não definido"}
              </p>
              {restaurant?.latitude && restaurant?.longitude && (
                <p className="text-xs text-green-600 mt-1 flex items-center gap-1">
                  <Check className="h-3 w-3" /> Coordenadas Geográficas Salvas
                </p>
              )}
            </div>
            <Button 
              size="sm" 
              variant="ghost"
              className="h-7 w-7 p-0 hover:bg-[#E47948]/10 text-[#E47948] shrink-0"
              onClick={() => setIsAddressDialogOpen(true)}
            >
              <Edit className="h-3.5 w-3.5" />
            </Button>
          </div>

          {/* Horários */}
          <div className="flex items-start gap-3">
            <Clock className="h-5 w-5 text-[#E47948] mt-0.5 shrink-0" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Horários de Funcionamento</p>
              <p className="text-sm font-medium text-foreground mt-0.5">
                {currentSchedule.monday.isOpen ? "Segunda a Sexta: 09h - 22h (Exemplo)" : "Horários não definidos"}
              </p>
            </div>
            <Button 
              size="sm" 
              variant="ghost"
              className="h-7 w-7 p-0 hover:bg-[#E47948]/10 text-[#E47948] shrink-0"
              onClick={() => setIsHoursDialogOpen(true)}
            >
              <Edit className="h-3.5 w-3.5" />
            </Button>
          </div>
        </Card>
      </div>

      {/* Canais de Pedido */}
      <div className="px-4 mb-6 space-y-4">
        <h2 className="text-base font-bold text-[#022D68]">Canais de Pedido (Links)</h2>
        
        <Card className="bg-white border border-border/10 rounded-3xl p-4 space-y-4 shadow-sm">
          <InfoItem 
            label="Link do WhatsApp" 
            value={restaurant?.whatsapp_url || ""} 
            icon={MessageSquare} 
            onClick={() => handleEditField('whatsapp_url', 'Editar WhatsApp', 'URL do WhatsApp', <MessageSquare className="h-6 w-6 text-primary" />, whatsappSchema, "text", undefined, "https://wa.me/5583999999999")}
          />
          <InfoItem 
            label="Link do iFood/Delivery App" 
            value={restaurant?.ifood_url || ""} 
            icon={UtensilsCrossed} 
            onClick={() => handleEditField('ifood_url', 'Editar iFood', 'URL do iFood', <UtensilsCrossed className="h-6 w-6 text-primary" />, ifoodSchema, "text", undefined, "https://www.ifood.com.br/restaurante/exemplo")}
          />
          <InfoItem 
            label="Outro Link (Ex: Site Próprio)" 
            value={restaurant?.other_url || ""} 
            icon={Globe} 
            onClick={() => handleEditField('other_url', 'Editar Outro Link', 'Outra URL', <Globe className="h-6 w-6 text-primary" />, otherUrlSchema, "text", undefined, "https://www.seusite.com.br")}
          />
        </Card>
      </div>

      {/* Gerenciamento de Conteúdo */}
      <div className="px-4 mb-6 space-y-4">
        <h2 className="text-base font-bold text-[#022D68]">Gerenciamento de Conteúdo</h2>
        
        <Card className="bg-white border border-border/10 rounded-3xl shadow-sm divide-y divide-gray-200 dark:divide-gray-700">
          <NavItem 
            label="Cardápio e Itens" 
            description="Adicione, edite e remova pratos e produtos."
            icon={Utensils} 
            onClick={() => navigate(createPageUrl('restaurant-area/menu'))}
          />
          <NavItem 
            label="Categorias do Cardápio" 
            description="Organize seus itens em categorias."
            icon={Package} 
            onClick={() => navigate(createPageUrl('restaurant-area/categories'))}
          />
          <NavItem 
            label="Galeria de Fotos" 
            description="Gerencie as imagens do seu restaurante."
            icon={Camera} 
            onClick={() => showSuccess("Funcionalidade em desenvolvimento")}
          />
        </Card>
      </div>

      {/* Assinatura e Suporte */}
      <div className="px-4 mb-6 space-y-4">
        <h2 className="text-base font-bold text-[#022D68]">Assinatura e Suporte</h2>
        
        <Card className="bg-white border border-border/10 rounded-3xl shadow-sm divide-y divide-gray-200 dark:divide-gray-700">
          <NavItem 
            label="Plano Premium" 
            description={isPremium ? "Ativo. Gerencie sua assinatura." : "Seja visto por mais clientes!"}
            icon={Crown} 
            onClick={() => navigate(createPageUrl('restaurant-area/upgrade'))}
          />
          <NavItem 
            label="Central de Ajuda" 
            description="Tutoriais e FAQ"
            icon={HelpCircle} 
            onClick={() => showSuccess("Funcionalidade em desenvolvimento")}
          />
        </Card>
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

      {/* Edit Field Dialog */}
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