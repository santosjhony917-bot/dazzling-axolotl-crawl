import React from "react";
import { motion } from "framer-motion";
import { MapPin, Edit, BarChart3, LogOut, Crown, DollarSign, Star, TrendingUp, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useUserRole } from "@/hooks/useUserRole";
import { Skeleton } from "@/components/ui/skeleton";
import RestaurantBottomNav from "@/components/restaurant/RestaurantBottomNav";
import { useRestaurantProfile } from "@/hooks/useRestaurantProfile";
import { useAuth } from "@/hooks/useAuth";
import { createPageUrl } from "@/utils/url";

// Subcomponent for Quick Action Buttons
const QuickActionButton: React.FC<{ icon: React.ElementType; title: string; subtitle: string; onClick: () => void; colorClass: string }> = ({ icon: Icon, title, subtitle, onClick, colorClass }) => (
  <motion.button
    whileHover={{ scale: 1.02 }}
    whileTap={{ scale: 0.98 }}
    onClick={onClick}
    className="flex items-center justify-center gap-2 h-16 bg-white rounded-2xl shadow-sm border border-gray-100 hover:shadow-md transition-all"
  >
    <Icon className={`w-5 h-5 ${colorClass}`} />
    <div className="text-left">
      <p className="text-sm font-semibold text-gray-900">{title}</p>
      <p className="text-xs text-gray-500">{subtitle}</p>
    </div>
  </motion.button>
);

// Subcomponent for Performance Metric Card
const PerformanceMetricCard: React.FC<{ icon: React.ElementType; title: string; value: string; colorClass: string }> = ({ icon: Icon, title, value, colorClass }) => (
  <div className="flex flex-col items-center p-4 bg-white rounded-xl shadow-sm border border-gray-100">
    <Icon className={`w-6 h-6 mb-2 ${colorClass}`} />
    <p className="text-xs text-gray-500">{title}</p>
    <p className="text-lg font-bold text-gray-900">{value}</p>
  </div>
);

const RestaurantFreeProfile = () => {
  const navigate = useNavigate();
  const { isLoading: isRoleLoading, role } = useUserRole();
  const { restaurant, loading: isRestaurantProfileLoading } = useRestaurantProfile();
  const { signOut } = useAuth();

  const isLoading = isRoleLoading || isRestaurantProfileLoading;

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex flex-col p-4 max-w-md mx-auto">
        <Skeleton className="h-16 w-full mb-6" />
        <Skeleton className="h-20 w-full mb-6" />
        <Skeleton className="h-40 w-full mb-6" />
        <Skeleton className="h-6 w-1/2 mb-4" />
        <div className="grid grid-cols-2 gap-4">
          <Skeleton className="h-24 w-full" />
          <Skeleton className="h-24 w-full" />
        </div>
      </div>
    );
  }

  const restaurantName = restaurant?.name || "Seu Restaurante";
  const restaurantAddress = restaurant?.address || "Endereço não cadastrado";
  const restaurantCityState = [restaurant?.city, restaurant?.state].filter(Boolean).join(', ');
  const displayRole = role === 'free_restaurant' ? 'Restaurante - Plano Free' : 'Restaurante';

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white pb-24 max-w-md mx-auto">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-white/80 backdrop-blur-lg border-b border-gray-100 px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-[#E47948]/10 rounded-full flex items-center justify-center">
              <MapPin className="w-5 h-5 text-[#E47948]" />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">Localização Principal</p>
              <h2 className="text-sm font-bold text-[#022D68]">{restaurantName}</h2>
              <p className="text-xs text-gray-500">{restaurantAddress} {restaurantCityState && `(${restaurantCityState})`}</p>
              <p className="text-xs text-gray-500 font-medium">{displayRole}</p>
            </div>
          </div>
          <Button onClick={handleSignOut} variant="ghost" size="icon" className="w-10 h-10 rounded-full bg-red-100 hover:bg-red-200">
            <LogOut className="w-5 h-5 text-red-600" />
          </Button>
        </div>
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="px-4 pt-4 pb-6"
      >
        <h2 className="text-xl font-bold text-[#022D68] mb-4">Ações Rápidas</h2>
        <div className="grid grid-cols-2 gap-3">
          <QuickActionButton
            icon={Edit}
            title="Editar"
            subtitle="Cardápio"
            onClick={() => navigate(createPageUrl('restaurant-area/menu'))}
            colorClass="text-[#022D68]"
          />
          <QuickActionButton
            icon={BarChart3}
            title="Ver"
            subtitle="Estatísticas"
            onClick={() => navigate(createPageUrl('restaurant-area/stats'))}
            colorClass="text-[#E47948]"
          />
        </div>
      </motion.div>

      {/* Premium Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
        className="px-4 pb-6"
      >
        <div className="relative rounded-2xl overflow-hidden bg-gradient-to-r from-[#022D68] to-[#022D68]/80 p-6 shadow-lg">
          <div className="relative z-10">
            <h3 className="text-xl font-bold text-white mb-2">Torne-se Premium!</h3>
            <p className="text-sm text-white/90 mb-4 max-w-xs">
              Apareça para mais clientes e aumente suas vendas.
            </p>
            <Button onClick={() => navigate(createPageUrl('upgrade'))} className="bg-[#E47948] hover:bg-[#E47948]/90 text-white rounded-full font-semibold shadow-lg">
              Saiba Mais
            </Button>
          </div>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
            <div className="w-2 h-2 rounded-full bg-white"></div>
            <div className="w-2 h-2 rounded-full bg-white/50"></div>
            <div className="w-2 h-2 rounded-full bg-white/50"></div>
          </div>
        </div>
      </motion.div>

      {/* Performance Overview */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.3 }}
        className="px-4 pb-6"
      >
        <h2 className="text-xl font-bold text-[#022D68] mb-4">Visão Geral de Performance</h2>
        <div className="grid grid-cols-2 gap-3">
          <PerformanceMetricCard icon={DollarSign} title="Vendas (7 dias)" value="R$ 1.250" colorClass="text-green-600" />
          <PerformanceMetricCard icon={Star} title="Avaliação Média" value="4.5/5" colorClass="text-yellow-500" />
          <PerformanceMetricCard icon={TrendingUp} title="Visitas (7 dias)" value="320" colorClass="text-blue-600" />
          <PerformanceMetricCard icon={Crown} title="Plano Atual" value="Free" colorClass="text-gray-500" />
        </div>
      </motion.div>

      {/* Logout Button (redundant with header, but keeping for explicit request) */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.4 }}
        className="px-4 pb-6"
      >
        <Button 
          onClick={handleSignOut} 
          variant="destructive" 
          className="w-full justify-center h-12 rounded-xl mt-6"
        >
          <LogOut className="w-5 h-5 mr-2" />
          Sair da Conta
        </Button>
      </motion.div>

      <RestaurantBottomNav selectedTab="perfil" />
    </div>
  );
};

export default RestaurantFreeProfile;