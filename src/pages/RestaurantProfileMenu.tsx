import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import {
  Store,
  MapPin,
  Clock,
  Phone,
  Mail,
  Badge,
  Edit,
  Eye,
  ChevronRight,
  Lock,
  CheckCircle,
  LogOut,
  Camera,
  BarChart3,
  DollarSign,
  CreditCard,
  QrCode,
  Settings,
  Upload,
  Users,
  LayoutDashboard,
  Crown,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { mockLogout } from '@/utils/auth-mock';
import { useUserRole } from '@/hooks/useUserRole';
import { Skeleton } from '@/components/ui/skeleton';
import RestaurantBottomNav from '@/components/restaurant/RestaurantBottomNav';
import { cn } from '@/lib/utils';

// Mock Data (seria substituído por dados reais do restaurante logado)
const mockRestaurantData = {
  name: 'Cachorro Quente do Zé',
  category: 'Estabelecimento Comercial',
  address: 'Rua Fictícia, 123',
  hours: '18:00 - 23:00',
  contact: '(83) 99999-9999',
  email: 'contato@zedog.com',
  cnpj: '12.345.678/0001-99',
  plan: 'free',
  coverImageUrl: 'https://images.unsplash.com/photo-1559339352-11d035aa65de?q=80&w=2074&auto=format&fit=crop', // Placeholder
  profileIconUrl: 'https://via.placeholder.com/80', // Placeholder
};

const PremiumFeatures = [
  { icon: CheckCircle, label: 'Destaque nas buscas' },
  { icon: CheckCircle, label: 'Mais fotos no perfil e cardápio' },
  { icon: CheckCircle, label: 'Gerenciar canais de pedido (iFood, Rappi)' },
];

const ProfileMenu: React.FC = () => {
  const navigate = useNavigate();
  const { role, isLoading } = useUserRole();
  const isPremium = role === 'premium_restaurant';
  const [alertsEnabled, setAlertsEnabled] = useState(true);
  const [visitsEnabled, setVisitsEnabled] = useState(true);
  const [followersEnabled, setFollowersEnabled] = useState(false);

  const handleSignOut = async () => {
    await mockLogout();
    navigate('/auth');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col p-4 max-w-md mx-auto">
        <Skeleton className="h-40 w-full mb-6" />
        <Skeleton className="h-12 w-full mb-4" />
        <Skeleton className="h-64 w-full mb-4" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark pb-24 max-w-md mx-auto">
      {/* Header/Cover Image */}
      <div className="relative w-full h-40 bg-gray-200 dark:bg-gray-800">
        <img
          src={mockRestaurantData.coverImageUrl}
          alt="Capa do Restaurante"
          className="w-full h-full object-cover"
        />
        <div className="absolute inset-0 bg-black/30 flex items-center justify-center">
          <Button
            variant="secondary"
            className="flex items-center gap-2 text-white dark:text-gray-200 text-sm font-semibold bg-gray-900/50 dark:bg-gray-900/70 py-2 px-4 rounded-lg shadow-md backdrop-blur-sm"
            disabled={!isPremium}
          >
            <Lock className="w-4 h-4" />
            Editar capa ({isPremium ? 'Premium' : 'Free'})
          </Button>
        </div>
      </div>

      {/* Profile Content */}
      <div className="relative pt-0 px-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 -mt-12">
          <div className="flex items-center gap-4">
            {/* Profile Icon */}
            <div className="relative flex-shrink-0">
              <div
                className="bg-center bg-no-repeat aspect-square bg-cover rounded-full w-20 h-20 border-4 border-background-light dark:border-background-dark"
                style={{ backgroundImage: `url("${mockRestaurantData.profileIconUrl}")` }}
              >
                <div className="w-full h-full bg-primary/20 flex items-center justify-center rounded-full">
                  <Store className="w-10 h-10 text-primary" />
                </div>
              </div>
              <Button
                variant="outline"
                size="icon"
                className="absolute bottom-0 right-0 h-8 w-8 rounded-full bg-white/80 dark:bg-gray-800/80 border border-gray-200 dark:border-gray-700 p-1.5"
              >
                <Camera className="w-4 h-4 text-gray-700 dark:text-gray-300" />
              </Button>
            </div>

            {/* Info */}
            <div className="flex-1 flex flex-col">
              <p className="text-primary dark:text-white text-xl font-bold">{mockRestaurantData.name}</p>
              <p className="text-gray-500 dark:text-gray-400 text-sm">{mockRestaurantData.category}</p>
            </div>

            {/* Plan Badge */}
            <div className="self-start">
              <div className={cn(
                "text-xs font-bold px-3 py-1 rounded-full border",
                isPremium 
                    ? "bg-gold/20 text-gold-dark border-gold-dark/30" 
                    : "bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300 border-gray-300 dark:border-gray-600"
              )}>
                Plano {isPremium ? 'Premium' : 'Free'}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* View Public Profile Button */}
      <div className="flex px-4 py-4">
        <Button
          className="flex min-w-[84px] max-w-[480px] cursor-pointer items-center justify-center overflow-hidden rounded-xl h-10 px-4 flex-1 bg-highlight text-white text-sm font-bold leading-normal tracking-[0.015em] gap-2 shadow-md hover:bg-highlight/90"
          onClick={() => navigate('/restaurant-profile/mock-id')}
        >
          <Eye className="w-4 h-4" />
          <span className="truncate">Ver meu perfil público</span>
        </Button>
      </div>

      {/* Detalhes do Estabelecimento */}
      <div className="px-4 mt-0">
        <Card className="shadow-sm border-none rounded-xl">
          <CardHeader className="px-4 pt-4 pb-2 flex flex-row justify-between items-center">
            <CardTitle className="text-primary dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">Detalhes do Estabelecimento</CardTitle>
            <Button variant="ghost" size="sm" className="flex items-center gap-1 text-highlight dark:text-highlight text-sm font-semibold hover:bg-highlight/10">
              <Edit className="w-4 h-4" />
              Editar
            </Button>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-gray-200 dark:divide-gray-700">
            <div className="p-4 flex justify-between items-center">
              <span className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"><Store className="w-4 h-4 text-gray-400" />Nome Comercial</span>
              <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{mockRestaurantData.name}</span>
            </div>
            <div className="p-4 flex justify-between items-center">
              <span className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"><MapPin className="w-4 h-4 text-gray-400" />Endereço</span>
              <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{mockRestaurantData.address}</span>
            </div>
            <div className="p-4 flex justify-between items-center">
              <span className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"><Clock className="w-4 h-4 text-gray-400" />Horários</span>
              <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{mockRestaurantData.hours}</span>
            </div>
            <div className="p-4 flex justify-between items-center">
              <span className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"><Phone className="w-4 h-4 text-gray-400" />Contato/WhatsApp</span>
              <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{mockRestaurantData.contact}</span>
            </div>
            <div className="p-4 flex justify-between items-center">
              <span className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"><Mail className="w-4 h-4 text-gray-400" />E-mail</span>
              <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{mockRestaurantData.email}</span>
            </div>
            <div className="p-4 flex justify-between items-center">
              <span className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400"><Badge className="w-4 h-4 text-gray-400" />CNPJ</span>
              <span className="text-sm font-bold text-gray-900 dark:text-gray-100">{mockRestaurantData.cnpj}</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Cardápio */}
      <div className="px-4 mt-4">
        <Card className="shadow-sm border-none rounded-xl">
          <CardHeader className="px-4 pt-4 pb-2">
            <CardTitle className="text-primary dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">Cardápio</CardTitle>
          </CardHeader>
          <CardContent className="p-4 space-y-3">
            <Button className="w-full h-10 bg-highlight hover:bg-highlight/90 text-white text-sm font-bold rounded-xl">
              <Upload className="w-4 h-4 mr-2" />
              Atualizar Cardápio
            </Button>
            <Button className="w-full h-10 bg-highlight hover:bg-highlight/90 text-white text-sm font-bold rounded-xl">
              <Settings className="w-4 h-4 mr-2" />
              Gerenciar Categorias
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Plano e Assinatura */}
      <div className="px-4 mt-4">
        <div className="bg-gradient-to-br from-yellow-400/20 to-amber-500/20 dark:from-yellow-800/10 dark:to-amber-800/20 rounded-xl shadow-sm border border-yellow-600/30">
          <CardHeader className="px-4 pt-4 pb-2">
            <CardTitle className="text-primary dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">Plano e Assinatura</CardTitle>
          </CardHeader>
          <CardContent className="p-4">
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">Plano atual: <span className="font-bold text-primary dark:text-white">{isPremium ? 'Premium' : 'Free'}</span></p>
            <div className="bg-white/50 dark:bg-gray-800/50 p-4 rounded-lg space-y-2 mb-4">
              <p className="text-sm font-semibold text-yellow-700 dark:text-yellow-400">Opções Premium:</p>
              <ul className="space-y-1.5 text-gray-700 dark:text-gray-300">
                {PremiumFeatures.map((feature, index) => {
                  const Icon = feature.icon;
                  return (
                    <li key={index} className="flex items-center gap-2 text-sm">
                      <Icon className="w-4 h-4 text-yellow-600 fill-yellow-600" />
                      {feature.label}
                    </li>
                  );
                })}
              </ul>
            </div>
            <Button 
              className="w-full h-12 bg-highlight text-white text-base font-bold rounded-xl shadow-lg shadow-highlight/40 hover:bg-highlight/90"
              onClick={() => navigate('/upgrade')} // Mock navigation
            >
              <Crown className="w-5 h-5 mr-2" />
              Ativar Premium
            </Button>
          </CardContent>
        </div>
      </div>

      {/* Preferências e Personalização */}
      <div className="px-4 mt-4">
        <Card className="shadow-sm border-none rounded-xl">
          <CardHeader className="px-4 pt-4 pb-2">
            <CardTitle className="text-primary dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">Preferências e Personalização</CardTitle>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-gray-200 dark:divide-gray-700">
            <div className="p-4 flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Alertas de pedidos</span>
              <Switch checked={alertsEnabled} onCheckedChange={setAlertsEnabled} className="data-[state=checked]:bg-highlight" />
            </div>
            <div className="p-4 flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Alertas de visitas</span>
              <Switch checked={visitsEnabled} onCheckedChange={setVisitsEnabled} className="data-[state=checked]:bg-highlight" />
            </div>
            <div className="p-4 flex justify-between items-center">
              <span className="text-sm text-gray-600 dark:text-gray-400">Novos seguidores</span>
              <Switch checked={followersEnabled} onCheckedChange={setFollowersEnabled} className="data-[state=checked]:bg-highlight" />
            </div>
            <div 
              className={cn(
                "p-4 flex justify-between items-center cursor-pointer",
                isPremium ? "text-primary dark:text-white hover:bg-gray-50 dark:hover:bg-gray-700/50" : "text-highlight dark:text-highlight font-semibold opacity-70 cursor-not-allowed"
              )}
              onClick={() => isPremium && navigate('/manage-channels')} // Mock navigation
            >
              <span className="flex items-center gap-2 text-sm">
                <Lock className="w-4 h-4" /> 
                Premium: Gerenciar canais
              </span>
              <ChevronRight className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Suporte e Conta */}
      <div className="px-4 mt-4">
        <Card className="shadow-sm border-none rounded-xl">
          <CardHeader className="px-4 pt-4 pb-2">
            <CardTitle className="text-primary dark:text-white text-lg font-bold leading-tight tracking-[-0.015em]">Suporte e Conta</CardTitle>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-gray-200 dark:divide-gray-700">
            <a className="p-4 flex justify-between items-center text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50" href="#">
              <span className="text-sm">Central de Ajuda</span>
              <ChevronRight className="w-5 h-5" />
            </a>
            <a className="p-4 flex justify-between items-center text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50" href="#">
              <span className="text-sm">Falar com o Suporte</span>
              <ChevronRight className="w-5 h-5" />
            </a>
            <a className="p-4 flex justify-between items-center text-gray-800 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700/50" href="#">
              <span className="text-sm">Termos e Política de Privacidade</span>
              <ChevronRight className="w-5 h-5" />
            </a>
            <div className="p-4">
              <Button 
                onClick={handleSignOut}
                variant="ghost"
                className="w-full h-10 bg-red-600/10 text-red-600 dark:bg-red-500/20 dark:text-red-500 text-sm font-bold rounded-xl hover:bg-red-600/20"
              >
                <LogOut className="w-4 h-4 mr-2" />
                Sair da conta
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <RestaurantBottomNav />
    </div>
  );
};

export default ProfileMenu;