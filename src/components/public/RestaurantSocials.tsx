"use client";

import React from 'react';
import { Card } from '@/components/ui/card';
import { SocialNetworkLink } from '@/types/restaurant';
import { Facebook, Instagram, Globe } from 'lucide-react'; // Exemplo de ícones

interface RestaurantSocialsProps {
  socialNetworks: SocialNetworkLink[];
}

const RestaurantSocials: React.FC<RestaurantSocialsProps> = ({ socialNetworks }) => {
  if (!socialNetworks || socialNetworks.length === 0) {
    return null;
  }

  const getIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'facebook':
        return <Facebook className="w-5 h-5" />;
      case 'instagram':
        return <Instagram className="w-5 h-5" />;
      default:
        return <Globe className="w-5 h-5" />;
    }
  };

  return (
    <Card className="p-4 shadow-soft-md rounded-xl bg-white border border-gray-300">
      <h2 className="text-2xl font-bold text-primary mb-3">Redes Sociais</h2>
      <div className="flex flex-wrap gap-4">
        {socialNetworks.map((link, index) => (
          <a
            key={index}
            href={link.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 text-primary hover:underline"
          >
            {getIcon(link.platform)}
            <span>{link.platform}</span>
          </a>
        ))}
      </div>
    </Card>
  );
};

export default RestaurantSocials;