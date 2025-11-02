import React from 'react';
import { MapPin, Phone, Clock, Utensils, DollarSign, Share2, Globe } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

interface RestaurantType { // Definindo a interface completa para o restaurante
  id: string;
  user_id: string;
  name: string;
  description: string;
  image_url: string;
  cover_image_url: string;
  plan: 'free' | 'basic' | 'premium';
  phone: string;
  email: string;
  cnpj: string;
  category: string;
  whatsapp_url: string;
  ifood_url: string;
  other_url: string;
  address: string;
  number: string;
  neighborhood: string;
  city: string;
  state: string;
  cep: string;
  latitude: number;
  longitude: number;
  opening_hours: any;
  created_at: string;
  external_url: string;
  followers_override: number;
  payment_methods: any;
  social_networks: { platform: string; url: string }[];
  is_favorited?: boolean;
}

interface RestaurantInfoProps {
  restaurant: RestaurantType;
}

const RestaurantInfo: React.FC<RestaurantInfoProps> = ({ restaurant }) => {
  const {
    description,
    address,
    number,
    neighborhood,
    city,
    state,
    phone,
    category,
    opening_hours,
    whatsapp_url,
    ifood_url,
    other_url,
    external_url,
    social_networks,
    plan,
  } = restaurant;

  const fullAddress = [address, number, neighborhood, city, state].filter(Boolean).join(', ');

  const isPremium = plan === 'premium';

  return (
    <div className="space-y-4">
      {description && (
        <div>
          <h2 className="text-xl font-bold text-primary mb-2">Sobre</h2>
          <p className="text-text-secondary">{description}</p>
        </div>
      )}

      {fullAddress && (
        <div>
          <h2 className="text-xl font-bold text-primary mb-2">Localização</h2>
          <div className="flex items-start gap-2 text-text-secondary">
            <MapPin size={20} className="flex-shrink-0 mt-1" />
            <p>{fullAddress}</p>
          </div>
        </div>
      )}

      {phone && (
        <div>
          <h2 className="text-xl font-bold text-primary mb-2">Contato</h2>
          <div className="flex items-center gap-2 text-text-secondary">
            <Phone size={20} />
            <a href={`tel:${phone}`} className="hover:underline">{phone}</a>
          </div>
        </div>
      )}

      {category && (
        <div>
          <h2 className="text-xl font-bold text-primary mb-2">Categoria</h2>
          <div className="flex items-center gap-2 text-text-secondary">
            <Utensils size={20} />
            <p>{category}</p>
          </div>
        </div>
      )}

      {opening_hours && Object.keys(opening_hours).length > 0 && (
        <div>
          <h2 className="text-xl font-bold text-primary mb-2">Horário de Funcionamento</h2>
          <div className="space-y-1 text-text-secondary">
            {Object.entries(opening_hours).map(([day, hours]: [string, any]) => (
              <div key={day} className="flex justify-between">
                <span className="capitalize">{day}:</span>
                <span>{hours.open} - {hours.close}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Links Externos e Redes Sociais (apenas para premium) */}
      {isPremium && (whatsapp_url || ifood_url || other_url || external_url || (social_networks && social_networks.length > 0)) && (
        <div>
          <h2 className="text-xl font-bold text-primary mb-2">Conecte-se</h2>
          <div className="flex flex-wrap gap-3">
            {whatsapp_url && (
              <Button asChild variant="outline" className="flex items-center gap-2">
                <a href={whatsapp_url} target="_blank" rel="noopener noreferrer">
                  <Share2 size={16} /> WhatsApp
                </a>
              </Button>
            )}
            {ifood_url && (
              <Button asChild variant="outline" className="flex items-center gap-2">
                <a href={ifood_url} target="_blank" rel="noopener noreferrer">
                  <DollarSign size={16} /> iFood
                </a>
              </Button>
            )}
            {other_url && (
              <Button asChild variant="outline" className="flex items-center gap-2">
                <a href={other_url} target="_blank" rel="noopener noreferrer">
                  <Globe size={16} /> Outro Link
                </a>
              </Button>
            )}
            {external_url && (
              <Button asChild variant="outline" className="flex items-center gap-2">
                <a href={external_url} target="_blank" rel="noopener noreferrer">
                  <Globe size={16} /> Website
                </a>
              </Button>
            )}
            {social_networks && social_networks.map((social, index) => (
              <Button key={index} asChild variant="outline" className="flex items-center gap-2">
                <a href={social.url} target="_blank" rel="noopener noreferrer">
                  <Share2 size={16} /> {social.platform}
                </a>
              </Button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default RestaurantInfo;