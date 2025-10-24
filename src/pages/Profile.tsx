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
import { useAuth } from "@/context/AuthContext";
import { z } from "zod";
import EditFieldDialog from "@/components/EditFieldDialog";
import { createPageUrl } from "@/utils/url";
import { cn } from "@/lib/utils";

// Validation schemas (mantidos)
const nameSchema = z.string().min(2, "Nome deve ter pelo menos 2 caracteres.");
const phoneSchema = z.string().regex(/^\(\d{2}\) \d{5}-\d{4}$/, "Telefone inválido. Use o formato (XX) XXXXX-XXXX.");
const emailSchema = z.string().email("E-mail inválido.");

// Mock user data
const mockUser = {
  name: "João da Silva",
  email: "joao.silva@example.com",
  phone: "(83) 99999-9999",
  avatarUrl: "https://i.pravatar.cc/150?img=3",
  notificationsEnabled: true,
  darkModeEnabled: false,
};

const Profile = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { toast } = useToast();
  
  // Estado local para simular dados do perfil
  const [profileData, setProfileData] = useState(mockUser);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [dialogProps, setDialogProps] = useState({
    key: '',
    title: '',
    fieldName: '',
    currentValue: '',
    icon: <UserCircle className="h-6 w-6 text-primary" />,
    validationSchema: nameSchema,
    type: "text" as "text" | "tel" | "email",
    mask: undefined as ((value: string) => string) | undefined,
  });

  const handleEditField = (key: string, title: string, fieldName: string, icon: React.ReactNode, validationSchema: z.ZodType<string>, type: "text" | "tel" | "email" = "text", mask?: (value: string) => string) => {
    setDialogProps({
      key,
      title,
      fieldName,
      currentValue: profileData[key as keyof typeof profileData] as string,
      icon,
      validationSchema,
      type,
      mask,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async (key: string, value: string) => {
    // Simulação de salvamento
    setProfileData(prev => ({ ...prev, [key]: value }));
    toast({
      title: "Sucesso!",
      description: `${dialogProps.fieldName} atualizado.`,
      variant: "default",
    });
  };

  const handleSignOut = async () => {
    const { error } = await signOut();
    if (error) {
      toast({
        title: "Erro ao sair",
        description: error.message,
        variant: "destructive",
      });
    } else {
      navigate(createPageUrl('welcome'));
    }
  };

  const handleToggleNotifications = (checked: boolean) => {
    setProfileData(prev => ({ ...prev, notificationsEnabled: checked }));
    toast({
      title: "Notificações",
      description: checked ? "Notificações ativadas." : "Notificações desativadas.",
    });
  };

  const handleToggleDarkMode = (checked: boolean) => {
    setProfileData(prev => ({ ...prev, darkModeEnabled: checked }));
    // Implementar lógica de tema aqui
    toast({
      title: "Tema",
      description: checked ? "Modo escuro ativado." : "Modo claro ativado.",
    });
  };

  const menuItems = [
    { 
      title: "Informações Pessoais", 
      icon: <UserCircle className="w-5 h-5 text-primary" />, 
      action: () => handleEditField('name', 'Editar Nome', 'Nome Completo', <UserCircle className="h-6 w-6 text-primary" />, nameSchema) 
    },
    { 
      title: "E-mail", 
      icon: <FileText className="w-5 h-5 text-primary" />, 
      action: () => handleEditField('email', 'Editar E-mail', 'E-mail', <FileText className="h-6 w-6 text-primary" />, emailSchema, "email") 
    },
    { 
      title: "Telefone", 
      icon: <Phone className="w-5 h-5 text-primary" />, 
      action: () => handleEditField('phone', 'Editar Telefone', 'Telefone', <Phone className="h-6 w-6 text-primary" />, phoneSchema, "tel", (value) => value.replace(/\D/g, '').replace(/^(\d{2})(\d{5})(\d{4})$/, '($1) $2-$3')) 
    },
  ];

  const settingsItems = [
    { 
      title: "Notificações", 
      icon: <Bell className="w-5 h-5 text-primary" />, 
      toggle: profileData.notificationsEnabled,
      onToggle: handleToggleNotifications
    },
    { 
      title: "Modo Escuro", 
      icon: <Moon className="w-5 h-5 text-primary" />, 
      toggle: profileData.darkModeEnabled,
      onToggle: handleToggleDarkMode
    },
    { 
      title: "Central de Ajuda", 
      icon: <HelpCircle className="w-5 h-5 text-primary" />, 
      link: createPageUrl('help') 
    },
    { 
      title: "Termos e Privacidade", 
      icon: <Shield className="w-5 h-5 text-primary" />, 
      link: createPageUrl('terms') 
    },
  ];

  return (
    <div className="min-h-screen bg-[#f5f7f8] pb-20 max-w-md mx-auto">
      <header className="sticky top-0 z-10 bg-white shadow-sm p-4">
        <h1 className="text-2xl font-bold text-[#022D68]">Meu Perfil</h1>
      </header>

      <main className="p-4 space-y-6">
        
        {/* Avatar e Nome */}
        <Card className="shadow-md border-none rounded-xl p-4">
          <div className="flex items-center space-x-4">
            <Avatar className="w-16 h-16 border-2 border-highlight">
              <AvatarImage src={profileData.avatarUrl} alt={profileData.name} />
              <AvatarFallback className="bg-primary text-white text-xl">{profileData.name.charAt(0)}</AvatarFallback>
            </Avatar>
            <div>
              <h2 className="text-xl font-bold text-[#022D68]">{profileData.name}</h2>
              <p className="text-sm text-gray-500">{profileData.email}</p>
            </div>
          </div>
        </Card>

        {/* Informações da Conta */}
        <h2 className="text-lg font-bold text-[#022D68]">Minha Conta</h2>
        <Card className="shadow-md border-none rounded-xl">
          <div className="divide-y divide-gray-100">
            {menuItems.map((item, index) => (
              <div 
                key={index} 
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-50 transition-colors"
                onClick={item.action}
              >
                <div className="flex items-center space-x-4">
                  {item.icon}
                  <p className="font-medium text-base text-[#022D68]">{item.title}</p>
                </div>
                <ChevronRight className="w-5 h-5 text-gray-400" />
              </div>
            ))}
          </div>
        </Card>

        {/* Configurações */}
        <h2 className="text-lg font-bold text-[#022D68]">Configurações</h2>
        <Card className="shadow-md border-none rounded-xl">
          <div className="divide-y divide-gray-100">
            {settingsItems.map((item, index) => (
              <div 
                key={index} 
                className="flex items-center justify-between p-4"
                onClick={item.link ? () => navigate(item.link!) : undefined}
              >
                <div className="flex items-center space-x-4">
                  {item.icon}
                  <p className="font-medium text-base text-[#022D68]">{item.title}</p>
                </div>
                {item.toggle !== undefined ? (
                  <Switch 
                    checked={item.toggle} 
                    onCheckedChange={item.onToggle} 
                    className={cn("data-[state=checked]:bg-highlight")}
                  />
                ) : (
                  <ChevronRight className="w-5 h-5 text-gray-400" />
                )}
              </div>
            ))}
          </div>
        </Card>

        {/* Ação de Sair */}
        <Button
          onClick={handleSignOut}
          variant="outline"
          className="w-full h-12 text-red-600 border-red-300 hover:bg-red-50 rounded-xl font-bold"
        >
          <LogOut className="w-5 h-5 mr-2" />
          Sair da Conta
        </Button>
      </main>

      <CustomerBottomNav selectedTab="perfil" />

      {/* Dialog de Edição */}
      <EditFieldDialog
        isOpen={isDialogOpen}
        onClose={() => setIsDialogOpen(false)}
        title={dialogProps.title}
        fieldName={dialogProps.fieldName}
        currentValue={dialogProps.currentValue}
        icon={dialogProps.icon}
        onSave={(value) => handleSave(dialogProps.key, value)}
        validationSchema={dialogProps.validationSchema}
        type={dialogProps.type}
        mask={dialogProps.mask}
      />
    </div>
  );
};

export default Profile;