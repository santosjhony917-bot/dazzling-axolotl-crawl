import { useState } from "react";
import { ChevronRight, LogOut, Bell, Shield, CreditCard, HelpCircle, Settings, Globe, Moon, FileText, Edit, UserCircle, Phone, Calendar, MapPinned, ArrowLeft, Search, Home, Crown, Utensils } from "lucide-react";
import CustomerBottomNav from "@/components/CustomerBottomNav";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Link, useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { z } from "zod";
import EditFieldDialog from "@/components/EditFieldDialog";
import { createPageUrl } from "@/utils/url";
import { cn } from "@/lib/utils";

// Validation schemas (mantidos)
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

const Profile = () => {
  const [promotionsEnabled, setPromotionsEnabled] = useState(true);
  const [offersEnabled, setOffersEnabled] = useState(true);
  
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


  return (
    <div className="min-h-screen bg-[#f5f7f8] pb-20 max-w-md mx-auto">
      
      {/* Header - Fundo Azul Escuro com Botão Voltar */}
      <header className="sticky top-0 z-10 bg-[#022D68] shadow-md">
        <div className="flex items-center justify-between px-4 py-4">
          <Button 
            variant="ghost" 
            size="icon" 
            className="text-white hover:bg-white/10"
            onClick={() => navigate(createPageUrl("home"))}
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-xl font-bold text-white flex-1 text-center -ml-6">Meu Perfil</h1>
          <div className="w-10"></div>
        </div>
      </header>

      {/* User Info Card with Avatar */}
      <div className="px-4 -mt-4 mb-6">
        <Card className="bg-white border border-border/10 rounded-3xl p-6 relative shadow-xl">
          <div className="flex items-center gap-4 mb-1">
            <Avatar className="w-16 h-16 border-2 border-[#E47948]/10">
              <AvatarImage src={user?.avatarUrl} />
              <AvatarFallback className="bg-[#E47948] text-white text-xl font-bold">
                {userName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h3 className="font-bold text-xl text-[#022D68]">{userName}</h3>
              <p className="text-sm text-gray-600 mt-1">{user?.email || "E-mail não disponível"}</p>
            </div>
          </div>
          <Button 
            onClick={handleEditProfile}
            size="sm"
            variant="ghost"
            className="h-8 w-8 p-0 absolute top-4 right-4 hover:bg-muted/50 rounded-full text-[#E47948]"
          >
            <Edit className="h-4 w-4" />
          </Button>
        </Card>
      </div>

      {/* Dados Pessoais Section */}
      <div className="px-4 mb-4 space-y-4">
        <h2 className="text-base font-bold text-[#022D68]">Dados Pessoais</h2>
        
        <Card className="bg-white border border-border/10 rounded-3xl p-4 space-y-4 shadow-sm">
          <div className="space-y-3">
            
            {/* Nome */}
            <div className="flex items-start gap-3 pb-3 border-b border-border/50">
              <UserCircle className="h-5 w-5 text-[#E47948] mt-0.5" />
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Nome completo</Label>
                <p className="text-sm font-medium text-foreground mt-0.5">{userName}</p>
              </div>
              <Button 
                size="sm" 
                variant="ghost"
                className="h-7 w-7 p-0 hover:bg-[#E47948]/10 text-[#E47948]"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditNameOpen(true);
                }}
              >
                <Edit className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Telefone */}
            <div className="flex items-start gap-3 pb-3 border-b border-border/50">
              <Phone className="h-5 w-5 text-[#E47948] mt-0.5" />
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Telefone</Label>
                <p className="text-sm font-medium text-foreground mt-0.5">{userPhone}</p>
              </div>
              <Button 
                size="sm" 
                variant="ghost"
                className="h-7 w-7 p-0 hover:bg-[#E47948]/10 text-[#E47948]"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditPhoneOpen(true);
                }}
              >
                <Edit className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* CPF (Não editável) */}
            <div className="flex items-start gap-3 pb-3 border-b border-border/50">
              <FileText className="h-5 w-5 text-[#E47948] mt-0.5" />
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">CPF</Label>
                <p className="text-sm font-medium text-foreground mt-0.5">123.456.789-00</p>
              </div>
              <div className="h-7 w-7 p-0 flex items-center justify-center">
                <Shield className="h-3.5 w-3.5 text-gray-400" />
              </div>
            </div>

            {/* Data de nascimento */}
            <div className="flex items-start gap-3 pb-3 border-b border-border/50">
              <Calendar className="h-5 w-5 text-[#E47948] mt-0.5" />
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Data de nascimento</Label>
                <p className="text-sm font-medium text-foreground mt-0.5">{userBirthdate}</p>
              </div>
              <Button 
                size="sm" 
                variant="ghost"
                className="h-7 w-7 p-0 hover:bg-[#E47948]/10 text-[#E47948]"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditBirthdateOpen(true);
                }}
              >
                <Edit className="h-3.5 w-3.5" />
              </Button>
            </div>

            {/* Endereço */}
            <div className="flex items-start gap-3">
              <MapPinned className="h-5 w-5 text-[#E47948] mt-0.5" />
              <div className="flex-1">
                <Label className="text-xs text-muted-foreground">Endereço</Label>
                <p className="text-sm font-medium text-foreground mt-0.5">{userAddress}</p>
              </div>
              <Button 
                size="sm" 
                variant="ghost"
                className="h-7 w-7 p-0 hover:bg-[#E47948]/10 text-[#E47948]"
                onClick={(e) => {
                  e.stopPropagation();
                  setEditAddressOpen(true);
                }}
              >
                <Edit className="h-3.5 w-3.5" />
              </Button>
            </div>
          </div>
        </Card>
      </div>

      {/* Preferências Section */}
      <div className="px-4 mb-4 space-y-4">
        <h2 className="text-base font-bold text-[#022D68]">Preferências</h2>
        
        <Card className="bg-white border border-border/10 rounded-3xl p-4 space-y-4 shadow-sm">
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
        </Card>
      </div>

      {/* Geral e Suporte Section */}
      <div className="px-4 mb-4 space-y-4">
        <h2 className="text-base font-bold text-[#022D68]">Geral e Suporte</h2>
        
        <Card className="bg-white border border-border/10 rounded-3xl shadow-sm divide-y divide-gray-200 dark:divide-gray-700">
          
          {/* Idioma */}
          <NavItem 
            label="Idioma" 
            description="Português (BR)"
            icon={Globe} 
            onClick={() => toast({ title: "Em breve", description: "Funcionalidade em desenvolvimento" })}
          />

          {/* Tema */}
          <NavItem 
            label="Tema" 
            description="Automático"
            icon={Moon} 
            onClick={() => toast({ title: "Em breve", description: "Funcionalidade em desenvolvimento" })}
          />

          {/* Ajuda */}
          <NavItem 
            label="Central de Ajuda" 
            description="Tutoriais e FAQ"
            icon={HelpCircle} 
            onClick={() => toast({ title: "Em breve", description: "Funcionalidade em desenvolvimento" })}
          />

          {/* Privacidade */}
          <NavItem 
            label="Privacidade e LGPD" 
            description="Política de privacidade e termos"
            icon={Shield} 
            onClick={() => toast({ title: "Política de privacidade", description: "Funcionalidade em desenvolvimento" })}
          />
        </Card>
      </div>

      {/* Logout Button */}
      <div className="px-4 mt-10 pt-6">
        <Button
          onClick={handleLogout}
          variant="outline"
          className="w-full h-12 rounded-full border-2 border-red-500/50 hover:bg-red-50 active:scale-[0.98] transition-all justify-center px-4 shadow-md text-red-600 font-bold"
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