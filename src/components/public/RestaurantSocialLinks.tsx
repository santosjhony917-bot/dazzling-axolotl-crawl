import React from 'react';
import { PublicRestaurantData } from '@/types/restaurant';
import { ExternalLink, Phone, Mail } from 'lucide-react';

interface RestaurantSocialLinksProps {
  restaurant: PublicRestaurantData;
}

const RestaurantSocialLinks: React.FC<RestaurantSocialLinksProps> = ({ restaurant }) => {
  const { whatsapp_url, ifood_url, other_url } = restaurant;

  const links = [
    { url: whatsapp_url, label: 'WhatsApp', icon: Phone },
    { url: ifood_url, label: 'iFood', icon: ExternalLink },
    { url: other_url, label: 'Outro Link', icon: ExternalLink },
  ].filter(link => link.url);

  if (links.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col space-y-2">
      <p className="text-base font-semibold text-primary">Redes e Links</p>
      {links.map((link, index) => {
        const Icon = link.icon;
        return (
          <a
            key={index}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-gray-600 hover:text-highlight transition-colors flex items-center"
          >
            <Icon className="w-4 h-4 mr-2 shrink-0" />
            {link.label}
          </a>
        );
      })}
    </div>
  );
};

export default RestaurantSocialLinks;