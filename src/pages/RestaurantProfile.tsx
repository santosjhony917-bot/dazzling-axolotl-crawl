import { useState, useEffect } from "react";
import { ArrowLeft, Camera, Building2, MapPin, Clock, Phone, Mail, CreditCard, Bell, Package, HelpCircle, MessageSquare, FileCheck, LogOut, Crown, Sparkles, ChevronRight, FileText, UtensilsCrossed, Eye, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { useRestaurantProfile } from "@/hooks/useRestaurantProfile";
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
import { Skeleton } from "@/components/ui/skeleton";

// Definindo a interface do estado de edição fora do componente para clareza
interface EditingFieldState {
  key: string;
  title: string;
  fieldName: string;
  icon: React.ReactNode;
  type?: "text" | "tel" | "email";
  placeholder?: string;
  validationSchema?: z.ZodString;
  mask?: (value: string) => string;
  currentValue: string;
}

// Máscaras
const phoneMask = (value: string) => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 10) {
    return numbers.replace(/(\d{2})(\d{4})(\d{4})/, '($1) $2-$3');
  }
  return numbers.replace(/(\d{2})(\d{5})(\d{4})/, '($1) $2-$3');
};

const cnpjMask = (value: string) => {
  const numbers = value.replace(/\D/g, '');
  return numbers.replace(/(\d{2})(\d{3})(\d{3})(\d{4})(\d{2})/, '$1.$2.$3/$4-$5');
};

// Validações
const validations = {
  name: z.string().min(3, "Nome deve ter no mínimo 3 caracteres").max(100, "Nome muito longo"),
  address: z.string().min(10, "Endereço incompleto"),
  phone: z.string().regex(/^\(\d{2}\) \d{4,5}-\d{4}$/, "Telefone inválido"),
  email: z.string().email("E-mail inválido"),
  cnpj: z.string().regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, "CNPJ inválido"),
};

// Schema de validação de URL
const urlValidationSchema = z.string().url('URL inválida').regex(
  /^https?:\/\//,
  'URL deve começar com http:// ou https://'
).optional().or(z.literal(''));

// Format schedule for display (função auxiliar)
const formatScheduleDisplay = (schedule: WeekSchedule): string => {
  const days = Object.entries(schedule) as [keyof WeekSchedule, DaySchedule][];
  const openDays = days.filter(([_, day]) => day.isOpen);
  
  if (openDays.length === 0) return "Fechado";
  
  const groups: string[] = [];
  let currentGroup: string[] = [];
  let currentSlots: string = "";
  
  const dayAbbr: Record<keyof WeekSchedule, string> = {
    monday: "Seg",
    tuesday: "Ter",
    wednesday: "Qua",
    thursday: "Qui",
    friday: "Sex",
    saturday: "Sáb",
    sunday: "Dom",
  };
  
  openDays.forEach(([day, daySchedule], index) => {
    const slotsStr = daySchedule.slots.map(s => `${s.start}-${s.end}`).join(", ");
    
    if (slotsStr === currentSlots && currentGroup.length > 0) {
      currentGroup.push(dayAbbr[day]);
    } else {
      if (currentGroup.length > 0) {
        const range = currentGroup.length > 1 
          ? `${currentGroup[0]}-${currentGroup[currentGroup.length - 1]}`
          : currentGroup[0];
        groups.push(`${range}: ${currentSlots}`);
      }
      currentGroup = [dayAbbr[day]];
      currentSlots = slotsStr;
    }
    
    if (index === openDays.length - 1) {
      const range = currentGroup.length > 1 
        ? `${currentGroup[0]}-${currentGroup[currentGroup.length - 1]}`
        : currentGroup[0];
      groups.push(`${range}: ${currentSlots}`);
    }
  });
  
  return groups.join(" | ");
};


const RestaurantProfile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { restaurant, loading: restaurantLoading, updateRestaurant, refetch } = useRestaurantProfile();
  const isPremium = false; // Mockado como false, pois não há roles
  const isAdmin = false; // Mockado como false
  const { uploadImage, uploading } = useImageUpload();
  
  const [editingField, setEditingField] = useState<EditingFieldState | null>(null);

  const [isEditingHours, setIsEditingHours] = useState(false);
  const [isEditingAddress, setIsEditingAddress] = useState(false);
  
  const [notifications, setNotifications] = useState({
    orders: true,
    visits: true,
    followers: false,
  });

  // Restaurant data - agora vem do hook
  const restaurantData = {
    name: restaurant?.name || "Restaurante",
    address: restaurant?.address || "Endereço não cadastrado",
    city: restaurant?.city || "",
    state: restaurant?.state || "",
    cep: restaurant?.cep || "",
    neighborhood: restaurant?.neighborhood || "",
    category: restaurant?.category || "",
    phone: restaurant?.phone || "Não cadastrado", // Usando dados reais
    email: restaurant?.email || "Não cadastrado", // Usando dados reais
    cnpj: restaurant?.cnpj || "Não cadastrado",  // Usando dados reais
  };

  // Schedule data (using mock initial state if not loaded from DB)
  const initialSchedule: WeekSchedule = {
    monday: { isOpen: false, slots: [] },
    tuesday: { isOpen: true, slots: [{ start: "11:00", end: "23:00" }] },
    wednesday: { isOpen: true, slots: [{ start: "11:00", end: "23:00" }] },
    thursday: { isOpen: true, slots: [{ start: "11:00", end: "23:00" }] },
    friday: { isOpen: true, slots: [{ start: "11:00", end: "23:00" }] },
    saturday: { isOpen: true, slots: [{ start: "12:00", end: "00:00" }] },
    sunday: { isOpen: true, slots: [{ start: "12:00", end: "00:00" }] },
  };
  
  const [schedule, setSchedule] = useState<WeekSchedule>(initialSchedule);

  useEffect(() => {
    if (restaurant?.opening_hours) {
      setSchedule(restaurant.opening_hours);
    }
  }, [restaurant?.opening_hours]);

  const handleEdit = (field: 'name' | 'whatsapp' | 'ifood' | 'other' | 'address' | 'phone' | 'email' | 'cnpj') => {
    // Special handling for address - use EditAddressDialog
    if (field === 'address') {
      setIsEditingAddress(true);
      return;
    }

    const fieldConfig: Record<string, any> = {
      name: {
        title: "Nome Comercial",
        fieldName: "Nome do estabelecimento",
        icon: <Building2 className="h-6 w-6 text-[#022D68]" />,
        placeholder: "Ex: Pizzaria do Bairro",
        validationSchema: validations.name,
        currentValue: restaurant?.name || "",
      },
      whatsapp: {
        title: "Link WhatsApp",
        fieldName: "URL do WhatsApp",
        icon: <MessageSquare className="h-6 w-6 text-[#25D366]" />,
        placeholder: "https://wa.me/5511987654321",
        validationSchema: urlValidationSchema,
        currentValue: restaurant?.whatsapp_url || "",
      },
      ifood: {
        title: "Link iFood",
        fieldName: "URL do iFood",
        icon: <Package className="h-6 w-6 text-[#EA1D2C]" />,
        placeholder: "https://www.ifood.com.br/...",
        validationSchema: urlValidationSchema,
        currentValue: restaurant?.ifood_url || "",
      },
      other: {
        title: "Outro Link",
        fieldName: "URL de outro canal",
        icon: <UtensilsCrossed className="h-6 w-6 text-[#022D68]" />,
        placeholder: "https://...",
        validationSchema: urlValidationSchema,
        currentValue: restaurant?.other_url || "",
      },
    };

    setEditingField({
      key: field,
      ...fieldConfig[field],
      currentValue: fieldConfig[field].currentValue,
    });
  };

  const handleSaveField = async (value: string) => {
    if (!editingField) return;
    
    // Map field keys to database column names
    const fieldMapping: Record<string, string> = {
      name: 'name',
      whatsapp: 'whatsapp_url',
      ifood: 'ifood_url',
      other: 'other_url',
    };
    
    const dbField = fieldMapping[editingField.key] || editingField.key;
    
    // Salvar no banco de dados
    const { error } = await updateRestaurant({
      [dbField]: value
    });

    if (error) {
      toast({
        title: "Erro ao salvar",
        description: error,
        variant: "destructive",
      });
      setEditingField(null);
      return;
    }

    toast({
      title: "Salvo com sucesso",
      description: `${editingField.title} atualizado`,
    });
    
    setEditingField(null);
  };

  const handleSaveHours = async (newSchedule: WeekSchedule) => {
    setSchedule(newSchedule);
    
    // Salvar no banco de dados
    const { error } = await updateRestaurant({
      opening_hours: newSchedule
    });

    if (error) {
      toast({
        title: "Erro ao salvar",
        description: error,
        variant: "destructive",
      });
      throw new Error(error);
    }
  };

  const handleLogout = async () => {
    // Logout do Supabase
    await supabase.auth.signOut(); // Usando signOut direto do Supabase
    
    // Limpar dados locais (não há mais UserContext)
    
    toast({
      title: "Logout realizado",
      description: "Até logo!",
    });
    
    navigate("/welcome");
  };

  const handleUpgradeToPremium = () => {
    navigate("/upgrade"); // Usando a rota correta
  };

  const handleUploadLogo = async (file: File) => {
    if (!restaurant?.id) return;

    const { url, error } = await uploadImage(file, 'restaurant-logos', restaurant.id);

    if (error) {
      toast({
        title: "Erro no upload",
        description: error,
        variant: "destructive",
      });
      return;
    }

    if (url) {
      // Update restaurant logo in database
      const { error: updateError } = await updateRestaurant({ logo_url: url });

      if (updateError) {
        toast({
          title: "Erro ao salvar",
          description: "Não foi possível atualizar o logo",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Logo atualizado!",
        description: "Seu logo foi atualizado com sucesso",
      });
    }
  };

  const handleUploadCover = async (file: File) => {
    if (!isPremium) {
      toast({
        title: "Recurso Premium",
        description: "Faça upgrade para personalizar fotos de capa",
        variant: "default",
      });
      navigate("/upgrade"); // Usando a rota correta
      return;
    }

    if (!restaurant?.id) return;

    const { url, error } = await uploadImage(file, 'restaurant-photos', restaurant.id, 'cover');

    if (error) {
      toast({
        title: "Erro no upload",
        description: error,
        variant: "destructive",
      });
      return;
    }

    if (url) {
      // Update restaurant cover in database
      const { error: updateError } = await updateRestaurant({ cover_image_url: url });

      if (updateError) {
        toast({
          title: "Erro ao salvar",
          description: "Não foi possível atualizar a capa",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Capa atualizada!",
        description: "Sua foto de capa foi atualizada com sucesso",
      });
    }
  };

  if (restaurantLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 max-w-md mx-auto">
        <Skeleton className="h-32 w-full rounded-b-[20px] mb-6" />
        <div className="px-4 -mt-16 relative z-20">
          <Card className="p-6 shadow-sm rounded-3xl">
            <div className="flex items-start gap-4">
              <Skeleton className="w-20 h-20 rounded-full" />
              <div className="flex-1 space-y-2 pt-2">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-8 w-full rounded-full" />
              </div>
            </div>
          </Card>
        </div>
        <div className="px-4 mt-6 space-y-8">
          <Skeleton className="h-16 w-full rounded-3xl" />
          <Skeleton className="h-96 w-full rounded-3xl" />
        </div>
        <RestaurantBottomNav selectedTab="perfil" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20" style={{ backgroundColor: '#F5F5F5' }}>
      {/* Header */}
      <div className="relative h-32 overflow-hidden rounded-b-[20px] bg-gradient-to-r from-[#002E6D] to-[#014D9F]">
        {restaurant?.cover_image_url && (
          <img 
            src={restaurant.cover_image_url} 
            alt="Capa do Restaurante" 
            className="w-full h-full object-cover absolute inset-0" 
          />
        )}
        <div className="absolute inset-0 bg-black/30" />
        <div className="absolute top-4 left-4 z-10">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-white/10"
            onClick={() => navigate(-1)}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {/* Profile Header Card */}
      <div className="px-4 -mt-16 relative z-20">
        <Card className="p-6 shadow-sm rounded-3xl">
          <div className="flex items-start gap-4">
            {/* Restaurant Photo */}
            <div className="relative">
              <div className="w-20 h-20 rounded-full bg-[#022D68] flex items-center justify-center overflow-hidden shadow-lg">
                {restaurant?.logo_url ? (
                  <img src={restaurant.logo_url} alt="Restaurant Logo" loading="lazy" className="w-full h-full object-cover" />
                ) : (
                  <img src={restaurantLogo} alt="Restaurant Logo" loading="lazy" className="w-full h-full object-cover" />
                )}
              </div>
              <ImageUploadButton
                onFileSelect={handleUploadLogo}
                uploading={uploading}
                variant="ghost"
                size="icon"
                className="absolute -bottom-1 -right-1 w-7 h-7 bg-[#E47948] rounded-full flex items-center justify-center shadow-md hover:scale-110 transition-transform p-0"
              >
                <Camera className="h-3.5 w-3.5 text-white" />
              </ImageUploadButton>
            </div>

            {/* Restaurant Info */}
            <div className="flex-1">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h1 className="text-lg font-bold text-foreground">{restaurantData.name}</h1>
                  <p className="text-sm text-muted-foreground">Estabelecimento comercial</p>
                </div>
                <Badge 
                  className={isPremium 
                    ? "bg-gradient-to-r from-yellow-400 to-yellow-600 text-white border-none flex items-center gap-1" 
                    : "bg-[#E9ECEF] text-[#343A40]"
                  }
                >
                  {isPremium && <Crown className="h-3 w-3" />}
                  {isPremium ? "Premium" : "Plano Free"}
                </Badge>
              </div>
              {isPremium ? (
                <ImageUploadButton
                  onFileSelect={handleUploadCover}
                  uploading={uploading}
                  variant="outline"
                  size="sm"
                  className="mt-3 text-xs"
                >
                  <Camera className="h-3 w-3 mr-1" />
                  Alterar foto de capa
                </ImageUploadButton>
              ) : (
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="mt-3 text-xs"
                  onClick={handleUpgradeToPremium}
                >
                  🔒 Editar capa (Premium)
                </Button>
              )}
            </div>
          </div>
        </Card>
      </div>

      {/* Main Content */}
      <div className="px-4 mt-6 space-y-8">
        {/* Ver Meu Perfil Público */}
        <div>
          <Card className="bg-white border-border/10 shadow-sm rounded-3xl">
            <button 
              onClick={() => navigate(`/restaurant-profile/${restaurant?.id || 'mock-id'}`)}
              className="w-full p-4 flex items-center gap-3 hover:bg-[#F8F9FA] transition-colors rounded-3xl"
            >
              <div className="w-12 h-12 rounded-full bg-[#E47948]/10 flex items-center justify-center">
                <Eye className="h-6 w-6 text-[#E47948]" />
              </div>
              <div className="flex-1 text-left">
                <p className="text-sm font-bold text-foreground">Ver meu perfil público</p>
                <p className="text-xs text-muted-foreground">Visualize como os clientes veem seu restaurante</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          </Card>
        </div>

        {/* Informações do Estabelecimento */}
        <div>
          <h2 className="text-base font-bold text-foreground mb-4">Informações do Estabelecimento</h2>
          
          <Card className="divide-y border-border/10 shadow-sm rounded-3xl">
            <button 
              onClick={() => handleEdit('name')}
              className="w-full p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors"
            >
              <Building2 className="h-5 w-5 text-[#022D68]" />
              <div className="flex-1 text-left">
                <p className="text-xs text-muted-foreground">Nome Comercial</p>
                <p className="text-sm font-medium text-foreground">{restaurantData.name}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>

            <button 
              onClick={() => handleEdit('address')}
              className="w-full p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors"
            >
              <MapPin className="h-5 w-5 text-[#022D68]" />
              <div className="flex-1 text-left">
                <p className="text-xs text-muted-foreground">Endereço</p>
                <p className="text-sm font-medium text-foreground">
                  {restaurantData.address || "Não cadastrado"}
                </p>
                {(restaurantData.neighborhood || restaurantData.city) && (
                  <p className="text-xs text-muted-foreground mt-0.5">
                    {[restaurantData.neighborhood, restaurantData.city, restaurantData.state]
                      .filter(Boolean)
                      .join(', ')}
                  </p>
                )}
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>

            <button 
              onClick={() => setIsEditingHours(true)}
              className="w-full p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors"
            >
              <Clock className="h-5 w-5 text-[#022D68]" />
              <div className="flex-1 text-left">
                <p className="text-xs text-muted-foreground">Horários de funcionamento</p>
                <p className="text-sm font-medium text-foreground">{formatScheduleDisplay(schedule)}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>

            <button 
              onClick={() => handleEdit('phone')}
              className="w-full p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors"
            >
              <Phone className="h-5 w-5 text-[#022D68]" />
              <div className="flex-1 text-left">
                <p className="text-xs text-muted-foreground">Contato / WhatsApp</p>
                <p className="text-sm font-medium text-foreground">{restaurantData.phone}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>

            <button 
              onClick={() => handleEdit('email')}
              className="w-full p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors"
            >
              <Mail className="h-5 w-5 text-[#022D68]" />
              <div className="flex-1 text-left">
                <p className="text-xs text-muted-foreground">E-mail</p>
                <p className="text-sm font-medium text-foreground">{restaurantData.email}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>

            <button 
              onClick={() => handleEdit('cnpj')}
              className="w-full p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors"
            >
              <FileText className="h-5 w-5 text-[#022D68]" />
              <div className="flex-1 text-left">
                <p className="text-xs text-muted-foreground">CNPJ</p>
                <p className="text-sm font-medium text-foreground">{restaurantData.cnpj}</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          </Card>
        </div>

        {/* Canais de Pedido - Apenas Premium */}
        {isPremium && (
          <div>
            <h2 className="text-base font-bold text-foreground mb-4 flex items-center gap-2">
              Canais de Pedido
              <Badge className="bg-gradient-to-r from-yellow-400 to-yellow-600 text-white border-none text-[10px]">
                Premium
              </Badge>
            </h2>
            
            <Card className="divide-y border-border/10 shadow-sm rounded-3xl">
              <button 
                onClick={() => handleEdit('whatsapp')}
                className="w-full p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors"
              >
                <MessageSquare className="h-5 w-5 text-[#25D366]" />
                <div className="flex-1 text-left">
                  <p className="text-xs text-muted-foreground">Link WhatsApp</p>
                  <p className="text-sm font-medium text-foreground">
                    {restaurant?.whatsapp_url || "Não configurado"}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>

              <button 
                onClick={() => handleEdit('ifood')}
                className="w-full p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors"
              >
                <Package className="h-5 w-5 text-[#EA1D2C]" />
                <div className="flex-1 text-left">
                  <p className="text-xs text-muted-foreground">Link iFood</p>
                  <p className="text-sm font-medium text-foreground">
                    {restaurant?.ifood_url || "Não configurado"}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>

              <button 
                onClick={() => handleEdit('other')}
                className="w-full p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors"
              >
                <UtensilsCrossed className="h-5 w-5 text-[#022D68]" />
                <div className="flex-1 text-left">
                  <p className="text-xs text-muted-foreground">Outro Link</p>
                  <p className="text-sm font-medium text-foreground">
                    {restaurant?.other_url || "Não configurado"}
                  </p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            </Card>
          </div>
        )}

        {/* Cardápio e Categorias */}
        <div>
          <h2 className="text-base font-bold text-foreground mb-4">Cardápio</h2>
          
          <Card className="divide-y border-border/10 shadow-sm rounded-3xl">
            <button 
              onClick={() => navigate('/restaurant-area/menu')} 
              className="w-full p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors"
            >
              <UtensilsCrossed className="h-5 w-5 text-[#E47948]" />
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-foreground">Atualizar Cardápio</p>
                <p className="text-xs text-muted-foreground">Adicionar, editar ou remover pratos</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
            
            <button 
              onClick={() => navigate('/restaurant-area/categories')} 
              className="w-full p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors"
            >
              <Package className="h-5 w-5 text-[#E47948]" />
              <div className="flex-1 text-left">
                <p className="text-sm font-semibold text-foreground">Gerenciar Categorias</p>
                <p className="text-xs text-muted-foreground">Entradas, Pratos Principais, Bebidas, etc.</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          </Card>
        </div>

        {/* Plano e Assinatura - Apenas para usuários Free */}
        {!isPremium && (
          <div>
            <h2 className="text-base font-bold text-foreground mb-4">Plano e Assinatura</h2>
            
            <Card className="p-4 border-border/10 shadow-sm rounded-3xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center">
                  <Crown className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-foreground">Plano atual: Free</h3>
                  <p className="text-xs text-muted-foreground">Recursos básicos</p>
                </div>
              </div>

              <div className="bg-gradient-to-br from-yellow-50 to-orange-50 rounded-lg p-4 mb-4">
                <h4 className="font-semibold text-sm mb-2 flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-[#E47948]" />
                  Desbloqueie com Premium:
                </h4>
                <ul className="space-y-1.5 text-xs text-muted-foreground">
                  <li>💎 Destaque na busca</li>
                  <li>🏆 Aparência personalizada</li>
                  <li>📊 Estatísticas detalhadas</li>
                  <li>🎨 Edição avançada de cardápio</li>
                  <li>🔔 Notificações para seguidores</li>
                </ul>
              </div>

              <Button 
                onClick={handleUpgradeToPremium}
                className="w-full bg-gradient-to-r from-yellow-400 to-amber-600 hover:from-yellow-500 hover:to-amber-700 text-white font-semibold shadow-md hover:shadow-lg transition-all"
              >
                <Crown className="h-4 w-4 mr-2" />
                Ativar Premium
              </Button>
            </Card>
          </div>
        )}

        {/* Plano e Assinatura - Para usuários Premium */}
        {isPremium && (
          <div>
            <h2 className="text-base font-bold text-foreground mb-4">Plano e Assinatura</h2>
            
            <Card className="p-4 border-border/10 shadow-sm rounded-3xl">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 flex items-center justify-center">
                  <Crown className="h-6 w-6 text-white" />
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-foreground">Plano Premium Ativo</h3>
                  <p className="text-xs text-muted-foreground">Todos os recursos desbloqueados</p>
                </div>
              </div>

              <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-4 mb-4">
                <div className="flex items-center gap-2 mb-3">
                  <Check className="h-4 w-4 text-green-600" />
                  <p className="text-sm font-semibold text-foreground">Recursos Premium ativos:</p>
                </div>
                <ul className="space-y-1.5 text-xs text-muted-foreground ml-6">
                  <li>✅ Destaque garantido nas buscas</li>
                  <li>✅ Fotos de capa e ambiente</li>
                  <li>✅ Badge verificado</li>
                  <li>✅ Estatísticas completas</li>
                  <li>✅ Suporte prioritário</li>
                </ul>
              </div>

              <Button 
                onClick={() => navigate('/restaurant-area/manage-subscription')}
                variant="outline"
                className="w-full"
              >
                <CreditCard className="h-4 w-4 mr-2" />
                Gerenciar Assinatura
              </Button>
            </Card>
          </div>
        )}

        {/* Preferências e Personalização */}
        <div>
          <h2 className="text-base font-bold text-foreground mb-4">Preferências e Personalização</h2>
          
          <Card className="divide-y border-border/10 shadow-sm rounded-3xl">
            <div className="p-4">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-3">
                  <Bell className="h-5 w-5 text-[#022D68]" />
                  <div>
                    <p className="text-sm font-medium text-foreground">Notificações e alertas</p>
                  </div>
                </div>
              </div>
              <div className="space-y-3 ml-8">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Alertas de pedidos</span>
                  <Switch 
                    checked={notifications.orders}
                    onCheckedChange={(checked) => setNotifications({...notifications, orders: checked})}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Alertas de visitas</span>
                  <Switch 
                    checked={notifications.visits}
                    onCheckedChange={(checked) => setNotifications({...notifications, visits: checked})}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Novos seguidores</span>
                  <Switch 
                    checked={notifications.followers}
                    onCheckedChange={(checked) => setNotifications({...notifications, followers: checked})}
                  />
                </div>
              </div>
            </div>

            <button 
              onClick={() => {
                if (isPremium) {
                  navigate("/restaurant-area/integrations");
                } else {
                  toast({
                    title: "Recurso Premium",
                    description: "Faça upgrade para gerenciar seus canais de pedido",
                    variant: "default",
                  });
                  navigate("/upgrade");
                }
              }}
              className="w-full p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors"
            >
              <Package className="h-5 w-5 text-[#022D68]" />
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-foreground">Canais de Pedido</p>
                <p className="text-xs text-muted-foreground">
                  {isPremium ? "WhatsApp, iFood, Anota Aí" : "🔒 Premium: Gerenciar canais"}
                </p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>
          </Card>
        </div>

        {/* Suporte e Conta */}
        <div>
          <h2 className="text-base font-bold text-foreground mb-4">Suporte e Conta</h2>
          
          <Card className="divide-y border-border/10 shadow-sm rounded-3xl">
            {isAdmin && (
              <button 
                onClick={() => navigate("/admin/dashboard")}
                className="w-full p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors"
              >
                <Crown className="h-5 w-5 text-red-600" />
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium text-red-600">Acessar Painel Admin</p>
                  <p className="text-xs text-muted-foreground">Gerenciamento de sistema (Apenas Admin)</p>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </button>
            )}

            <button 
              onClick={() => navigate("/restaurant-area/help-center")}
              className="w-full p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors"
            >
              <HelpCircle className="h-5 w-5 text-[#022D68]" />
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-foreground">Central de Ajuda</p>
                <p className="text-xs text-muted-foreground">Tutoriais e perguntas frequentes</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>

            <button 
              onClick={() => navigate("/restaurant-area/support")}
              className="w-full p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors"
            >
              <MessageSquare className="h-5 w-5 text-[#022D68]" />
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-foreground">Falar com o Suporte</p>
                <p className="text-xs text-muted-foreground">Chat direto com equipe FilterFood</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>

            <button 
              onClick={() => navigate("/restaurant-area/terms")}
              className="w-full p-4 flex items-center gap-3 hover:bg-muted/50 transition-colors"
            >
              <FileCheck className="h-5 w-5 text-[#022D68]" />
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-foreground">Termos e Política de Privacidade</p>
                <p className="text-xs text-muted-foreground">Leitura e aceite</p>
              </div>
              <ChevronRight className="h-4 w-4 text-muted-foreground" />
            </button>

            <button 
              onClick={handleLogout}
              className="w-full p-4 flex items-center gap-3 hover:bg-red-50 transition-colors"
            >
              <LogOut className="h-5 w-5 text-red-600" />
              <div className="flex-1 text-left">
                <p className="text-sm font-medium text-red-600">Sair da conta</p>
              </div>
            </button>
          </Card>
        </div>
        
        {/* Botão de Promoção a Admin (Apenas para Dev) */}
        {/* <PromoteToAdminButton /> */}
      </div>

      {/* Edit Field Dialog */}
      {editingField && (
        <EditFieldDialog
          isOpen={true}
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
        open={isEditingHours}
        onOpenChange={setIsEditingHours}
        currentSchedule={schedule}
        onSave={handleSaveHours}
      />

      {/* Edit Address Dialog */}
      {restaurant?.id && (
        <EditAddressDialog
          open={isEditingAddress}
          onOpenChange={setIsEditingAddress}
          restaurantId={restaurant.id}
          currentAddress={{
            address: restaurant.address,
            city: restaurant.city,
            state: restaurant.state,
            cep: restaurant.cep,
            neighborhood: restaurant.neighborhood,
            latitude: restaurant.latitude,
            longitude: restaurant.longitude,
          }}
          onSave={() => window.location.reload()}
        />
      )}

      <RestaurantBottomNav selectedTab="perfil" />
    </div>
  );
};

export default RestaurantProfile;