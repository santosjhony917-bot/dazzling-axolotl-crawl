"use client";

import React from 'react';
import { MapPin, Heart, Loader2, ExternalLink, Clock, CreditCard } from 'lucide-react'; // Adicionado Clock e CreditCard
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { RestaurantProfile } from '@/types/restaurant'; // Assumindo que RestaurantProfile é uma exportação nomeada
import RestaurantActionsBar from './RestaurantActionsBar'; // Alterado para importação padrão
import { Separator } from '@/components/ui/separator';
import { OpeningHoursDisplay } from './OpeningHoursDisplay'; // Alterado para importação nomeada
import { Card } from '@/components/ui/card';

interface RestaurantProfileHeaderProps {
  restaurant: RestaurantProfile;
  isPremium: boolean;
  toggleFavorite: () => void;
  isFavoriteMutating: boolean;
  handleShare: () => void;
  addressItems: { icon: JSX.Element; value: string; link?: string; isExternal?: boolean }[];
  fullAddress: string;
  paymentMethods: string[];
}

export const RestaurantProfileHeader: React.FC<RestaurantProfileHeaderProps> = ({
  restaurant,
  isPremium,
  toggleFavorite,
  isFavoriteMutating,
  handleShare,
  addressItems,
  fullAddress,
  paymentMethods,
}) => {
  const { name, cover_image_url: coverImageUrl, description, followers_count, statusText, opening_hours } = restaurant;

  return (
    <>
      {/* 1. Barra de Ações Flutuante (Sticky) */}
      <RestaurantActionsBar
        isFavorite={restaurant.is_favorite}
        onFavoriteToggle={toggleFavorite}
        isFavoriteMutating={isFavoriteMutating}
        onShare={handleShare}
        onBack={() => window.history.back()}
      />

      {/* 2. Seção da Capa (apenas para Premium) */}
      {isPremium && coverImageUrl && (
        <div className="relative w-full h-[200px] md:h-[300px] overflow-hidden"> {/* Altura fixa para a capa */}
          <img
            src={coverImageUrl}
            alt={`Capa de ${name}`}
            className="w-full h-4/5 object-cover object-center" // Alterado h-full para h-4/5
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent"></div>
        </div>
      )}

      {/* 3. Conteúdo Principal do Cabeçalho */}
      <div className={cn("container mx-auto", isPremium ? "-mt-20 relative z-10 px-4" : "pt-20 px-4")}>
        <div className={cn(
          "bg-white rounded-lg shadow-lg p-4 md:p-6",
          isPremium ? "border border-gray-200" : "bg-gray-50 shadow-sm rounded-b-lg"
        )}>
          <h1 className="text-3xl md:text-4xl font-extrabold leading-tight text-primary mb-2">{name}</h1>

          {restaurant.addressSummary && (
            <p className="flex items-center text-sm md:text-base text-gray-600 mb-2">
              <MapPin className="w-4 h-4 mr-1 text-gray-500" /> {restaurant.addressSummary}
            </p>
          )}

          <div className="flex items-center gap-2 mb-4">
            <span className="flex items-center text-sm text-gray-500">
              <Heart className="w-4 h-4 mr-1 fill-gray-400 text-gray-400" /> {followers_count} Seguidores
            </span>
            <Button
              variant={isPremium ? "default" : "outline"}
              size="sm"
              onClick={toggleFavorite}
              disabled={isFavoriteMutating}
              className="px-4 py-2 text-sm"
            >
              {isFavoriteMutating ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                restaurant.is_favorite ? 'Seguindo' : 'Seguir'
              )}
            </Button>
          </div>

          {/* Status de Abertura */}
          <span
            className={cn(
              "px-3 py-1 rounded-full text-xs font-semibold",
              restaurant.isOpen ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
            )}
          >
            {statusText}
          </span>
        </div>

        {/* Descrição (apenas para Premium) */}
        {isPremium && description && (
          <Card className="p-4 shadow-soft-md rounded-xl bg-white border border-gray-300 mt-6">
            <h2 className="text-2xl font-bold text-primary mb-3">Sobre</h2>
            <p className="text-gray-600">{description}</p>
          </Card>
        )}

        {/* Informações de Endereço, Horário e Pagamento */}
        <Card className="p-4 shadow-soft-md rounded-xl bg-white border border-gray-300 mt-6">
          <h2 className="text-2xl font-bold text-primary mb-3">Informações</h2>
          <div className="space-y-4">
            {/* Endereço */}
            <div className="space-y-4">
              <div className="flex items-start">
                {addressItems[0].icon}
                <div className="ml-3 min-w-0">
                  {addressItems[0].link ? (
                    <a
                      href={addressItems[0].link}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-base font-bold text-primary hover:text-primary/90 transition-colors break-words flex items-center mt-2"
                    >
                      {addressItems[0].value}
                      {addressItems[0].isExternal && <ExternalLink className="w-4 h-4 ml-1 flex-shrink-0" />}
                    </a>
                  ) : (
                    <p className="text-base font-bold text-primary break-words mt-2">{addressItems[0].value}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Separator between Address and Opening Hours */}
            {fullAddress && opening_hours && <Separator className="my-4 bg-gray-100" />}

            {/* Horário de Funcionamento */}
            {opening_hours && (
              <div className="pt-4">
                <div className="flex items-start">
                  <Clock className="w-5 h-5 text-gray-500 mt-1 flex-shrink-0" />
                  <div className="ml-3 min-w-0">
                    <p className="text-sm font-semibold text-gray-700 mb-2">Horário de Funcionamento</p>
                    <OpeningHoursDisplay openingHours={opening_hours} />
                  </div>
                </div>
              </div>
            )}

            {/* Separador e Formas de Pagamento */}
            {paymentMethods && paymentMethods.length > 0 && (
              <>
                {/* Separator between Opening Hours and Payment Methods */}
                {(fullAddress || opening_hours) && <Separator className="my-4 bg-gray-100" />}
                <div className="pt-4">
                  <div className="flex items-start">
                    <CreditCard className="w-5 h-5 text-gray-500 mt-1 flex-shrink-0" />
                    <div className="ml-3 min-w-0">
                      <p className="text-sm font-semibold text-gray-700 mb-2">Formas de Pagamento</p>
                      <div className="flex flex-wrap gap-2">
                        {paymentMethods.map((method, index) => (
                          <span key={index} className="bg-gray-100 text-gray-700 text-xs px-3 py-1 rounded-full">
                            {method}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              </>
            )}
          </div>
        </Card>
      </div>
    </>
  );
};