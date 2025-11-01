"use client";

import React from 'react';
import { Phone, Mail, ExternalLink, Link as LinkIcon, Instagram, Facebook, Globe } from 'lucide-react';
import { PublicRestaurantData } from '@/types/restaurant'; // Assuming PublicRestaurantData type is available

interface RestaurantInfoProps {
  restaurant: PublicRestaurantData;
}

const RestaurantInfo: React.FC<RestaurantInfoProps> = ({ restaurant }) => {
  const { phone, email, social_networks } = restaurant; // These fields are now part of PublicRestaurantData

  const socialLinks = (social_networks as { platform: string; url: string }[] || []).map(network => {
    let IconComponent;
    switch (network.platform.toLowerCase()) {
      case 'instagram': IconComponent = Instagram; break;
      case 'facebook': IconComponent = Facebook; break;
      default: IconComponent = LinkIcon;
    }
    return (
      <a key={network.platform} href={network.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline flex items-center">
        <IconComponent className="h-5 w-5 mr-2" /> {network.platform}
      </a>
    );
  });

  return (
    <div className="space-y-3">
      {phone && (
        <a href={`tel:${phone}`} className="flex items-center text-blue-600 hover:underline">
          <Phone className="h-5 w-5 mr-2" /> {phone}
        </a>
      )}
      {email && (
        <a href={`mailto:${email}`} className="flex items-center text-blue-600 hover:underline">
          <Mail className="h-5 w-5 mr-2" /> {email}
        </a>
      )}
      {socialLinks}
      {restaurant.external_url && (
        <a href={restaurant.external_url} target="_blank" rel="noopener noreferrer" className="flex items-center text-purple-600 hover:underline">
          <Globe className="h-5 w-5 mr-2" /> Site Externo
        </a>
      )}
    </div>
  );
};

export default RestaurantInfo;