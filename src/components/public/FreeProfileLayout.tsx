Restaurant) e tipando a função handleNavigate.">
import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Clock, Phone, Lock, ArrowLeft, Menu, Image, Link as LinkIcon } from 'lucide-react';
import { Restaurant } from '@/types/supabase';
import { createPageUrl, PageUrl } from '@/utils/url';
import { formatSchedule } from '@/utils/schedule';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { showError } from '@/utils/toast';
import { DEFAULT_RESTAURANT_COVER_URL, DEFAULT_RESTAURANT_LOGO_URL } from '@/constants/assets';

interface FreeProfileLayoutProps {
  restaurant: Restaurant;
}

export default function FreeProfileLayout({ restaurant }: FreeProfileLayoutProps) {
  const navigate = useNavigate();
  const formattedSchedule = formatSchedule(restaurant.opening_hours);

  const handleNavigate = (route: PageUrl) => {
    navigate(createPageUrl(route, { restaurantId: restaurant.id }));
  };

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      
      {/* Header com Botão Voltar */}
      <header className="sticky top-0 z-10 bg-white/90 backdrop-blur-sm border-b border-gray-100 dark:bg-gray-900/90 dark:border-gray-800">
        <div className="max-w-md mx-auto flex items-center p-4">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => navigate(-1)}
            className="text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <ArrowLeft className="h-6 w-6" />
          </Button>
          <h1 className="text-lg font-semibold text-gray-800 dark:text-white ml-4 truncate">{restaurant.name}</h1>
        </div>
      </header>

      <main className="max-w-md mx-auto pb-16">
        
        {/* Imagem de Capa */}
        <div className="relative h-48 w-full overflow-hidden">
          <img
            src={restaurant.cover_image_url || DEFAULT_RESTAURANT_COVER_URL}
            alt={`Capa de ${restaurant.name}`}
            className="w-full h-full object-cover"
          />
          
          {/* Logo do Restaurante */}
          <img
            src={restaurant.image_url || DEFAULT_RESTAURANT_LOGO_URL}
            alt={`Logo de ${restaurant.name}`}
            className="absolute -bottom-10 left-4 w-20 h-20 rounded-full border-4 border-white dark:border-gray-900 object-cover shadow-lg"
          />
        </div>

        <div className="p-4 pt-14 space-y-6">
          
          {/* Nome e Descrição */}
          <div className="space-y-1">
            <h2 className="text-3xl font-bold text-gray-900 dark:text-white">{restaurant.name}</h2>
            {restaurant.category && (
              <p className="text-sm font-medium text-highlight dark:text-highlight-light">{restaurant.category}</p>
            )}
            {restaurant.description && (
              <p className="text-gray-600 dark:text-gray-400 mt-2">{restaurant.description}</p>
            )}
          </div>

          <Separator className="dark:bg-gray-700" />

          {/* Informações de Contato e Localização */}
          <div className="space-y-3">
            {restaurant.address && (
              <div className="flex items-start gap-3 text-gray-700 dark:text-gray-300">
                <MapPin className="w-5 h-5 flex-shrink-0 mt-1 text-highlight dark:text-highlight-light" />
                <p className="text-base">
                  {restaurant.address}, {restaurant.number} - {restaurant.neighborhood}, {restaurant.city} - {restaurant.state}, {restaurant.cep}
                </p>
              </div>
            )}
            
            <div className="flex items-start gap-3 text-gray-700 dark:text-gray-300">
              <Clock className="w-5 h-5 flex-shrink-0 mt-1 text-highlight dark:text-highlight-light" />
              <p className="text-base">
                {formattedSchedule.status}
                {formattedSchedule.nextOpenTime && (
                  <span className="block text-sm text-gray-500 dark:text-gray-400">
                    {formattedSchedule.nextOpenTime}
                  </span>
                )}
              </p>
            </div>

            {restaurant.phone && (
              <a href={`tel:${restaurant.phone.replace(/\D/g, '')}`} className="flex items-center gap-3 text-gray-700 dark:text-gray-300 hover:text-highlight dark:hover:text-highlight-light transition-colors">
                <Phone className="w-5 h-5 flex-shrink-0 text-highlight dark:text-highlight-light" />
                <p className="text-base">{restaurant.phone}</p>
              </a>
            )}
          </div>

          <Separator className="dark:bg-gray-700" />

          {/* Ações e Links */}
          <div className="bg-gray-50 dark:bg-gray-800 rounded-xl overflow-hidden shadow-sm border border-gray-100 dark:border-gray-700">
            
            {/* Cardápio Completo (Funcional para Free) */}
            <div 
              className="p-4 flex justify-between items-center text-gray-800 dark:text-white font-semibold cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              onClick={() => handleNavigate('restaurantMenu')}
            >
              <span className="flex items-center gap-2 text-base">
                <Menu className="w-5 h-5 text-highlight dark:text-highlight-light" /> Cardápio Completo
              </span>
              <span className="text-sm text-gray-500 dark:text-gray-400">Ver todos</span>
            </div>
            
            <Separator className="dark:bg-gray-700" />

            {/* Galeria de Fotos (Bloqueado para Free) */}
            <div className="p-4 flex justify-between items-center text-highlight dark:text-highlight font-semibold cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50" onClick={() => showError("Recurso Premium: Galeria de Fotos")}>
              <span className="flex items-center gap-2 text-sm">
                <Lock className="w-4 h-4" /> Premium: Galeria de Fotos
              </span>
            </div>
            
            <Separator className="dark:bg-gray-700" />

            {/* Links de Venda (Bloqueado para Free) */}
            <div className="p-4 flex justify-between items-center text-highlight dark:text-highlight font-semibold cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700/50" onClick={() => showError("Recurso Premium: Links de Venda")}>
              <span className="flex items-center gap-2 text-sm">
                <Lock className="w-4 h-4" /> Premium: Links de Venda
              </span>
            </div>
            
          </div>
          
          {/* Links Externos (Se houver) - Não deve aparecer no Free, mas mantendo a estrutura para segurança */}
          {/* Se o restaurante for Free, esses campos devem estar vazios, mas se por algum motivo tiverem dados, não serão exibidos aqui. */}
          
        </div>
      </main>
    </div>
  );
}