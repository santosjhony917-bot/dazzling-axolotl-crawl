import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Phone, Mail, Globe, ExternalLink } from 'lucide-react';
import { PublicRestaurantData } from '@/types/restaurant';
import WhatsappIcon from './WhatsappIcon'; // Importando o ícone do WhatsApp

interface RestaurantInfoProps {
  id: string;
  restaurant: PublicRestaurantData;
}

interface ContactLinkItem {
  icon: React.ReactNode;
  label: string;
  value: string | undefined;
  link: string | undefined;
  isExternal: boolean;
}

const RestaurantInfo: React.FC<RestaurantInfoProps> = ({ id, restaurant }) => {
  const { phone, email, whatsapp_url, ifood_url, other_url, other_url_label, external_url } = restaurant;

  const contactItems: ContactLinkItem[] = [
    { icon: <Phone className="w-5 h-5 text-gray-500 flex-shrink-0" />, label: 'Telefone', value: phone, link: phone ? `tel:${phone}` : undefined, isExternal: false },
    { icon: <Mail className="w-5 h-5 text-gray-500 flex-shrink-0" />, label: 'Email', value: email, link: email ? `mailto:${email}` : undefined, isExternal: false },
  ].filter(item => item.value);

  const linkItems: ContactLinkItem[] = [
    { icon: <WhatsappIcon className="w-5 h-5 text-gray-500 flex-shrink-0" />, label: 'WhatsApp', value: whatsapp_url, link: whatsapp_url, isExternal: true },
    { icon: <img src="https://imagensfree.com.br/wp-content/uploads/2021/11/icone-ifood-sorriso-circulo-vermelho-png.png" alt="iFood" className="w-5 h-5 flex-shrink-0" />, label: 'iFood', value: ifood_url, link: ifood_url, isExternal: true },
    { icon: <Globe className="w-5 h-5 text-gray-500 flex-shrink-0" />, label: other_url_label || 'Website', value: other_url || external_url, link: other_url || external_url, isExternal: true },
  ].filter(item => item.value);

  if (contactItems.length === 0 && linkItems.length === 0) {
    return null;
  }

  return (
    <Card id={id} className="shadow-soft-md border-none rounded-xl p-0">
      <CardHeader className="flex flex-row items-center space-x-3 p-4 border-b border-gray-100">
        <CardTitle className="text-2xl font-extrabold text-primary">Contato e Links</CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-4">
        {contactItems.map((item, index) => (
          <div key={index} className="flex items-start">
            {item.icon}
            <div className="ml-3 min-w-0">
              <p className="text-sm font-semibold text-gray-700">{item.label}</p>
              {item.link ? (
                <a 
                  href={item.link} 
                  target={item.isExternal ? "_blank" : "_self"} 
                  rel={item.isExternal ? "noopener noreferrer" : ""} 
                  className="text-base font-bold text-primary hover:text-primary/90 transition-colors break-words flex items-center"
                >
                  {item.value}
                  {item.isExternal && <ExternalLink className="w-4 h-4 ml-1 flex-shrink-0" />}
                </a>
              ) : (
                <p className="text-base font-bold text-primary break-words">{item.value}</p>
              )}
            </div>
          </div>
        ))}

        {linkItems.map((item, index) => (
          <div key={index} className="flex items-start">
            {item.icon}
            <div className="ml-3 min-w-0">
              <p className="text-sm font-semibold text-gray-700">{item.label}</p>
              {item.link ? (
                <a 
                  href={item.link} 
                  target={item.isExternal ? "_blank" : "_self"} 
                  rel={item.isExternal ? "noopener noreferrer" : ""} 
                  className="text-base font-bold text-primary hover:text-primary/90 transition-colors break-words flex items-center"
                >
                  {item.value}
                  {item.isExternal && <ExternalLink className="w-4 h-4 ml-1 flex-shrink-0" />}
                </a>
              ) : (
                <p className="text-base font-bold text-primary break-words">{item.value}</p>
              )}
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default RestaurantInfo;