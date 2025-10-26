import React from 'react';
import { RestaurantProfile } from '@/types/supabase';
import { Button } from '@/components/ui/button';
import { ExternalLink, MessageCircle, ShoppingBag } from 'lucide-react';

interface FooterSectionProps {
  restaurant: RestaurantProfile;
}

const FooterSection: React.FC<FooterSectionProps> = ({ restaurant }) => {
  const links = [
    { 
      url: restaurant.whatsapp_url, 
      icon: MessageCircle, 
      label: 'WhatsApp', 
      className: 'bg-green-500 hover:bg-green-600 text-white' 
    },
    { 
      url: restaurant.ifood_url, 
      icon: ShoppingBag, 
      label: 'iFood', 
      className: 'bg-red-600 hover:bg-red-700 text-white' 
    },
    { 
      url: restaurant.external_url || restaurant.other_url, 
      icon: ExternalLink, 
      label: 'Site/Outro Link', 
      className: 'bg-gray-700 hover:bg-gray-800 text-white' 
    },
  ].filter(link => link.url);

  return (
    <footer className="p-4 pt-0">
      {links.length > 0 && (
        <div className="space-y-3 mb-6">
          {links.map((link, index) => (
            <Button 
              key={index} 
              asChild 
              className={`w-full ${link.className}`}
            >
              <a href={link.url} target="_blank" rel="noopener noreferrer">
                <link.icon className="w-5 h-5 mr-2" />
                {link.label}
              </a>
            </Button>
          ))}
        </div>
      )}
      
      <p className="text-center text-xs text-gray-400 dark:text-gray-600">
        &copy; {new Date().getFullYear()} {restaurant.name}. Todos os direitos reservados.
      </p>
    </footer>
  );
};

export default FooterSection;