"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Globe } from 'lucide-react';
import { Restaurant } from '@/types/supabase'; // Assuming Restaurant type is available

interface SocialNetworksSectionProps {
  restaurant: Restaurant;
}

const SocialNetworksSection: React.FC<SocialNetworksSectionProps> = ({ restaurant }) => {
  // Placeholder for actual social networks management
  const handleEditSocialNetworks = () => {
    alert('Funcionalidade de edição de redes sociais em breve!');
  };

  const socialNetworks = restaurant.social_networks as { platform: string; url: string }[] || []; // Assuming social_networks is an array of objects

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center"><Globe className="mr-2 h-5 w-5" /> Redes Sociais</CardTitle>
        <CardDescription>Adicione links para suas redes sociais.</CardDescription>
      </CardHeader>
      <CardContent>
        {socialNetworks.length > 0 ? (
          <ul className="list-disc list-inside space-y-1">
            {socialNetworks.map((network, index) => (
              <li key={index}>
                <a href={network.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  {network.platform}: {network.url}
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">Nenhuma rede social definida.</p>
        )}
        <Button onClick={handleEditSocialNetworks} className="mt-4 w-full bg-[#E47948] hover:bg-[#C2653B]">
          Editar Redes Sociais
        </Button>
      </CardContent>
    </Card>
  );
};

export default SocialNetworksSection;