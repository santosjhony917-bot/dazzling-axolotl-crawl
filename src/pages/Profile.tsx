import { useState } from "react";
import { ChevronRight, LogOut, Bell, Shield, CreditCard, HelpCircle, Settings, Globe, Moon, FileText, Edit, UserCircle, Phone, Calendar, MapPinned } from "lucide-react";
import CustomerBottomNav from "@/components/restaurant/CustomerBottomNav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { z } from "zod";
import EditFieldDialog from "@/components/EditFieldDialog";
import { createPageUrl } from "@/utils/url";

// Validation schemas
const nameSchema = z.string()
  .trim()
  .min(3, "Nome deve ter no mínimo 3 caracteres")
  .max(100, "Nome deve ter no máximo 100 caracteres")
  .regex(/^[a-zA-ZÀ-ÿ\s]+$/, "Nome deve conter apenas letras");

const phoneSchema = z.string()
  .regex(/^\(\d{2}\)\s\d{4,5}-\d{4}$/, "Telefone inválido. Use o formato (XX) XXXX-XXXX ou (XX) XXXXX-XXXX");

const dateSchema = z.string()
  .regex(/^\d{2}\/\d{2}\/\d{4}$/, "Data inválida. Use o formato DD/MM/AAAA");

const addressSchema = z.string()
  .trim()
  .min(10, "Endereço deve ter no mínimo 10 caracteres")
  .max(200, "Endereço deve ter no máximo 200 caracteres");

// Mock assets (since I cannot access local assets like appLogo and heroWaves)
const MOCK_APP_LOGO = "https://via.placeholder.com/40x40?text=FF";

const Profile = () => {
  const [selectedTab, setSelectedTab] = useState("perfil");
  const [promotionsEnabled, setPromotionsEnabled] = useState(true);
  const [offersEnabled, setOffersEnabled] = useState(true);
  const [notificationsExpanded, setNotificationsExpanded] = useState(false);
  const [settingsExpanded, setSettingsExpanded] = useState(false);
  const [personalDataExpanded, setPersonalDataExpanded] = useState(true); // Abrir por padrão para visualização
  
  // Edit dialog states
  const [editNameOpen, setEditNameOpen] = useState(false);
  const [editPhoneOpen, setEditPhoneOpen] = useState(false);
  const [editBirthdateOpen, setEditBirthdateOpen] = useState(false);
  const [editAddressOpen, setEditAddressOpen] = useState(false);
  
  // User data
  const [userName, setUserName] = useState("João Dias");
  const [userPhone, setUserPhone] = useState("(11) 98765-4321");
  const [userBirthdate, setUserBirthdate] = useState("15/03/1990");
  const [userAddress, setUserAddress] = useState("Rua das Flores, 123 - São Paulo, SP");
  
  const { toast } = useToast();
  const navigate = useNavigate();
  const { signOut, user } = useAuth();

  const handleEditProfile = () => {
    setEditNameOpen(true);
  };

  const handleLogout = async () => {
    const { error } = await signOut();
    
    if (error) {
      toast({
        title: "Erro ao sair",
        description: error.message || "Tente novamente",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Logout realizado",
        description: "Até logo!",
      });
      navigate(createPageUrl("auth"));
    }
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

  // Date mask function
  const dateMask = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    return numbers
      .replace(/(\d{2})(\d)/, '$1/$2')
      .replace(/(\d{2})(\d)/, '$1/$2')
      .slice(0, 10);
  };

  return (
    <div className="min-h-screen bg-[#f5f7f8] pb-20 max-w-md mx-auto">
      {/* Header - Flat Design */}
      <div className="relative h-20 overflow-hidden mb-6" style={{ background: 'linear-gradient(135deg, #022D68 0%, #014D9F 100%)' }}>
        {/* Top Bar */}
        <div className="relative z-10 flex items-center justify-between px-4 py-4">
          <div className="flex items-center gap-2">
            <img src={MOCK_APP_LOGO} alt="FilterFood" className="h-10 w-auto" />
          </div>
        </div>
      </div>

      {/* User Info Card with Avatar - Integrated */}
      <div className="px-4 mb-6">
        <div className="bg-white border border-border/10 rounded-3xl p-6 relative shadow-sm">
          <div className="flex items-center gap-4 mb-1">
            <Avatar className="w-16 h-16 border-2 border-[#E47948]/10">
              <AvatarImage src={user?.avatarUrl} />
              <AvatarFallback className="bg-[#E47948] text-white text-xl font-bold">
                {userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="font-semibold text-lg text-foreground">{userName}</h3>
              <p className="text-xs text-muted-foreground mt-1">{user?.email || "E-mail não disponível"}</p>
            </div>
          </div>
          <Button 
            onClick={handleEditProfile}
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 absolute top-4 right-4 hover:bg-muted/50 rounded-full"
          >
            <Edit className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      </div>

      {/* Personal Data Section */}
      <div className="px-4 mb-2">
        <div 
          className="bg-white border border-border/10 p-4 cursor-pointer rounded-3xl transition-all active:scale-[0.98] shadow-sm"
          onClick={() => setPersonalDataExpanded(!personalDataExpanded)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[#022D68]/10">
                <UserCircle className="h-5 w-5 text-[#022D68]" />
              </div>
              <div>
                <h3 className="font-medium text-sm text-foreground">Dados pessoais</h3>
                <p className="text-xs text-muted-foreground">Informações da sua conta</p>
              </div>
            </div>
            <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${personalDataExpanded ? 'rotate-90' : ''}`} />
          </div>
        </div>

        {personalDataExpanded && (
          <div className="space-y-3 mt-3">
            <div className="bg-white border border-border/10 rounded-3xl p-4 space-y-4 mx-4 shadow-sm">
              <div className="space-y-3">
                <div className="flex items-start gap-3 pb-3 border-b border-border/50">
                  <UserCircle className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground">Nome completo</Label>
                    <p className="text-sm font-medium text-foreground mt-0.5">{userName}</p>
                  </div>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    className="h-7 w-7 p-0 hover:bg-primary/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditNameOpen(true);
                    }}
                  >
                    <Edit className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </div>

                <div className="flex items-start gap-3 pb-3 border-b border-border/50">
                  <Phone className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground">Telefone</Label>
                    <p className="text-sm font-medium text-foreground mt-0.5">{userPhone}</p>
                  </div>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    className="h-7 w-7 p-0 hover:bg-primary/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditPhoneOpen(true);
                    }}
                  >
                    <Edit className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </div>

                <div className="flex items-start gap-3 pb-3 border-b border-border/50">
                  <FileText className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground">CPF</Label>
                    <p className="text-sm font-medium text-foreground mt-0.5">123.456.789-00</p>
                  </div>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    className="h-7 w-7 p-0 hover:bg-primary/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      toast({ title: "CPF não pode ser alterado", description: "Entre em contato com o suporte" });
                    }}
                  >
                    <Edit className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </div>

                <div className="flex items-start gap-3 pb-3 border-b border-border/50">
                  <Calendar className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground">Data de nascimento</Label>
                    <p className="text-sm font-medium text-foreground mt-0.5">{userBirthdate}</p>
                  </div>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    className="h-7 w-7 p-0 hover:bg-primary/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditBirthdateOpen(true);
                    }}
                  >
                    <Edit className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </div>

                <div className="flex items-start gap-3">
                  <MapPinned className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div className="flex-1">
                    <Label className="text-xs text-muted-foreground">Endereço</Label>
                    <p className="text-sm font-medium text-foreground mt-0.5">{userAddress}</p>
                  </div>
                  <Button 
                    size="sm" 
                    variant="ghost"
                    className="h-7 w-7 p-0 hover:bg-primary/10"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditAddressOpen(true);
                    }}
                  >
                    <Edit className="h-3.5 w-3.5 text-muted-foreground" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Notifications Section */}
      <div className="px-4 mb-2">
        <div 
          className="bg-white border border-border/10 p-4 cursor-pointer rounded-3xl transition-all active:scale-[0.98] shadow-sm"
          onClick={() => setNotificationsExpanded(!notificationsExpanded)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[#E47948]/10">
                <Bell className="h-5 w-5 text-[#E47948]" />
              </div>
              <div>
                <h3 className="font-medium text-sm text-foreground">Notificações</h3>
                <p className="text-xs text-muted-foreground">Promoções e ofertas personalizadas</p>
              </div>
            </div>
            <ChevronRight className={`h-4 w-4 text-muted-foreground transition-transform ${notificationsExpanded ? 'rotate-90' : ''}`} />
          </div>
        </div>

        {notificationsExpanded && (
          <div className="space-y-3 mt-3">
            <div className="bg-white border border-border/10 rounded-3xl p-4 space-y-4 mx-4 shadow-sm">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Label htmlFor="promotions" className="text-sm font-medium text-foreground">
                    Promoções próximas
                  </Label>
                  <p className="text-xs text-muted-foreground">Receba ofertas de restaurantes na sua região</p>
                </div>
                <Switch 
                  id="promotions"
                  checked={promotionsEnabled}
                  onCheckedChange={setPromotionsEnabled}
                  className="data-[state=checked]:bg-[#E47948]"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <Label htmlFor="offers" className="text-sm font-medium text-foreground">
                    Ofertas personalizadas
                  </Label>
                  <p className="text-xs text-muted-foreground">Sugestões baseadas nas suas preferências</p>
                </div>
                <Switch 
                  id="offers"
                  checked={offersEnabled}
                  onCheckedChange={setOffersEnabled}
                  className="data-[state=checked]:bg-[#E47948]"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Settings Section */}
      <div className="px-4 mb-2">
        <div
          className="bg-white border border-border/10 p-4 cursor-pointer rounded-3xl transition-all active:scale-[0.98] shadow-sm"
          onClick={() => setSettingsExpanded(!settingsExpanded)}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center bg-[#022D68]/10">
                <Settings className="h-5 w-5 text-[#022D68]" />
              </div>
              <div>
                <h3 className="font-medium text-sm text-foreground">Configurações</h3>
                <p className="text-xs text-muted-foreground">Idioma, tema e privacidade</p>
              </div>
            </div>
            <ChevronRight className={`h-4 w-4 text-muted-foreground transition-all ${settingsExpanded ? 'rotate-90' : ''}`} />
          </div>
        </div>

        {settingsExpanded && (
          <div className="space-y-3 mt-3 mx-4">
            <div 
              className="bg-white border border-border/10 rounded-3xl p-4 cursor-pointer transition-all active:scale-[0.98] shadow-sm"
              onClick={() => toast({ title: "Em breve", description: "Funcionalidade em desenvolvimento" })}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#E47948]/10 rounded-full flex items-center justify-center">
                    <Globe className="h-5 w-5 text-[#E47948]" />
                  </div>
                  <div>
                    <h3 className="font-medium text-sm text-foreground">Idioma</h3>
                    <p className="text-xs text-muted-foreground">Português (BR)</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            <div 
              className="bg-white border border-border/10 rounded-3xl p-4 cursor-pointer transition-all active:scale-[0.98] shadow-sm"
              onClick={() => toast({ title: "Em breve", description: "Funcionalidade em desenvolvimento" })}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#E47948]/10 rounded-full flex items-center justify-center">
                    <Moon className="h-5 w-5 text-[#E47948]" />
                  </div>
                  <div>
                    <h3 className="font-medium text-sm text-foreground">Tema</h3>
                    <p className="text-xs text-muted-foreground">Automático</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>

            <div 
              className="bg-white border border-border/10 rounded-3xl p-4 cursor-pointer transition-all active:scale-[0.98] shadow-sm"
              onClick={() => toast({ title: "Política de privacidade", description: "Funcionalidade em desenvolvimento" })}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#E47948]/10 rounded-full flex items-center justify-center">
                    <Shield className="h-5 w-5 text-[#E47948]" />
                  </div>
                  <div>
                    <h3 className="font-medium text-sm text-foreground">Privacidade e LGPD</h3>
                    <p className="text-xs text-muted-foreground">Política de privacidade e termos</p>
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Spacer before logout */}
      <div className="px-4 mt-16 pt-6">
        {/* Logout Button */}
        <Button
          onClick={handleLogout}
          variant="outline"
          className="w-full h-12 rounded-3xl border-destructive/20 hover:bg-destructive/10 active:scale-[0.98] transition-all justify-start px-4 shadow-sm"
          style={{ color: '#dc2626' }}
        >
          <LogOut className="h-5 w-5 mr-3" />
          <span className="font-medium">Sair da conta</span>
        </Button>
      </div>

      {/* Bottom Navigation */}
      <CustomerBottomNav selectedTab="perfil" />

      {/* Edit Dialogs */}
      <EditFieldDialog
        isOpen={editNameOpen}
        onClose={() => setEditNameOpen(false)}
        title="Editar Nome"
        fieldName="Nome completo"
        currentValue={userName}
        icon={<UserCircle className="h-6 w-6 text-primary" />}
        onSave={setUserName}
        placeholder="Digite seu nome completo"
        validationSchema={nameSchema}
      />

      <EditFieldDialog
        isOpen={editPhoneOpen}
        onClose={() => setEditPhoneOpen(false)}
        title="Editar Telefone"
        fieldName="Telefone"
        currentValue={userPhone}
        icon={<Phone className="h-6 w-6 text-primary" />}
        onSave={setUserPhone}
        placeholder="(XX) XXXXX-XXXX"
        type="tel"
        validationSchema={phoneSchema}
        mask={phoneMask}
      />

      <EditFieldDialog
        isOpen={editBirthdateOpen}
        onClose={() => setEditBirthdateOpen(false)}
        title="Editar Data de Nascimento"
        fieldName="Data de nascimento"
        currentValue={userBirthdate}
        icon={<Calendar className="h-6 w-6 text-primary" />}
        onSave={setUserBirthdate}
        placeholder="DD/MM/AAAA"
        type="text"
        validationSchema={dateSchema}
        mask={dateMask}
      />

      <EditFieldDialog
        isOpen={editAddressOpen}
        onClose={() => setEditAddressOpen(false)}
        title="Editar Endereço"
        fieldName="Endereço"
        currentValue={userAddress}
        icon={<MapPinned className="h-6 w-6 text-primary" />}
        onSave={setUserAddress}
        placeholder="Rua, número - Cidade, Estado"
        validationSchema={addressSchema}
      />
    </div>
  );
};

export default Profile;