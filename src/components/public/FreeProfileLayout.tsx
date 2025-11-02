"use client";

import React from 'react';
import { Button } from '@/components/ui/button';
import { MapPin, Clock, Phone, Mail, Globe, Instagram, Facebook, Link as LinkIcon } from 'lucide-react';
import { AspectRatio } from '@/components/ui/aspect-ratio';
import { Separator } from '@/components/ui/separator';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { WeekSchedule } from '@/types/common'; // Importa WeekSchedule
import { Restaurant } from '@/types/supabase';

// Define o tipo para os dados públicos do restaurante
interface PublicRestaurantData extends Omit<Restaurant, 'opening_hours' | 'social_networks'> {
  opening_hours: WeekSchedule | null;
  social_networks: Array<{ type: string; url: string }> | null;
}

interface FreeProfileLayoutProps {
  restaurant: PublicRestaurantData;
  toggleFavorite: () => void;
  isFavoriteMutating: boolean;
}

const FreeProfileLayout: React.FC<FreeProfileLayoutProps> = ({ restaurant, toggleFavorite, isFavoriteMutating }) => {
  // A lógica de carregamento e erro agora é tratada pelo componente pai (RestaurantProfilePublic)
  // e o restaurante é passado diretamente como prop.

  const contactItems = [];
  if (restaurant.phone) {
    contactItems.push({ icon: Phone, text: restaurant.phone, link: `tel:${restaurant.phone}` });
  }
  if (restaurant.email) {
    contactItems.push({ icon: Mail, text: restaurant.email, link: `mailto:${restaurant.email}` });
  }

  const socialNetworkItems = [];
  if (restaurant.social_networks && Array.isArray(restaurant.social_networks)) {
    restaurant.social_networks.forEach((network) => {
      if (network.type === 'instagram' && network.url) {
        socialNetworkItems.push({ icon: Instagram, text: 'Instagram', link: network.url });
      } else if (network.type === 'facebook' && network.url) {
        socialNetworkItems.push({ icon: Facebook, text: 'Facebook', link: network.url });
      } else if (network.type === 'website' && network.url) {
        socialNetworkItems.push({ icon: Globe, text: 'Website', link: network.url });
      }
    });
  }

  const hasAddress = restaurant.address && restaurant.number && restaurant.neighborhood && restaurant.city && restaurant.state && restaurant.cep;
  const fullAddress = hasAddress
    ? `${restaurant.address}, ${restaurant.number} - ${restaurant.neighborhood}, ${restaurant.city} - ${restaurant.state}, ${restaurant.cep}`
    : null;

  const hasOpeningHours = restaurant.opening_hours && Object.keys(restaurant.opening_hours).length > 0;

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Cover Image */}
      <div className="relative h-48 md:h-64 bg-gray-200">
        {restaurant.cover_image_url ? (
          <img src={restaurant.cover_image_url} alt="Capa do Restaurante" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full bg-gradient-to-r from-orange-400 to-red-500 flex items-center justify-center text-white text-2xl font-bold">
            {restaurant.name}
          </div>
        )}
        <div className="absolute bottom-0 left-4 -mb-12">
          <Avatar className="w-24 h-24 md:w-32 md:h-32 border-4 border-white shadow-lg">
            <AvatarImage src={restaurant.image_url || undefined} alt={restaurant.name} />
            <AvatarFallback className="bg-orange-500 text-white text-3xl md:text-4xl font-bold">
              {restaurant.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 pt-16 md:pt-20">
        {/* Restaurant Header */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-6">
          <div className="flex-1">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">{restaurant.name}</h1>
            {restaurant.category && (
              <p className="text-lg text-gray-600 mb-2">{restaurant.category}</p>
            )}
            {restaurant.description && (
              <p className="text-gray-700 leading-relaxed">{restaurant.description}</p>
            )}
          </div>
          <div className="mt-4 md:mt-0 flex space-x-2">
            {restaurant.whatsapp_url && (
              <Button asChild variant="outline" className="bg-green-500 text-white hover:bg-green-600 hover:text-white">
                <a href={restaurant.whatsapp_url} target="_blank" rel="noopener noreferrer">WhatsApp</a>
              </Button>
            )}
            {restaurant.ifood_url && (
              <Button asChild variant="outline" className="bg-red-500 text-white hover:bg-red-600 hover:text-white">
                <a href={restaurant.ifood_url} target="_blank" rel="noopener noreferrer">iFood</a>
              </Button>
            )}
            {restaurant.other_url && (
              <Button asChild variant="outline" className="bg-blue-500 text-white hover:bg-blue-600 hover:text-white">
                <a href={restaurant.other_url} target="_blank" rel="noopener noreferrer">Website</a>
              </Button>
            )}
          </div>
        </div>

        <Separator className="my-8" />

        {/* Contact & Links Section */}
        <section id="contact-links-section" className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Contato e Localização</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Contato Direto */}
            {restaurant.plan !== 'free' && contactItems.length > 0 && (
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="text-xl font-semibold text-gray-700 mb-3">Contato Direto</h3>
                <div className="space-y-3">
                  {contactItems.map((item, index) => (
                    <a key={index} href={item.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-gray-700 hover:text-blue-600 transition-colors">
                      <item.icon className="h-5 w-5 text-orange-500" />
                      <span>{item.text}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Outras Redes */}
            {restaurant.plan !== 'free' && socialNetworkItems.length > 0 && (
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="text-xl font-semibold text-gray-700 mb-3">Outras Redes</h3>
                <div className="space-y-3">
                  {socialNetworkItems.map((item, index) => (
                    <a key={index} href={item.link} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-gray-700 hover:text-blue-600 transition-colors">
                      <item.icon className="h-5 w-5 text-orange-500" />
                      <span>{item.text}</span>
                    </a>
                  ))}
                </div>
              </div>
            )}

            {/* Endereço */}
            {fullAddress && (
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="text-xl font-semibold text-gray-700 mb-3">Endereço</h3>
                <a href={`https://www.google.com/maps/search/?api=1&query=${restaurant.latitude},${restaurant.longitude}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-gray-700 hover:text-blue-600 transition-colors">
                  <MapPin className="h-5 w-5 text-orange-500" />
                  <span>{fullAddress}</span>
                </a>
              </div>
            )}

            {/* Horário de Funcionamento */}
            {hasOpeningHours && (
              <div className="bg-white p-6 rounded-lg shadow-sm">
                <h3 className="text-xl font-semibold text-gray-700 mb-3">Horário de Funcionamento</h3>
                <div className="space-y-3">
                  {Object.entries(restaurant.opening_hours || {}).map(([day, hours]) => (
                    <div key={day} className="flex items-center gap-3 text-gray-700">
                      <Clock className="h-5 w-5 text-orange-500" />
                      <span className="font-medium capitalize">{day}:</span>
                      <span>{hours?.open} - {hours?.close}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>

        <Separator className="my-8" />

        {/* Menu Section (Placeholder) */}
        <section id="menu-section" className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Cardápio</h2>
          <div className="bg-white p-6 rounded-lg shadow-sm text-gray-600">
            <p>O cardápio completo estará disponível aqui em breve!</p>
            <Button className="mt-4">Ver Cardápio</Button>
          </div>
        </section>

        <Separator className="my-8" />

        {/* Gallery Section (Placeholder) */}
        <section id="gallery-section" className="mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Galeria de Fotos</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <AspectRatio ratio={16 / 9} className="bg-gray-200 rounded-lg flex items-center justify-center text-gray-500">
              Imagem 1
            </AspectRatio>
            <AspectRatio ratio={16 / 9} className="bg-gray-200 rounded-lg flex items-center justify-center text-gray-500">
              Imagem 2
            </AspectRatio>
            <AspectRatio ratio={16 / 9} className="bg-gray-200 rounded-lg flex items-center justify-center text-gray-500">
              Imagem 3
            </AspectRatio>
          </div>
        </section>
      </div>
    </div>
  );
};

export default FreeProfileLayout;