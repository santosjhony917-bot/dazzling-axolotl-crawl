import React, { useState, useCallback, useEffect } from "react";
import { ArrowLeft, Phone, Mail, FileText, UtensilsCrossed, Store, Globe, Building2, Utensils, LogOut, Edit, Eye, MapPin, Clock, Lock, Camera, Crown, CheckCircle, Zap, Loader2, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useRestaurantProfile } from "@/hooks/useRestaurantProfile";
import { useUserRole } from "@/hooks/useUserRole";
import { useImageUpload } from "@/hooks/useImageUpload";
import EditFieldDialog from "@/components/EditFieldDialog";
import { EditHoursDialog } from "@/components/EditHoursDialog";
import { EditAddressDialog } from "@/components/EditAddressDialog";
import { z } from "zod";
import { WeekSchedule } from "@/types/schedule";
import { createPageUrl } from "@/utils/url";
import { showError, showSuccess } from "@/utils/toast";
import { Skeleton } from "@/components/ui/skeleton";
import { ImageUploadButton } from "@/components/ImageUploadButton";
import { Switch } from "@/components/ui/switch";

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
  key: string; title: string; fieldName: string; icon: React.ReactNode; currentValue: string; placeholder?: string; type: "text" | "tel" | "email"; validationSchema: z.ZodType<string>; mask?: (value: string) => string;
}

const DetailItem = ({ icon: Icon, label, value, onClick }) => (
  <div className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50" onClick={onClick}>
    <span className="flex items-center gap-2 text-sm text-gray-600"><Icon className="w-4 h-4 text-gray-400" />{label}</span>
    <span className="text-sm font-bold text-gray-900">{value || "Não definido"}</span>
  </div>
);

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

  useEffect(() => {
    if (!authLoading && !user) navigate(createPageUrl('restaurant-login'));
  }, [authLoading, user, navigate]);

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) showError(error.message || "Erro ao sair.");
    else {
      showSuccess("Logout realizado com sucesso.");
      navigate(createPageUrl('welcome'));
    }
  };

  const handleEditField = useCallback((key: keyof typeof restaurant, title: string, fieldName: string, icon: React.ReactNode, validationSchema: z.ZodType<string>, type: "text" | "tel" | "email" = "text", mask?: (value: string) => string, placeholder?: string) => {
    if (!restaurant) return;
    setEditingField({ key, title, fieldName, icon, type, placeholder, validationSchema, mask, currentValue: (restaurant[key] as string) || '' });
  }, [restaurant]);

  const handleSaveField = async (value: string) => {
    if (!editingField) return;
    const { error } = await updateRestaurant({ [editingField.key]: value });
    if (error) { showError(error); throw new Error(error); }
    showSuccess(`${editingField.fieldName} atualizado!`);
  };

  const handleSaveHours = async (newSchedule: WeekSchedule) => {
    const { error } = await updateRestaurant({ opening_hours: newSchedule });
    if (error) { showError(error); throw new Error(error); }
    showSuccess("Horários atualizados!");
  };

  const handleFileSelect = async (file: File, type: 'logo' | 'cover') => {
    if (!restaurant?.id) { showError("Restaurante não carregado."); return; }
    if (type === 'cover' && !isPremium) { showError("Edição de capa é um recurso Premium."); return; }
    
    const path = `${restaurant.id}/${type}-${Date.now()}`;
    const { url, error } = await uploadImage(file, 'restaurant_images', restaurant.id, type);
    if (error || !url) { showError(error?.message || "Falha no upload."); return; }
    
    const updateKey = type === 'logo' ? 'image_url' : 'cover_image_url';
    const { error: updateError } = await updateRestaurant({ [updateKey]: url });
    if (updateError) showError(`Imagem enviada, mas falha ao salvar: ${updateError}`);
    else showSuccess("Imagem atualizada!");
  };

  if (authLoading || restaurantLoading || roleLoading) {
    return <div className="p-4"><Skeleton className="h-screen w-full" /></div>;
  }

  if (!restaurant) {
    return <div className="p-8 text-center">Restaurante não encontrado.</div>;
  }

  const currentSchedule = restaurant.opening_hours || mockSchedule;
  const currentAddress = { address: restaurant.address || '', city: restaurant.city || '', state: restaurant.state || '', cep: restaurant.cep || '', neighborhood: restaurant.neighborhood || '', latitude: restaurant.latitude || null, longitude: restaurant.longitude || null };

  return (
    <div className="relative bg-background-light pb-28">
      <div className="absolute top-0 left-0 w-full h-40 bg-gray-200">
        {restaurant.cover_image_url ? (
          <img src={restaurant.cover_image_url} alt="Capa" className="w-full h-full object-cover" />
        ) : <div className="w-full h-full bg-gray-300" />}
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
          <Button onClick={() => handleFileSelect(new File([], ''), 'cover')} disabled={!isPremium || uploading} className="flex items-center gap-2 text-white text-sm font-semibold bg-gray-900/50 py-2 px-4 rounded-lg shadow-md backdrop-blur-sm">
            {!isPremium && <Lock className="w-3 h-3" />}
            {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Editar capa (Premium)'}
          </Button>
        </div>
      </div>

      <div className="relative pt-24 px-4 space-y-4">
        <div className="bg-white rounded-xl shadow-md p-4">
          <div className="flex items-center gap-4">
            <div className="relative flex-shrink-0">
              <div className="bg-center bg-cover rounded-full w-20 h-20 border-4 border-background-light -mt-12" style={{ backgroundImage: `url("${restaurant.image_url || ''}")` }}>
                {!restaurant.image_url && <div className="w-full h-full bg-primary/20 flex items-center justify-center"><Store className="w-8 h-8 text-primary" /></div>}
              </div>
              <ImageUploadButton onFileSelect={(file) => handleFileSelect(file, 'logo')} uploading={uploading} className="absolute bottom-0 right-0 bg-white/80 text-gray-700 rounded-full p-1.5 h-auto w-auto border border-gray-200" icon={<Camera className="w-4 h-4" />} />
            </div>
            <div className="flex-1"><p className="text-primary text-xl font-bold">{restaurant.name}</p><p className="text-gray-500 text-sm">Estabelecimento Comercial</p></div>
            <div className="self-start"><div className="bg-gray-100 text-gray-600 text-xs font-bold px-3 py-1 rounded-full border border-gray-300">Plano {isPremium ? 'Premium' : 'Free'}</div></div>
          </div>
        </div>

        <Button onClick={() => navigate(createPageUrl(`restaurant/${restaurant.id}`))} className="w-full h-10 bg-highlight text-white font-bold gap-2"><Eye className="w-4 h-4" /> Ver meu perfil público</Button>

        <div className="bg-white rounded-lg shadow-sm">
          <div className="flex justify-between items-center px-4 pt-4 pb-2">
            <h3 className="text-primary text-lg font-bold">Detalhes do Estabelecimento</h3>
            <Button variant="ghost" size="sm" className="flex items-center gap-1 text-highlight text-sm font-semibold"><Edit className="w-3 h-3" /> Editar</Button>
          </div>
          <div className="divide-y divide-gray-200">
            <DetailItem icon={Store} label="Nome Comercial" value={restaurant.name} onClick={() => handleEditField('name', 'Editar Nome', 'Nome', <Store />, nameSchema)} />
            <DetailItem icon={MapPin} label="Endereço" value={restaurant.address} onClick={() => setIsAddressDialogOpen(true)} />
            <DetailItem icon={Clock} label="Horários" value="18:00 - 23:00" onClick={() => setIsHoursDialogOpen(true)} />
            <DetailItem icon={Phone} label="Contato/WhatsApp" value={restaurant.phone} onClick={() => handleEditField('phone', 'Editar Contato', 'Contato', <Phone />, phoneSchema, 'tel', phoneMask)} />
            <DetailItem icon={Mail} label="E-mail" value={restaurant.email} onClick={() => handleEditField('email', 'Editar E-mail', 'E-mail', <Mail />, emailSchema, 'email')} />
            <DetailItem icon={FileText} label="CNPJ" value={restaurant.cnpj} onClick={() => handleEditField('cnpj', 'Editar CNPJ', 'CNPJ', <FileText />, cnpjSchema, 'text', cnpjMask)} />
          </div>
        </div>

        <div className="bg-white rounded-lg shadow-sm">
          <h3 className="text-primary text-lg font-bold px-4 pb-2 pt-4">Cardápio</h3>
          <div className="p-4 space-y-3">
            <Button onClick={() => navigate(createPageUrl('restaurant-area/menu'))} className="w-full bg-highlight hover:bg-highlight/90 text-white font-bold">Atualizar Cardápio</Button>
            <Button onClick={() => navigate(createPageUrl('restaurant-area/categories'))} className="w-full bg-highlight hover:bg-highlight/90 text-white font-bold">Gerenciar Categorias</Button>
          </div>
        </div>

        <div className="bg-gradient-to-br from-yellow-500/10 to-amber-500/10 rounded-lg shadow-sm border border-amber-500/30 p-4 space-y-4">
          <h3 className="text-primary text-lg font-bold">Plano e Assinatura</h3>
          <p className="text-sm text-gray-600">Plano atual: <span className="font-bold text-primary">{isPremium ? 'Premium' : 'Free'}</span></p>
          {!isPremium && (
            <>
              <div className="bg-white/50 p-4 rounded-lg space-y-2">
                <p className="text-sm font-semibold text-amber-700">Opções Premium:</p>
                <ul className="space-y-1.5 text-gray-700">
                  <li className="flex items-center gap-2 text-sm"><CheckCircle className="w-4 h-4 text-amber-600" />Destaque nas buscas</li>
                  <li className="flex items-center gap-2 text-sm"><CheckCircle className="w-4 h-4 text-amber-600" />Mais fotos no perfil e cardápio</li>
                  <li className="flex items-center gap-2 text-sm"><CheckCircle className="w-4 h-4 text-amber-600" />Gerenciar canais de pedido (iFood, Rappi)</li>
                </ul>
              </div>
              <Button onClick={() => navigate(createPageUrl('restaurant-area/upgrade'))} className="w-full h-12 bg-highlight text-white text-base font-bold shadow-lg shadow-highlight/40 gap-2"><Zap className="w-5 h-5" /> Ativar Premium</Button>
            </>
          )}
        </div>

        <div className="bg-white rounded-lg shadow-sm">
          <h3 className="text-primary text-lg font-bold px-4 pb-2 pt-4">Suporte e Conta</h3>
          <div className="divide-y divide-gray-200">
            <Link to="/restaurant-area/help" className="p-4 flex justify-between items-center text-gray-800 hover:bg-gray-50"><span className="text-sm">Central de Ajuda</span><ChevronRight className="h-4 w-4 text-gray-400" /></Link>
            <div className="p-4"><Button onClick={handleSignOut} variant="ghost" className="w-full justify-center text-red-600 bg-red-600/10 hover:bg-red-600/20 font-bold">Sair da conta</Button></div>
          </div>
        </div>
      </div>

      {editingField && <EditFieldDialog isOpen={!!editingField} onClose={() => setEditingField(null)} {...editingField} onSave={handleSaveField} />}
      <EditHoursDialog open={isHoursDialogOpen} onOpenChange={setIsHoursDialogOpen} currentSchedule={currentSchedule} onSave={handleSaveHours} />
      <EditAddressDialog open={isAddressDialogOpen} onOpenChange={setIsAddressDialogOpen} restaurantId={restaurant.id} currentAddress={currentAddress} onSave={refetch} />
    </div>
  );
}

export default RestaurantProfileMenu;