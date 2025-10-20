import { useState, useEffect } from "react";
import { ArrowLeft, Camera, Building2, MapPin, Clock, Phone, Mail, CreditCard, Bell, Package, HelpCircle, MessageSquare, FileCheck, LogOut, Crown, Sparkles, ChevronRight, FileText, UtensilsCrossed, Eye, Check, Lock, Edit, Store, Badge as BadgeIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useUser } from "@/contexts/UserContext";
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

const RestaurantProfile = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { logout } = useUser();
  const { signOut } = useAuth();
  
  // Mock restaurant ID for development until proper auth flow is implemented
  const MOCK_RESTAURANT_ID = "a1b2c3d4-e5f6-7890-1234-567890abcdef"; 
  const { restaurant, loading: restaurantLoading, updateRestaurant, refetch } = useRestaurantProfile(MOCK_RESTAURANT_ID);
  
  const { isPremium, isAdmin } = useUserRole(); // Using mock hook
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
    phone: restaurant?.phone || "Não cadastrado",
    email: restaurant?.email || "Não cadastrado",
    cnpj: restaurant?.cnpj || "Não cadastrado",
    whatsapp_url: restaurant?.whatsapp_url || "",
    ifood_url: restaurant?.ifood_url || "",
    other_url: restaurant?.other_url || "",
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

  // Format schedule for display
  const formatScheduleDisplay = (schedule: WeekSchedule): string => {
    const days = Object.entries(schedule) as [keyof WeekSchedule, DaySchedule][];
    const openDays = days.filter(([_, day]) => day.isOpen);
    
    if (openDays.length === 0) return "Fechado";
    
    // Group consecutive days with same schedule
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


  const handleEdit = (field: 'name' | 'phone' | 'email' | 'cnpj' | 'whatsapp' | 'ifood' | 'other' | 'address') => {
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
      phone: {
        title: "Contato / WhatsApp",
        fieldName: "Telefone",
        icon: <Phone className="h-6 w-6 text-[#022D68]" />,
        type: "tel" as const,
        placeholder: "(11) 98765-4321",
        validationSchema: validations.phone,
        mask: phoneMask,
        currentValue: restaurant?.phone || "",
      },
      email: {
        title: "E-mail",
        fieldName: "E-mail de contato",
        icon: <Mail className="h-6 w-6 text-[#022D68]" />,
        placeholder: "contato@restaurante.com",
        validationSchema: validations.email,
        currentValue: restaurant?.email || "",
      },
      cnpj: {
        title: "CNPJ",
        fieldName: "CNPJ do estabelecimento",
        icon: <FileText className="h-6 w-6 text-[#022D68]" />,
        placeholder: "12.345.678/0001-90",
        validationSchema: validations.cnpj,
        mask: cnpjMask,
        currentValue: restaurant?.cnpj || "",
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
      whatsapp: 'whatsapp_url',
      ifood: 'ifood_url',
      other: 'other_url',
      name: 'name',
      phone: 'phone',
      email: 'email',
      cnpj: 'cnpj',
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
      throw new Error(error);
    }

    toast({
      title: "Salvo com sucesso",
      description: `${editingField.title} atualizado`,
    });

    // Se atualizou o endereço, buscar coordenadas automaticamente
    if (editingField.key === 'address' && restaurant?.id) {
      const addressParts = [
        value, // novo endereço
        restaurant.neighborhood,
        restaurant.city,
        restaurant.state,
        restaurant.cep
      ].filter(Boolean);

      if (addressParts.length > 0) {
        const fullAddress = addressParts.join(', ');
        
        toast({
          title: "Buscando coordenadas...",
          description: "Atualizando localização do restaurante",
        });

        try {
          const geocoded = await geocodeAddress(fullAddress);
          
          if (geocoded) {
            const { error: updateError } = await supabase
              .from("restaurants")
              .update({
                latitude: geocoded.lat,
                longitude: geocoded.lon,
              })
              .eq("id", restaurant.id);

            if (!updateError) {
              toast({
                title: "Localização atualizada",
                description: "Coordenadas encontradas com sucesso",
              });
            }
          }
        } catch (err) {
          console.error('Erro ao buscar coordenadas:', err);
        }
      }
    }
    
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
    await signOut();
    
    // Limpar dados locais
    logout();
    
    toast({
      title: "Logout realizado",
      description: "Até logo!",
    });
    
    navigate(createPageUrl("welcome"));
  };

  const handleUpgradeToPremium = () => {
    navigate(createPageUrl("upgrade"));
  };

  const handleUploadLogo = async (file: File) => {
    if (!restaurant?.id) {
      toast({
        title: "Erro",
        description: "Nenhum restaurante encontrado para fazer upload do logo.",
        variant: "destructive",
      });
      return;
    }

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

      // Refetch to update UI
      refetch();
    }
  };

  const handleUploadCover = async (file: File) => {
    if (!isPremium) {
      toast({
        title: "Recurso Premium",
        description: "Faça upgrade para personalizar fotos de capa",
        variant: "default",
      });
      navigate(createPageUrl("upgrade"));
      return;
    }

    if (!restaurant?.id) {
      toast({
        title: "Erro",
        description: "Nenhum restaurante encontrado para fazer upload da capa.",
        variant: "destructive",
      });
      return;
    }

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

      // Refetch to update UI
      refetch();
    }
  };

  // Componente auxiliar para renderizar itens de informação
  const InfoItem: React.FC<{ label: string; value: string; icon: React.ElementType; onClick: () => void }> = ({ label, value, icon: Icon, onClick }) => (
    <div className="p-4 flex justify-between items-center hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors cursor-pointer" onClick={onClick}>
      <span className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
        <Icon className="w-4 h-4 text-gray-400" />
        {label}
      </span>
      <span className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate max-w-[60%] text-right">
        {value}
      </span>
    </div>
  );

  // Componente auxiliar para renderizar itens de link/navegação
  const NavItem: React.FC<{ label: string; icon: React.ElementType; onClick: () => void; isPremiumLocked?: boolean; description?: string }> = ({ label, icon: Icon, onClick, isPremiumLocked = false, description }) => (
    <button 
      onClick={onClick}
      disabled={isPremiumLocked && !isPremium}
      className={cn(
        "w-full p-4 flex justify-between items-center transition-colors",
        isPremiumLocked && !isPremium ? "text-highlight/50 cursor-not-allowed" : "text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50"
      )}
    >
      <span className="flex items-center gap-3 text-left">
        <Icon className={cn("w-5 h-5 shrink-0", isPremiumLocked && !isPremium ? "text-gray-400" : "text-[#022D68]")} />
        <div>
          <p className={cn("text-sm font-medium", isPremiumLocked && !isPremium ? "text-gray-500" : "text-foreground")}>
            {isPremiumLocked && !isPremium ? `🔒 Premium: ${label}` : label}
          </p>
          {description && (
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          )}
        </div>
      </span>
      <ChevronRight className="w-5 h-5 text-gray-400" />
    </button>
  );

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
        <RestaurantBottomNav selectedTab="home" />
      </div>
    );
  }

  // Se nenhum restaurante for encontrado, exibe uma mensagem
  if (!restaurant) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 max-w-md mx-auto text-center">
        <h2 className="text-xl font-bold text-[#022D68] mb-4">Nenhum Restaurante Encontrado</h2>
        <p className="text-gray-600 mb-6">
          Não foi possível carregar os dados do restaurante. Por favor, verifique o ID ou crie um novo restaurante.
        </p>
        <Button onClick={() => navigate(createPageUrl("restaurant-signup"))}>Criar Restaurante</Button>
        <RestaurantBottomNav selectedTab="home" />
      </div>
    );
  }

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden max-w-md mx-auto">
      <div className="relative bg-[#F5F5F7] dark:bg-[#0f1823] pb-28">
        
        {/* Cover Image Area */}
        <div className="absolute top-0 left-0 w-full h-40 bg-gray-200 dark:bg-gray-800">
          <div className="relative w-full h-full">
            {restaurant?.cover_image_url && (
              <img 
                src={restaurant.cover_image_url} 
                alt="Capa do Restaurante" 
                className="w-full h-full object-cover absolute inset-0" 
              />
            )}
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
              {isPremium ? (
                <ImageUploadButton
                  onFileSelect={handleUploadCover}
                  uploading={uploading}
                  variant="ghost"
                  className="flex items-center gap-2 text-white dark:text-gray-200 text-sm font-semibold bg-gray-900/50 dark:bg-gray-900/70 py-2 px-4 rounded-lg shadow-md backdrop-blur-sm"
                >
                  <Camera className="w-4 h-4" />
                  {uploading ? "Enviando..." : "Alterar capa"}
                </ImageUploadButton>
              ) : (
                <Button 
                  onClick={handleUpgradeToPremium}
                  className="flex items-center gap-2 text-white dark:text-gray-200 text-sm font-semibold bg-gray-900/50 dark:bg-gray-900/70 py-2 px-4 rounded-lg shadow-md backdrop-blur-sm"
                >
                  <Lock className="w-4 h-4" />
                  Editar capa (Premium)
                </Button>
              )}
            </div>
          </div>
        </div>
        
        {/* Back Button */}
        <div className="absolute top-4 left-4 z-30">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-white/10 bg-black/30 backdrop-blur-sm"
            onClick={() => navigate(createPageUrl("restaurant-area-hub"))}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        </div>

        {/* Profile Card */}
        <div className="relative pt-24 px-4">
          <Card className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4">
            <div className="flex items-center gap-4">
              {/* Logo */}
              <div className="relative flex-shrink-0">
                <div 
                  className="bg-center bg-no-repeat aspect-square bg-cover rounded-full w-20 h-20 border-4 border-[#F5F5F7] dark:border-[#0f1823] -mt-12 overflow-hidden flex items-center justify-center"
                >
                  {restaurant?.logo_url ? (
                    <img src={restaurant.logo_url} alt="Restaurant Logo" loading="lazy" className="w-full h-full object-cover" />
                  ) : (
                    <Store className="w-10 h-10 text-[#022D68]" />
                  )}
                </div>
                <ImageUploadButton
                  onFileSelect={handleUploadLogo}
                  uploading={uploading}
                  variant="ghost"
                  className="absolute bottom-0 right-0 bg-white/80 dark:bg-gray-800/80 text-gray-700 dark:text-gray-300 rounded-full p-1.5 flex items-center justify-center border border-gray-200 dark:border-gray-700"
                >
                  <Camera className="w-4 h-4" />
                </ImageUploadButton>
              </div>
              
              {/* Info */}
              <div className="flex-1 flex flex-col">
                <p className="text-[#022D68] dark:text-white text-xl font-bold">{restaurantData.name}</p>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Estabelecimento Comercial</p>
              </div>
              
              {/* Badge */}
              <div className="self-start">
                <Badge 
                  className={cn(
                    "text-xs font-bold px-3 py-1 rounded-full border",
                    isPremium 
                      ? "bg-yellow-400 text-white border-yellow-600" 
                      : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600"
                  )}
                >
                  {isPremium ? "Plano Premium" : "Plano Free"}
                </Badge>
              </div>
            </div>
          </Card>
        </div>
        
        {/* Ver Perfil Público Button */}
        <div className="flex px-4 py-4">
          <Button 
            onClick={() => navigate(createPageUrl(`restaurant-profile/${restaurant?.id || 'mock-id'}`))}
            className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-10 px-4 flex-1 bg-[#E47948] text-white text-sm font-bold leading-normal tracking-[0.015em] gap-2 hover:bg-[#E47948]/90"
          >
            <Eye className="w-4 h-4" />
            <span className="truncate">Ver meu perfil público</span>
          </Button>
        </div>
        
        {/* Detalhes do Estabelecimento */}
        <div className="px-4 mt-0">
          <Card className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <div className="flex justify-between items-center px-4 pt-4 pb-2">
              <h3 className="text-[#022D68] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">Detalhes do Estabelecimento</h3>
              <button 
                onClick={() => toast({ title: "Em breve", description: "Edição rápida em desenvolvimento" })}
                className="flex items-center gap-1 text-[#E47948] dark:text-[#E47948] text-sm font-semibold"
              >
                <Edit className="w-4 h-4" />
                Editar
              </button>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              <InfoItem 
                label="Nome Comercial" 
                value={restaurantData.name} 
                icon={Store} 
                onClick={() => handleEdit('name')}
              />
              <InfoItem 
                label="Endereço" 
                value={restaurantData.address} 
                icon={MapPin} 
                onClick={() => handleEdit('address')}
              />
              <InfoItem 
                label="Horários" 
                value={formatScheduleDisplay(schedule)} 
                icon={Clock} 
                onClick={() => setIsEditingHours(true)}
              />
              <InfoItem 
                label="Contato/WhatsApp" 
                value={restaurantData.phone} 
                icon={Phone} 
                onClick={() => handleEdit('phone')}
              />
              <InfoItem 
                label="E-mail" 
                value={restaurantData.email} 
                icon={Mail} 
                onClick={() => handleEdit('email')}
              />
              <InfoItem 
                label="CNPJ" 
                value={restaurantData.cnpj} 
                icon={BadgeIcon} 
                onClick={() => handleEdit('cnpj')}
              />
            </div>
          </Card>
        </div>
        
        {/* Cardápio */}
        <div className="px-4 mt-4">
          <Card className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <h3 className="text-[#022D68] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] px-4 pb-2 pt-4">Cardápio</h3>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              <NavItem 
                label="Atualizar Cardápio" 
                description="Adicionar, editar ou remover pratos"
                icon={UtensilsCrossed} 
                onClick={() => navigate(createPageUrl('restaurant-area/menu'))}
              />
              <NavItem 
                label="Gerenciar Categorias" 
                description="Entradas, Pratos Principais, Bebidas, etc."
                icon={Package} 
                onClick={() => navigate(createPageUrl('restaurant-area/categories'))}
              />
            </div>
          </Card>
        </div>
        
        {/* Plano e Assinatura */}
        <div className="px-4 mt-4">
          <Card className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-gray-700/50 dark:to-gray-800/50 rounded-lg shadow-sm border border-yellow-400/30">
            <h3 className="text-[#022D68] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] px-4 pb-2 pt-4">Plano e Assinatura</h3>
            <div className="p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Plano atual: <span className="font-bold text-[#022D68] dark:text-white">{isPremium ? "Premium" : "Free"}</span></p>
              
              {!isPremium && (
                <>
                  <div className="bg-white/50 dark:bg-gray-800/50 p-4 rounded-lg space-y-2 mb-4">
                    <p className="text-sm font-semibold text-yellow-600 dark:text-yellow-400">Opções Premium:</p>
                    <ul className="space-y-1.5 text-gray-700 dark:text-gray-300">
                      <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-yellow-600" />Destaque nas buscas</li>
                      <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-yellow-600" />Mais fotos no perfil e cardápio</li>
                      <li className="flex items-center gap-2 text-sm"><Check className="w-4 h-4 text-yellow-600" />Gerenciar canais de pedido (iFood, Rappi)</li>
                    </ul>
                  </div>
                  <Button 
                    onClick={handleUpgradeToPremium}
                    className="w-full flex items-center justify-center gap-2 min-w-[84px] cursor-pointer overflow-hidden rounded-xl h-12 px-4 bg-[#E47948] text-white text-base font-bold leading-normal tracking-[0.015em] shadow-lg shadow-[#E47948]/40 hover:bg-[#E47948]/90"
                  >
                    <Crown className="w-5 h-5" />
                    Ativar Premium
                  </Button>
                </>
              )}
              
              {isPremium && (
                <Button 
                  onClick={() => navigate(createPageUrl('restaurant-area/manage-subscription'))}
                  variant="outline"
                  className="w-full h-12 rounded-xl border-2 border-[#022D68] text-[#022D68] font-bold hover:bg-[#022D68]/5"
                >
                  <CreditCard className="h-4 w-4 mr-2" />
                  Gerenciar Assinatura
                </Button>
              )}
            </div>
          </Card>
        </div>
        
        {/* Preferências e Personalização */}
        <div className="px-4 mt-4">
          <Card className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <h3 className="text-[#022D68] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] px-4 pb-2 pt-4">Preferências e Personalização</h3>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              
              {/* Switches */}
              <div className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <Bell className="h-5 w-5 text-[#022D68]" />
                  <p className="text-sm font-medium text-foreground">Notificações e alertas</p>
                </div>
                <div className="space-y-3 ml-8">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Alertas de pedidos</span>
                    <Switch 
                      checked={notifications.orders}
                      onCheckedChange={(checked) => setNotifications({...notifications, orders: checked})}
                      className="data-[state=checked]:bg-[#E47948]"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Alertas de visitas</span>
                    <Switch 
                      checked={notifications.visits}
                      onCheckedChange={(checked) => setNotifications({...notifications, visits: checked})}
                      className="data-[state=checked]:bg-[#E47948]"
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Novos seguidores</span>
                    <Switch 
                      checked={notifications.followers}
                      onCheckedChange={(checked) => setNotifications({...notifications, followers: checked})}
                      className="data-[state=checked]:bg-[#E47948]"
                    />
                  </div>
                </div>
              </div>
              
              {/* Canais de Pedido Link */}
              <NavItem 
                label="Gerenciar canais" 
                description={isPremium ? "WhatsApp, iFood, Anota Aí" : "Gerencie seus canais de pedido"}
                icon={Package} 
                onClick={() => handleEdit('whatsapp')} // Usando whatsapp como proxy para abrir o modal de edição de canais
                isPremiumLocked={true}
              />
            </div>
          </Card>
        </div>
        
        {/* Suporte e Conta */}
        <div className="px-4 mt-4">
          <Card className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <h3 className="text-[#022D68] dark:text-white text-lg font-bold leading-tight tracking-[-0.015em] px-4 pb-2 pt-4">Suporte e Conta</h3>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              
              {isAdmin && (
                <NavItem 
                  label="Acessar Painel Admin" 
                  icon={Crown} 
                  onClick={() => navigate(createPageUrl("admin/dashboard"))}
                />
              )}

              <NavItem 
                label="Central de Ajuda" 
                description="Tutoriais e perguntas frequentes"
                icon={HelpCircle} 
                onClick={() => navigate(createPageUrl("restaurant-area/help-center"))}
              />
              <NavItem 
                label="Falar com o Suporte" 
                description="Chat direto com equipe FilterFood"
                icon={MessageSquare} 
                onClick={() => navigate(createPageUrl("restaurant-area/support"))}
              />
              <NavItem 
                label="Termos e Política de Privacidade" 
                description="Leitura e aceite"
                icon={FileCheck} 
                onClick={() => navigate(createPageUrl("restaurant-area/terms"))}
              />
              
              <div className="p-4">
                <Button 
                  onClick={handleLogout}
                  className="w-full flex items-center justify-center gap-2 min-w-[84px] cursor-pointer overflow-hidden rounded-xl h-10 px-4 bg-red-600/10 text-red-600 dark:bg-red-500/20 dark:text-red-500 text-sm font-bold leading-normal tracking-[0.015em] hover:bg-red-600/20"
                >
                  <LogOut className="w-4 h-4" />
                  Sair da conta
                </Button>
              </div>
            </div>
          </Card>
        </div>
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
          onSave={() => refetch()} // Usar refetch para atualizar os dados
        />
      )}

      {/* Bottom Navigation */}
      <div className="fixed bottom-0 left-0 w-full bg-white dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 max-w-md mx-auto z-30">
        <RestaurantBottomNav selectedTab="perfil" />
      </div>
    </div>
  );
};

export default RestaurantProfile;