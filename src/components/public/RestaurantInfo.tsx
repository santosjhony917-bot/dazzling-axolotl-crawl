"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone, Mail, ExternalLink, Link, Instagram, Facebook, Globe } from 'lucide-react';
import { PublicRestaurantData, SocialNetworkLink } from '@/types/restaurant';

interface RestaurantInfoProps {
  id: string;
  restaurant: PublicRestaurantData;
}

const getSocialIcon = (platform: string) => {
  const lowerPlatform = platform.toLowerCase();
  if (lowerPlatform.includes('instagram')) return Instagram;
  if (lowerPlatform.includes('facebook')) return Facebook;
  if (lowerPlatform.includes('site') || lowerPlatform.includes('website')) return Globe;
  return Link;
};

const RestaurantInfo: React.FC<RestaurantInfoProps> = ({ id, restaurant }) => {
  
  const { phone, email, social_networks, plan } = restaurant;

  const contactItems = [
    {
      icon: Phone,
      label: 'Telefone',
      value: phone,
      link: phone ? `tel:${phone.replace(/\D/g, '')}` : undefined,
    },
    {
      icon: Mail,
      label: 'Email',
      value: email,
      link: email ? `mailto:${email}` : undefined,
    },
  ].filter(item => item.value);
  
  const socialLinks: SocialNetworkLink[] = (social_networks || []) as SocialNetworkLink[];

  // A seção de contato e links só aparece se houver conteúdo, independentemente do plano
  if (contactItems.length === 0 && socialLinks.length === 0) {
      return null;
  }

  return (
    <Card id={id} className="shadow-sm border border-gray-200 rounded-lg p-0"> {/* Estilo de card mais simples */}
      <CardHeader className="flex flex-row items-center space-x-3 p-4 border-b border-gray-100">
        <Phone className="w-5 h-5 text-gray-700" /> {/* Ícone mais neutro */}
        <CardTitle className="text-xl font-bold text-gray-800">Contato e Links</CardTitle> {/* Tipografia mais genérica */}
      </CardHeader>
      <CardContent className="p-4 space-y-6">
        
        {/* Contato Direto */}
        {contactItems.length > 0 && (
            <div className="space-y-4">
                <p className="text-sm font-semibold text-gray-700">Contato Direto</p>
                {contactItems.map((item, index) => (
                    <div key={index} className="flex items-start">
                        <item.icon className="w-4 h-4 text-gray-600 mt-1 flex-shrink-0" /> {/* Ícone mais neutro */}
                        <div className="ml-3 min-w-0">
                            {item.link ? (
                                <a 
                                    href={item.link} 
                                    target={item.link.startsWith('tel:') || item.link.startsWith('mailto:') ? '_self' : '_blank'}
                                    rel="noopener noreferrer" 
                                    className="text-base text-gray-900 hover:text-gray-700 transition-colors break-words flex items-center" // Cor de hover mais neutra
                                >
                                    {item.value}
                                </a>
                            ) : (
                                <p className="text-base text-gray-900 break-words">{item.value}</p>
                            )}
                        </div>
                    </div>
                ))}
            </div>
        )}

        {/* Outras Redes */}
        {socialLinks.length > 0 && (
          <div className="pt-4 border-t border-gray-100">
            <p className="text-sm font-semibold text-gray-700 mb-2">Outras Redes</p>
            <div className="flex flex-wrap gap-4">
              {socialLinks.map((link, index) => {
                const Icon = getSocialIcon(link.platform);
                return (
                  <a
                    key={index}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-gray-700 hover:underline flex items-center transition-colors" // Cor de texto e hover mais neutra
                  >
                    <Icon className="w-4 h-4 mr-1 text-gray-600" /> {/* Ícone mais neutro */}
                    {link.platform}
                  </a>
                );
              })}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RestaurantInfo;