import React from 'react';
import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface OrderChannelsSectionProps {
  whatsappUrl?: string;
  ifoodUrl?: string;
  otherUrl?: string;
  externalUrl?: string;
}

const OrderChannelsSection: React.FC<OrderChannelsSectionProps> = ({
  whatsappUrl,
  ifoodUrl,
  otherUrl,
  externalUrl,
}) => {
  const ifoodLogoUrl = "https://imagensfree.com.br/wp-content/uploads/2021/11/icone-ifood-sorriso-circulo-vermelho-png.png";

  const channels = [
    {
      name: 'WhatsApp',
      url: whatsappUrl,
      icon: '/assets/whatsapp-logo.svg',
      isWhatsapp: true,
    },
    {
      name: 'iFood',
      url: ifoodUrl,
      icon: '/assets/ifood-logo.svg',
      isIfood: true,
    },
    {
      name: 'Outro Link',
      url: otherUrl,
      icon: '/assets/link-icon.svg',
      isOther: true,
    },
    {
      name: 'Site Oficial',
      url: externalUrl,
      icon: '/assets/website-icon.svg',
      isExternal: true,
    },
  ].filter(channel => channel.url);

  if (channels.length === 0) {
    return null;
  }

  return (
    <div className="p-4 border-t">
      <h3 className="text-lg font-semibold mb-3">Canais de Pedido</h3>
      <div className="space-y-3">
        {channels.map((channel) => {
          const isIfood = channel.name === 'iFood';
          const isWhatsapp = channel.name === 'WhatsApp';
          const isOther = channel.name === 'Outro Link';
          const isExternal = channel.name === 'Site Oficial';

          return (
            <Button
              key={channel.name}
              asChild
              variant="outline"
              className="w-full justify-start h-12 text-base"
            >
              <a href={channel.url} target="_blank" rel="noopener noreferrer">
                <div className="flex items-center space-x-3">
                  {isWhatsapp ? (
                    <img
                      src="/assets/whatsapp-logo.svg"
                      alt="WhatsApp Logo"
                      className="w-7 h-7 object-contain"
                    />
                  ) : isIfood ? (
                    <img
                      src={ifoodLogoUrl}
                      alt="iFood Logo"
                      className="w-7 h-7 object-contain"
                    />
                  ) : isOther || isExternal ? (
                    <ExternalLink className="w-5 h-5 text-gray-600" />
                  ) : null}
                  <span className="font-medium">{channel.name}</span>
                </div>
              </a>
            </Button>
          );
        })}
      </div>
    </div>
  );
};

export default OrderChannelsSection;