import React, { useState, useEffect } from 'react';
import { MapPin, Bell, ChevronRight, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils/url';
import RestaurantBottomNav from '@/components/restaurant/RestaurantBottomNav';
import { Button } from '@/components/ui/button';
import useUserLocation from '@/hooks/useUserLocation'; // Importando o hook

const RestaurantDashboard: React.FC = () => {
  // Mock data for demonstration
  const restaurantName = "Meu Restaurante";
  const isFree = true; // Assume free plan for now

  const { latitude, longitude, loading: loadingLocation, error: locationError } = useUserLocation();

  const displayLocationText = () => {
    if (loadingLocation) {
      return 'Obtendo localização...';
    }
    if (locationError) {
      return 'Localização indisponível';
    }
    if (latitude && longitude) {
      // Em um aplicativo real, você usaria um serviço de geocodificação reversa
      // para obter o nome da cidade/rua a partir de lat/lng.
      // Por enquanto, exibimos um status de sucesso.
      return 'Localização obtida'; 
    }
    return 'Localização';
  };

  return (
    <div className="min-h-screen bg-background-light dark:bg-background-dark pb-24">
      {/* Header com Localização e Notificações */}
      <div className="flex items-center p-4 justify-between bg-white dark:bg-zinc-800 shadow-sm">
        <div className="flex items-center gap-2">
          {loadingLocation ? (
            <Loader2 className="text-primary w-7 h-7 animate-spin" />
          ) : (
            <MapPin className="text-primary w-7 h-7" />
          )}
          <div>
            <p className="text-text-light/60 dark:text-text-dark/60 text-xs font-medium">
              Localização Atual
            </p>
            <p className="text-primary dark:text-white text-sm font-semibold flex items-center">
              {displayLocationText()}
              {loadingLocation && <span className="ml-2 text-xs text-gray-500">Carregando...</span>}
            </p>
          </div>
        </div>
        <Link to={createPageUrl('restaurant-area/notifications')}>
          <Bell className="text-primary w-6 h-6" />
        </Link>
      </div>

      {/* Conteúdo Principal do Dashboard */}
      <div className="p-4">
        <h2 className="text-2xl font-bold text-primary dark:text-white mb-4">
          Bem-vindo(a), {restaurantName}!
        </h2>

        {/* Card de Upgrade (se for plano free) */}
        {isFree && (
          <div className="bg-highlight/10 dark:bg-highlight/20 p-4 rounded-xl mb-6 flex items-center justify-between border border-highlight">
            <div>
              <h3 className="text-lg font-bold text-highlight">Plano Gratuito</h3>
              <p className="text-sm text-highlight/80 mt-1">
                Desbloqueie recursos premium e aumente sua visibilidade.
              </p>
            </div>
            <Link to={createPageUrl('restaurant-area/upgrade')}>
              <Button className="bg-highlight hover:bg-highlight/90 text-white">
                Upgrade
              </Button>
            </Link>
          </div>
        )}

        {/* Seções de Navegação Rápida */}
        <div className="space-y-3">
          <DashboardLink 
            title="Gerenciar Cardápio" 
            description="Adicione, edite e organize seus pratos." 
            to={createPageUrl('restaurant-area/menu-management')} 
          />
          <DashboardLink 
            title="Estatísticas e Desempenho" 
            description="Veja o desempenho do seu restaurante na plataforma." 
            to={createPageUrl('restaurant-area/stats')} 
          />
          <DashboardLink 
            title="Configurações do Perfil" 
            description="Atualize informações, endereço e horário de funcionamento." 
            to={createPageUrl('restaurant-area/profile-settings')} 
          />
        </div>
      </div>

      {/* Componente de Navegação Inferior */}
      <RestaurantBottomNav selectedTab="home" isFree={isFree} />
    </div>
  );
};

// Componente auxiliar para links do dashboard
const DashboardLink: React.FC<{ title: string, description: string, to: string }> = ({ title, description, to }) => (
  <Link 
    to={to} 
    className="flex items-center justify-between p-4 bg-white dark:bg-zinc-800 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200 border border-gray-100 dark:border-zinc-700"
  >
    <div>
      <h3 className="text-lg font-semibold text-primary dark:text-white">{title}</h3>
      <p className="text-sm text-text-light/70 dark:text-text-dark/70 mt-1">{description}</p>
    </div>
    <ChevronRight className="w-5 h-5 text-primary dark:text-white" />
  </Link>
);

export default RestaurantDashboard;