import React, { useState, useCallback, useEffect } from "react";
import {
  Phone, Mail, FileText, Utensils, LogOut, Store, MapPin, Clock,
  Edit, Eye, Crown, Lock, Camera, Package, HelpCircle, Shield, LifeBuoy, Bell, CheckCircle2, Trophy
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
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
import { showError, showSuccess } from "@/utils/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageUploadButton } from "@/components/ImageUploadButton";

// --- Schemas ---
const nameSchema = z.string().min(3, "Nome deve ter no mínimo 3 caracteres");
const emailSchema = z.string().email("E-mail inválido");
const phoneSchema = z.string().regex(/^\(\d{2}\)\s\d{4,5}-\d{4}$/, "Telefone inválido. Use o formato (XX) XXXX-XXXX ou (XX) XXXXX-XXXX");
const cnpjSchema = z.string().regex(/^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/, "CNPJ inválido. Use o formato XX.XXX.XXX/XXXX-XX");

// --- Masks ---
const phoneMask = (value: string) => {
  const numbers = value.replace(/\D/g, '');
  if (numbers.length <= 10) {
    return numbers.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{4})(\d)/, '$1-$2').slice(0, 14);
  }
  return numbers.replace(/(\d{2})(\d)/, '($1) $2').replace(/(\d{5})(\d)/, '$1-$2').slice(0, 15);
};

const cnpjMask = (value: string) => {
  const numbers = value.replace(/\D/g, '');
  return numbers.replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\/\d{4})(\d)/, '$1-$2').slice(0, 18);
};

// Mock Schedule (Fallback)
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
  const { signOut, user, isLoading: authLoading } = useAuth();
  const userId = user?.id || null;
  const { restaurant, loading: restaurantLoading, updateRestaurant, refetch } = useRestaurantProfile(userId);
  const { isPremium, isLoading: roleLoading } = useUserRole();
  const { uploadImage, uploading } = useImageUpload();

  const [editingField, setEditingField] = useState<EditingFieldState | null>(null);
  const [isHoursDialogOpen, setIsHoursDialogOpen] = useState(false);
  const [isAddressDialogOpen, setIsAddressDialogOpen] = useState(false);
  
  const [orderAlerts, setOrderAlerts] = useState(true);
  const [visitAlerts, setVisitAlerts] = useState(true);
  const [followerAlerts, setFollowerAlerts] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      navigate(createPageUrl('restaurant-login'));
    }
  }, [authLoading, user, navigate]);

  const handleSignOut = async () => {
    await signOut();
    showSuccess("Logout realizado com sucesso.");
    navigate(createPageUrl('welcome'));
  };

  const handleEditField = useCallback((key: keyof typeof restaurant, title: string, fieldName: string, icon: React.ReactNode, validationSchema: z.ZodType<string>, type: "text" | "tel" | "email" = "text", mask?: (value: string) => string, placeholder?: string) => {
    if (!restaurant) return;
    setEditingField({ key, title, fieldName, icon, type, placeholder, validationSchema, mask, currentValue: (restaurant[key] as string) || '' });
  }, [restaurant]);

  const handleSaveField = async (value: string) => {
    if (!editingField) return;
    const { error } = await updateRestaurant({ [editingField.key]: value });
    if (error) throw new Error(error);
    showSuccess(`${editingField.fieldName} atualizado!`);
  };

  const handleSaveHours = async (newSchedule: WeekSchedule) => {
    const { error } = await updateRestaurant({ opening_hours: newSchedule });
    if (error) throw new Error(error);
    showSuccess("Horários atualizados!");
  };

  const handleFileSelect = async (file: File, type: 'logo' | 'cover') => {
    if (!restaurant?.id) return;
    const { url, error } = await uploadImage(file, 'restaurant_images', restaurant.id, type);
    if (error || !url) {
      showError(error?.message || "Falha no upload.");
      return;
    }
    const updateKey = type === 'logo' ? 'image_url' : 'cover_image_url';
    await updateRestaurant({ [updateKey]: `${url}?t=${Date.now()}` });
  };

  if (authLoading || restaurantLoading || roleLoading) {
    return <div className="flex justify-center items-center h-screen"><Loader2 className="animate-spin" /></div>;
  }

  if (!restaurant) {
    return (
      <div className="p-8 text-center">
        <h2 className="text-xl font-semibold">Restaurante não encontrado</h2>
        <Button onClick={() => navigate(createPageUrl('restaurant-signup'))} className="mt-4">Cadastrar Restaurante</Button>
      </div>
    );
  }

  const currentSchedule = restaurant.opening_hours || mockSchedule;
  const currentAddress = { address: restaurant.address || '', city: restaurant.city || '', state: restaurant.state || '', cep: restaurant.cep || '', neighborhood: restaurant.neighborhood || '', latitude: restaurant.latitude || null, longitude: restaurant.longitude || null };

  const DetailItem = ({ icon: Icon, label, value, onClick }: { icon: React.ElementType, label: string, value: string | null, onClick?: () => void }) => (
    <div className={`p-4 flex justify-between items-center ${onClick ? 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50' : ''}`} onClick={onClick}>
      <span className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"><Icon className="w-4 h-4 text-gray-400" />{label}</span>
      <span className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate max-w-[50%] text-right">{value || "Não definido"}</span>
    </div>
  );

  return (
    <div className="relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden bg-background-light dark:bg-background-dark">
      <div className="relative pb-28">
        <div className="absolute top-0 left-0 w-full h-40 bg-gray-200 dark:bg-gray-800">
          <div className="relative w-full h-full">
            {restaurant.cover_image_url && <img src={restaurant.cover_image_url} alt="Capa" className="w-full h-full object-cover" />}
            <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
              {isPremium ? (
                <ImageUploadButton onFileSelect={(file) => handleFileSelect(file, 'cover')} uploading={uploading} className="h-auto w-auto bg-gray-900/50 text-white text-sm font-semibold py-2 px-4 rounded-lg shadow-md backdrop-blur-sm hover:bg-gray-900/70">
                  <Camera className="w-4 h-4 mr-2" /> Editar Capa
                </ImageUploadButton>
              ) : (
                <Button variant="ghost" onClick={() => navigate(createPageUrl('restaurant-area/upgrade'))} className="h-auto bg-gray-900/50 text-white text-sm font-semibold py-2 px-4 rounded-lg shadow-md backdrop-blur-sm hover:bg-gray-900/70">
                  <Lock className="w-4 h-4 mr-2" /> Editar capa (Premium)
                </Button>
              )}
            </div>
          </div>
        </div>
        <div className="relative pt-24 px-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4">
            <div className="flex items-center gap-4">
              <div className="relative flex-shrink-0">
                <div className="bg-center bg-no-repeat aspect-square bg-cover rounded-full w-20 h-20 border-4 border-background-light dark:border-background-dark -mt-12 bg-gray-200">
                  {restaurant.image_url && <img src={restaurant.image_url} alt="Logo" className="w-full h-full object-cover rounded-full" />}
                </div>
                <ImageUploadButton onFileSelect={(file) => handleFileSelect(file, 'logo')} uploading={uploading} className="absolute bottom-0 right-0 h-8 w-8 p-1.5 bg-white/80 text-gray-700 border border-gray-200 hover:bg-white" icon={<Camera className="w-4 h-4" />} />
              </div>
              <div className="flex-1 flex flex-col">
                <p className="text-primary dark:text-white text-xl font-bold">{restaurant.name}</p>
                <p className="text-gray-500 dark:text-gray-400 text-sm">Estabelecimento Comercial</p>
              </div>
              <div className="self-start">
                <div className="bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 text-xs font-bold px-3 py-1 rounded-full border border-gray-300 dark:border-gray-600">{isPremium ? 'Premium' : 'Free'}</div>
              </div>
            </div>
          </div>
        </div>
        <div className="flex px-4 py-4">
          <Button onClick={() => navigate(createPageUrl(`restaurant-profile/${restaurant.id}`))} className="flex-1 bg-highlight text-white text-sm font-bold gap-2 h-10 rounded-xl">
            <Eye className="w-4 h-4" /> Ver meu perfil público
          </Button>
        </div>
        <div className="px-4 mt-0">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <div className="flex justify-between items-center px-4 pt-4 pb-2">
              <h3 className="text-primary dark:text-white text-lg font-bold">Detalhes do Estabelecimento</h3>
            </div>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              <DetailItem icon={Store} label="Nome Comercial" value={restaurant.name} onClick={() => handleEditField('name', 'Editar Nome', 'Nome', <Store />, nameSchema)} />
              <DetailItem icon={MapPin} label="Endereço" value={restaurant.address} onClick={() => setIsAddressDialogOpen(true)} />
              <DetailItem icon={Clock} label="Horários" value="Ver/Editar horários" onClick={() => setIsHoursDialogOpen(true)} />
              <DetailItem icon={Phone} label="Contato/WhatsApp" value={restaurant.phone} onClick={() => handleEditField('phone', 'Editar Contato', 'Telefone', <Phone />, phoneSchema, 'tel', phoneMask)} />
              <DetailItem icon={Mail} label="E-mail" value={restaurant.email} onClick={() => handleEditField('email', 'Editar E-mail', 'E-mail', <Mail />, emailSchema, 'email')} />
              <DetailItem icon={FileText} label="CNPJ" value={restaurant.cnpj} onClick={() => handleEditField('cnpj', 'Editar CNPJ', 'CNPJ', <FileText />, cnpjSchema, 'text', cnpjMask)} />
            </div>
          </div>
        </div>
        <div className="px-4 mt-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <h3 className="text-primary dark:text-white text-lg font-bold px-4 pb-2 pt-4">Cardápio</h3>
            <div className="p-4 space-y-3">
              <Button onClick={() => navigate(createPageUrl('restaurant-area/menu'))} className="w-full bg-highlight hover:bg-highlight/90 text-white font-bold rounded-xl h-10">Atualizar Cardápio</Button>
              <Button onClick={() => navigate(createPageUrl('restaurant-area/categories'))} className="w-full bg-highlight hover:bg-highlight/90 text-white font-bold rounded-xl h-10">Gerenciar Categorias</Button>
            </div>
          </div>
        </div>
        <div className="px-4 mt-4">
          <div className="bg-gradient-to-br from-yellow-500/10 to-amber-500/10 rounded-lg shadow-sm border border-amber-500/30">
            <h3 className="text-primary dark:text-white text-lg font-bold px-4 pb-2 pt-4">Plano e Assinatura</h3>
            <div className="p-4">
              <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Plano atual: <span className="font-bold text-primary dark:text-white">{isPremium ? 'Premium' : 'Free'}</span></p>
              {!isPremium && (
                <>
                  <div className="bg-white/50 dark:bg-gray-800/50 p-4 rounded-lg space-y-2 mb-4">
                    <p className="text-sm font-semibold text-amber-600 dark:text-amber-400">Opções Premium:</p>
                    <ul className="space-y-1.5 text-gray-700 dark:text-gray-300">
                      <li className="flex items-center gap-2 text-sm"><CheckCircle2 className="w-4 h-4 text-amber-500" />Destaque nas buscas</li>
                      <li className="flex items-center gap-2 text-sm"><CheckCircle2 className="w-4 h-4 text-amber-500" />Mais fotos no perfil e cardápio</li>
                      <li className="flex items-center gap-2 text-sm"><CheckCircle2 className="w-4 h-4 text-amber-500" />Gerenciar canais de pedido</li>
                    </ul>
                  </div>
                  <Button onClick={() => navigate(createPageUrl('restaurant-area/upgrade'))} className="w-full bg-highlight text-white text-base font-bold h-12 rounded-xl shadow-lg shadow-highlight/40 gap-2">
                    <Trophy className="w-5 h-5" /> Ativar Premium
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
        <div className="px-4 mt-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <h3 className="text-primary dark:text-white text-lg font-bold px-4 pb-2 pt-4">Preferências e Personalização</h3>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              <div className="p-4 flex justify-between items-center"><span className="text-sm text-gray-600 dark:text-gray-400">Alertas de pedidos</span><Switch checked={orderAlerts} onCheckedChange={setOrderAlerts} /></div>
              <div className="p-4 flex justify-between items-center"><span className="text-sm text-gray-600 dark:text-gray-400">Alertas de visitas</span><Switch checked={visitAlerts} onCheckedChange={setVisitAlerts} /></div>
              <div className="p-4 flex justify-between items-center"><span className="text-sm text-gray-600 dark:text-gray-400">Novos seguidores</span><Switch checked={followerAlerts} onCheckedChange={setFollowerAlerts} /></div>
            </div>
          </div>
        </div>
        <div className="px-4 mt-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm">
            <h3 className="text-primary dark:text-white text-lg font-bold px-4 pb-2 pt-4">Suporte e Conta</h3>
            <div className="divide-y divide-gray-200 dark:divide-gray-700">
              <a className="p-4 flex justify-between items-center text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50" href="#"><span className="text-sm">Central de Ajuda</span></a>
              <a className="p-4 flex justify-between items-center text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50" href="#"><span className="text-sm">Falar com o Suporte</span></a>
              <a className="p-4 flex justify-between items-center text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50" href="#"><span className="text-sm">Termos e Política de Privacidade</span></a>
              <div className="p-4">
                <Button onClick={handleSignOut} variant="ghost" className="w-full bg-red-600/10 text-red-600 dark:bg-red-500/20 dark:text-red-500 text-sm font-bold rounded-xl h-10">Sair da conta</Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="fixed bottom-0 left-0 w-full max-w-md mx-auto z-30"><RestaurantBottomNav selectedTab="perfil" isFree={!isPremium} /></div>
      {editingField && <EditFieldDialog isOpen={!!editingField} onClose={() => setEditingField(null)} title={editingField.title} fieldName={editingField.fieldName} currentValue={editingField.currentValue} icon={editingField.icon} onSave={handleSaveField} placeholder={editingField.placeholder} type={editingField.type} validationSchema={editingField.validationSchema} mask={editingField.mask} />}
      <EditHoursDialog open={isHoursDialogOpen} onOpenChange={setIsHoursDialogOpen} currentSchedule={currentSchedule} onSave={handleSaveHours} />
      <EditAddressDialog open={isAddressDialogOpen} onOpenChange={setIsAddressDialogOpen} restaurantId={restaurant.id} currentAddress={currentAddress} onSave={refetch} />
    </div>
  );
};

export default RestaurantProfileMenu;