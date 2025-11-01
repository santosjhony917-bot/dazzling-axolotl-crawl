"use client";

import React from 'react';
import { Phone, Mail, ExternalLink, Link, Instagram, Facebook, Globe } from 'lucide-react';
import { PublicRestaurantData, SocialNetworkLink } from '@/types/restaurant';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';
import { formatFollowersCount } from '@/utils/formatters';

interface RestaurantInfoProps {
  restaurant: PublicRestaurantData;
  isPremium: boolean;
}

const SocialIcon: React.FC<{ type: SocialNetworkLink['type'] }> = ({ type }) => {
  switch (type) {
    case 'instagram':
      return <Instagram className="w-5 h-5" />;
    case 'facebook':
      return <Facebook className="w-5 h-5" />;
    case 'website':
      return <Globe className="w-5 h-5" />;
    default:
      return <Link className="w-5 h-5" />;
  }
};

const RestaurantInfo: React.FC<RestaurantInfoProps> = ({ restaurant, isPremium }) => {
  const {
    name,
    description,
    category,
    image_url,
    followers_count,
    is_favorite,
    isOpen,
    statusText,
    social_networks,
    email,
    phone,
  } = restaurant;

  const socialLinks = social_networks || [];

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-start space-x-4">
        {/* Logo/Image */}
        <div className="flex-shrink-0">
          <img
            src={image_url || '/placeholder-restaurant.png'}
            alt={name}
            className="w-20 h-20 rounded-lg object-cover shadow-md border-2 border-white"
          />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-bold text-gray-900 truncate">{name}</h1>
          {category && (
            <p className="text-sm text-gray-500 mt-0.5">{category}</p>
          )}
          
          {/* Status */}
          <div className="mt-2 flex items-center space-x-2">
            <span className={`text-sm font-semibold ${isOpen ? 'text-green-600' : 'text-red-600'}`}>
              {statusText}
            </span>
            <span className="text-sm text-gray-500">|</span>
            <div className="flex items-center text-sm text-gray-600">
              <Heart className={`w-4 h-4 mr-1 ${is_favorite ? 'fill-red-500 text-red-500' : 'text-gray-400'}`} />
              <span>{formatFollowersCount(followers_count)} seguidores</span>
            </div>
          </div>
        </div>
      </div>

      {/* Description */}
      {description && (
        <p className="text-gray-700 text-sm">{description}</p>
      )}

      {/* Contact Info (Email/Phone) */}
      <div className="flex flex-wrap gap-4 text-sm">
        {phone && (
          <a href={`tel:${phone}`} className="flex items-center text-blue-600 hover:text-blue-800 transition-colors">
            <Phone className="w-4 h-4 mr-1.5" />
            {phone}
          </a>
        )}
        {email && (
          <a href={`mailto:${email}`} className="flex items-center text-blue-600 hover:text-blue-800 transition-colors">
            <Mail className="w-4 h-4 mr-1.5" />
            {email}
          </a>
        )}
      </div>

      {/* Social Networks */}
      {socialLinks.length > 0 && (
        <div className="flex flex-wrap gap-3 pt-2">
          {socialLinks.map((link, index) => (
            <Button key={index} variant="outline" size="icon" asChild>
              <a href={link.url} target="_blank" rel="noopener noreferrer" aria-label={link.type}>
                <SocialIcon type={link.type} />
              </a>
            </Button>
          ))}
        </div>
      )}
    </div>
  );
};

export default RestaurantInfo;