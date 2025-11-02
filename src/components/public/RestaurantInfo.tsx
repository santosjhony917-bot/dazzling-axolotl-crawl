"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone, Mail, MapPin, Globe, Instagram, Facebook, Link as LinkIcon, CreditCard, UtensilsCrossed } from 'lucide-react';
import { Separator } from '@/components/ui/separator';
import { Button } from '@/components/ui/button';
import { formatPhoneNumber } from '@/utils/formatters';
import { OpeningHoursDisplay } from '@/components/restaurant/OpeningHoursDisplay';
import { PaymentMethodIcons } from '@/components/restaurant/PaymentMethodIcons';
import { SocialNetworkIcons } from '@/components/restaurant/SocialNetworkIcons';

interface RestaurantInfoProps {
  restaurant: {
    id: string;
    name: string;
    description?: string;
    image_url?: string;
    cover_image_url?: string;
    plan: 'free' | 'basic' | 'premium' | 'premium_gift'; // Adicionado 'premium_gift'
    phone?: string;
    email?: string;
    whatsapp_url?: string;
    ifood_url?: string;
    other_url?: string;
    address?: string;
    number?: string;
    neighborhood?: string;
    city?: string;
    state?: string;
    cep?: string;
    latitude?: number;
    longitude?: number;
    opening_hours?: any;
    external_url?: string;
    payment_methods?: string[];
    social_networks?: { platform: string; url: string }[];
  };
}

const RestaurantInfo: React.FC<RestaurantInfoProps> = ({ restaurant }) => {
  const hasContactInfo = restaurant.phone || restaurant.email || restaurant.whatsapp_url || restaurant.ifood_url || restaurant.other_url || restaurant.external_url || (restaurant.social_networks && restaurant.social_networks.length > 0);
  const hasAddressInfo = restaurant.address || restaurant.neighborhood || restaurant.city || restaurant.state || restaurant.cep;
  const hasPaymentMethods = restaurant.payment_methods && restaurant.payment_methods.length > 0;

  return (
    <div className="space-y-6">
      {restaurant.description && (
        <Card className="shadow-soft-md border-none rounded-xl p-0">
          <CardHeader className="flex flex-row items-center space-x-3 p-4 border-b border-gray-100">
            <UtensilsCrossed className="w-6 h-6 text-primary" />
            <CardTitle className="text-2xl font-extrabold text-primary">Sobre {restaurant.name}</CardTitle>
          </CardHeader>
          <CardContent className="p-4 text-gray-700">
            <p>{restaurant.description}</p>
          </CardContent>
        </Card>
      )}

      {hasAddressInfo && (
        <Card className="shadow-soft-md border-none rounded-xl p-0">
          <CardHeader className="flex flex-row items-center space-x-3 p-4 border-b border-gray-100">
            <MapPin className="w-6 h-6 text-primary" />
            <CardTitle className="text-2xl font-extrabold text-primary">Localização</CardTitle>
          </CardHeader>
          <CardContent className="p-4 text-gray-700">
            <p>
              {restaurant.address}
              {restaurant.number && `, ${restaurant.number}`}
              {restaurant.neighborhood && ` - ${restaurant.neighborhood}`}
            </p>
            <p>
              {restaurant.city}
              {restaurant.state && ` - ${restaurant.state}`}
              {restaurant.cep && `, ${restaurant.cep}`}
            </p>
            {restaurant.latitude && restaurant.longitude && (
              <Button variant="link" className="p-0 h-auto mt-2" onClick={() => window.open(`https://www.google.com/maps/search/?api=1&query=${restaurant.latitude},${restaurant.longitude}`, '_blank')}>
                Ver no Mapa
              </Button>
            )}
          </CardContent>
        </Card>
      )}

      {restaurant.opening_hours && Object.keys(restaurant.opening_hours).length > 0 && (
        <Card className="shadow-soft-md border-none rounded-xl p-0">
          <CardHeader className="flex flex-row items-center space-x-3 p-4 border-b border-gray-100">
            <Globe className="w-6 h-6 text-primary" />
            <CardTitle className="text-2xl font-extrabold text-primary">Horário de Funcionamento</CardTitle>
          </CardHeader>
          <CardContent className="p-4 text-gray-700">
            <OpeningHoursDisplay openingHours={restaurant.opening_hours} />
          </CardContent>
        </Card>
      )}

      {hasPaymentMethods && (
        <Card className="shadow-soft-md border-none rounded-xl p-0">
          <CardHeader className="flex flex-row items-center space-x-3 p-4 border-b border-gray-100">
            <CreditCard className="w-6 h-6 text-primary" />
            <CardTitle className="text-2xl font-extrabold text-primary">Formas de Pagamento</CardTitle>
          </CardHeader>
          <CardContent className="p-4 text-gray-700 flex flex-wrap gap-3">
            <PaymentMethodIcons paymentMethods={restaurant.payment_methods || []} />
          </CardContent>
        </Card>
      )}

      {(restaurant.plan === 'premium' || restaurant.plan === 'premium_gift') && hasContactInfo && (
        <Card id={restaurant.id} className="shadow-soft-md border-none rounded-xl p-0">
          <CardHeader className="flex flex-row items-center space-x-3 p-4 border-b border-gray-100">
            <Phone className="w-6 h-6 text-primary" />
            <CardTitle className="text-2xl font-extrabold text-primary">Contato e Links</CardTitle>
          </CardHeader>
          <CardContent className="p-4 text-gray-700 space-y-3">
            {restaurant.phone && (
              <div className="flex items-center space-x-2">
                <Phone className="w-5 h-5 text-gray-500" />
                <a href={`tel:${restaurant.phone}`} className="hover:underline">
                  {formatPhoneNumber(restaurant.phone)}
                </a>
              </div>
            )}
            {restaurant.email && (
              <div className="flex items-center space-x-2">
                <Mail className="w-5 h-5 text-gray-500" />
                <a href={`mailto:${restaurant.email}`} className="hover:underline">
                  {restaurant.email}
                </a>
              </div>
            )}
            {restaurant.whatsapp_url && (
              <div className="flex items-center space-x-2">
                <LinkIcon className="w-5 h-5 text-gray-500" />
                <a href={restaurant.whatsapp_url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                  WhatsApp
                </a>
              </div>
            )}
            {restaurant.ifood_url && (
              <div className="flex items-center space-x-2">
                <LinkIcon className="w-5 h-5 text-gray-500" />
                <a href={restaurant.ifood_url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                  iFood
                </a>
              </div>
            )}
            {restaurant.external_url && (
              <div className="flex items-center space-x-2">
                <LinkIcon className="w-5 h-5 text-gray-500" />
                <a href={restaurant.external_url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                  Site Oficial
                </a>
              </div>
            )}
            {restaurant.other_url && (
              <div className="flex items-center space-x-2">
                <LinkIcon className="w-5 h-5 text-gray-500" />
                <a href={restaurant.other_url} target="_blank" rel="noopener noreferrer" className="hover:underline">
                  Outro Link
                </a>
              </div>
            )}
            {restaurant.social_networks && restaurant.social_networks.length > 0 && (
              <>
                {(restaurant.phone || restaurant.email || restaurant.whatsapp_url || restaurant.ifood_url || restaurant.external_url || restaurant.other_url) && <Separator className="my-3" />}
                <div className="flex flex-wrap gap-3">
                  <SocialNetworkIcons socialNetworks={restaurant.social_networks} />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default RestaurantInfo;