import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone, Mail, ExternalLink, Link, Instagram, Facebook, Globe } from 'lucide-react'; // Importando ícones sociais
import { PublicRestaurantData, SocialNetworkLink, Restaurant } from '@/types/restaurant'; // Importar Restaurant

interface RestaurantInfoProps {
  id: string;
  restaurant: PublicRestaurantData;
}

// Mapeamento de plataformas para ícones
const getSocialIcon = (platform: string) => {
  const lowerPlatform = platform.toLowerCase();
  if (lowerPlatform.includes('instagram')) return Instagram;
  if (lowerPlatform.includes('facebook')) return Facebook;
  if (lowerPlatform.includes('site') || lowerPlatform.includes('website')) return Globe;
  return Link; // Ícone padrão para outras redes
};

const RestaurantInfo: React.FC<RestaurantInfoProps> = ({ id, restaurant }) => {
  
  // Acessar as propriedades diretamente do objeto restaurant, que agora inclui as propriedades de Restaurant
  const { phone, email, social_networks, plan, whatsapp_url, ifood_url, other_url, external_url } = restaurant;

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

  // Verifica se há links de canais de venda para incluir na seção de contato
  const salesChannelLinks = [
    {
      icon: WhatsappIcon, // Assumindo que você tem um componente WhatsappIcon
      label: 'WhatsApp',
      value: whatsapp_url,
      link: whatsapp_url,
    },
    {
      icon: 'iFood', // Ou um ícone específico para iFood
      label: 'iFood',
      value: ifood_url,
      link: ifood_url,
    },
    {
      icon: Globe,
      label: 'Outro Link',
      value: other_url,
      link: other_url,
    },
    {
      icon: Globe,
      label: 'Site Externo',
      value: external_url,
      link: external_url,
    },
  ].filter(item => item.value);

  if (plan !== 'premium' || (contactItems.length === 0 && socialLinks.length === 0 && salesChannelLinks.length === 0)) {
      return null;
  }

  return (
    <Card id={id} className="shadow-soft-md border-none rounded-xl p-0">
      <CardHeader className="flex flex-row items-center space-x-3 p-4 border-b border-gray-100">
        <Info className="w-6 h-6 text-primary" />
        <CardTitle className="text-2xl font-extrabold text-primary">Contato e Links</CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {contactItems.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-700">Informações de Contato</p>
            {contactItems.map((item, index) => (
              <div key={index} className="flex items-center">
                {React.createElement(item.icon, { className: "w-5 h-5 text-highlight mr-3" })}
                {item.link ? (
                  <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-gray-800 hover:underline">
                    {item.value}
                  </a>
                ) : (
                  <span className="text-gray-800">{item.value}</span>
                )}
              </div>
            ))}
          </div>
        )}

        {salesChannelLinks.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-700">Canais de Venda</p>
            {salesChannelLinks.map((item, index) => (
              <div key={index} className="flex items-center">
                {item.icon === 'iFood' ? ( // Renderiza iFood logo se for o caso
                  <img src="/assets/ifood-logo.svg" alt="iFood" className="w-5 h-5 mr-3" />
                ) : (
                  React.createElement(item.icon as React.ElementType, { className: "w-5 h-5 text-highlight mr-3" })
                )}
                {item.link ? (
                  <a href={item.link} target="_blank" rel="noopener noreferrer" className="text-gray-800 hover:underline">
                    {item.value}
                  </a>
                ) : (
                  <span className="text-gray-800">{item.value}</span>
                )}
              </div>
            ))}
          </div>
        )}

        {socialLinks.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-semibold text-gray-700">Redes Sociais</p>
            <div className="flex flex-wrap gap-3">
              {socialLinks.map((social, index) => (
                <a
                  key={index}
                  href={social.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 hover:bg-gray-200 transition-colors"
                  aria-label={social.platform}
                >
                  {getSocialIcon(social.platform)}
                </a>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RestaurantInfo;