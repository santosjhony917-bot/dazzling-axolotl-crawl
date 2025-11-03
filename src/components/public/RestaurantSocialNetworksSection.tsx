"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PublicRestaurantData } from '@/types/restaurant'; // Changed from Restaurant
import { Facebook, Instagram, Twitter, Globe } from 'lucide-react';
import { Link } from 'react-router-dom';

interface RestaurantSocialNetworksSectionProps {
  restaurant: PublicRestaurantData; // Changed type here
}

export function RestaurantSocialNetworksSection({ restaurant }: RestaurantSocialNetworksSectionProps) {
  const socialNetworks = restaurant.social_networks || [];

  const getIcon = (platform: string) => {
    switch (platform.toLowerCase()) {
      case 'facebook': return <Facebook className="h-5 w-5" />;
      case 'instagram': return <Instagram className="h-5 w-5" />;
      case 'twitter': return <Twitter className="h-5 w-5" />;
      default: return <Globe className="h-5 w-5" />;
    }
  };

  return (
    <Card className="w-full max-w-4xl mx-auto shadow-lg">
      <CardHeader>
        <CardTitle className="text-2xl font-extrabold text-primary">Redes Sociais</CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {socialNetworks.length > 0 ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {socialNetworks.map((network, index: number) => ( // Removed 'any' type
              <Link
                key={index}
                to={network.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center space-x-3 p-3 border rounded-lg hover:bg-gray-50 transition-colors"
              >
                {getIcon(network.platform)}
                <span className="text-blue-600 hover:underline">{network.platform}</span>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-gray-500 text-center">Nenhuma rede social cadastrada.</p>
        )}
      </CardContent>
    </Card>
  );
}