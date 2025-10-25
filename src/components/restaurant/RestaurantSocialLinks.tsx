import React from 'react';
import { Restaurant } from '@/types/supabase';
import { Button } from '@/components/ui/button';
import { ExternalLink, Phone, Mail, MessageCircle, Globe } from 'lucide-react';

interface RestaurantSocialLinksProps {
  restaurant: Restaurant;
}

const RestaurantSocialLinks: React.FC<RestaurantSocialLinksProps> = ({ restaurant }) => {
  const links = [
    {
      key: 'whatsapp_url',
      label: 'WhatsApp',
      icon: MessageCircle,
      url: restaurant.whatsapp_url,
      color: 'bg-green-500 hover:bg-green-600',
    },
    {
      key: 'ifood_url',
      label: 'iFood',
      icon: ExternalLink,
      url: restaurant.ifood_url,
      color: 'bg-red-500 hover:bg-red-600',
    },
    {
      key: 'other_url',
      label: 'Outro Link',
      icon: Globe,
      url: restaurant.other_url,
      color: 'bg-blue-500 hover:bg-blue-600',
    },
    {
      key: 'external_url',
      label: 'Site/Link Externo',
      icon: ExternalLink,
      url: restaurant.external_url,
      color: 'bg-purple-500 hover:bg-purple-600',
    },
    {
      key: 'phone',
      label: 'Ligar',
      icon: Phone,
      url: restaurant.phone ? `tel:${restaurant.phone.replace(/\D/g, '')}` : null,
      color: 'bg-gray-500 hover:bg-gray-600',
    },
    {
      key: 'email',
      label: 'Enviar Email',
      icon: Mail,
      url: restaurant.email ? `mailto:${restaurant.email}` : null,
      color: 'bg-gray-500 hover:bg-gray-600',
    },
  ].filter(link => link.url);

  if (links.length === 0) {
    return <p className="text-gray-500 dark:text-gray-400">Nenhum canal de venda configurado.</p>;
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {links.map((link) => (
        <Button
          key={link.key}
          asChild
          className={`w-full text-white ${link.color} transition-colors duration-200`}
        >
          <a href={link.url!} target="_blank" rel="noopener noreferrer" className="flex items-center justify-center space-x-2">
            <link.icon className="w-5 h-5" />
            <span>{link.label}</span>
          </a>
        </Button>
      ))}
    </div>
  );
};

export default RestaurantSocialLinks;