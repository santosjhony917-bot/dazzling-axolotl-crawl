"use client";

import React from 'react';
import { Instagram, Facebook, Globe, Link as LinkIcon } from 'lucide-react';

interface SocialNetworkIconsProps {
  socialNetworks: { platform: string; url: string }[];
}

const socialIconMap: { [key: string]: React.ElementType } = {
  instagram: Instagram,
  facebook: Facebook,
  website: Globe,
  // Add more as needed
};

export const SocialNetworkIcons: React.FC<SocialNetworkIconsProps> = ({ socialNetworks }) => {
  if (!socialNetworks || socialNetworks.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-3">
      {socialNetworks.map((network, index) => {
        const Icon = socialIconMap[network.platform.toLowerCase()] || LinkIcon;
        return (
          <a
            key={index}
            href={network.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-1 text-gray-600 hover:text-primary transition-colors"
          >
            <Icon className="w-5 h-5" />
            <span className="capitalize">{network.platform}</span>
          </a>
        );
      })}
    </div>
  );
};