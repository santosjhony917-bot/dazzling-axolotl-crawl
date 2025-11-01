import React from 'react';
import { Card } from '@/components/ui/card';
import { MapPin, Phone, Mail, Clock, Link, ExternalLink } from 'lucide-react';
import OpeningHoursDisplay from './OpeningHoursDisplay'; // Corrigido para importação padrão

interface AdditionalInfoProps {
  restaurant: {
    address: string | null;
    number: string | null;
    neighborhood: string | null;
    city: string | null;
    state: string | null;
    cep: string | null;
    phone: string | null;
    email: string | null;
    whatsappUrl: string | null;
    ifoodUrl: string | null;
    otherUrl: string | null;
    openingHours: any; // Assuming this is the JSONB structure
  };
}

const AdditionalInfo: React.FC<AdditionalInfoProps> = ({ restaurant }) => {
  const {
    address,
    number,
    neighborhood,
    city,
    state,
    cep,
    phone,
    email,
    whatsappUrl,
    ifoodUrl,
    otherUrl,
    openingHours,
  } = restaurant;

  const fullAddress = [address, number, neighborhood, city, state, cep]
    .filter(Boolean)
    .join(', ');

  const infoItems = [
    {
      icon: MapPin,
      label: 'Endereço',
      value: fullAddress,
      link: `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}`,
      isExternal: true,
    },
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

  const socialLinks = [
    { label: 'WhatsApp', url: whatsappUrl },
    { label: 'iFood', url: ifoodUrl },
    { label: 'Outro Link', url: otherUrl },
  ].filter(link => link.url);

  return (
    <div id="info" className="mt-8">
      <h2 className="text-lg font-bold text-[#022D68] dark:text-white px-4">Informações Adicionais</h2>
      <Card className="mt-4 p-4 shadow-soft-md border-none rounded-xl bg-white dark:bg-gray-800 mx-4">
        
        {/* Informações de Contato e Endereço */}
        <div className="space-y-4">
          {infoItems.map((item, index) => (
            <div key={index} className="flex items-start">
              <item.icon className="w-5 h-5 text-highlight mt-1 flex-shrink-0" />
              <div className="ml-3 min-w-0">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300">{item.label}</p>
                {item.link ? (
                  <a 
                    href={item.link} 
                    target="_blank" 
                    rel="noopener noreferrer" 
                    className="text-base text-gray-900 dark:text-white hover:text-highlight transition-colors break-words flex items-center"
                  >
                    {item.value}
                    {item.isExternal && <ExternalLink className="w-4 h-4 ml-1 flex-shrink-0" />}
                  </a>
                ) : (
                  <p className="text-base text-gray-900 dark:text-white break-words">{item.value}</p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Horário de Funcionamento */}
        {openingHours && Object.keys(openingHours).length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <div className="flex items-start">
              <Clock className="w-5 h-5 text-highlight mt-1 flex-shrink-0" />
              <div className="ml-3 min-w-0">
                <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Horário de Funcionamento</p>
                <OpeningHoursDisplay openingHours={openingHours} />
              </div>
            </div>
          </div>
        )}

        {/* Links Sociais/Externos */}
        {socialLinks.length > 0 && (
          <div className="mt-6 pt-4 border-t border-gray-200 dark:border-gray-700">
            <p className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">Links Úteis</p>
            <div className="flex flex-wrap gap-3">
              {socialLinks.map((link, index) => (
                <a
                  key={index}
                  href={link.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm font-medium text-highlight hover:underline flex items-center"
                >
                  {link.label}
                  <ExternalLink className="w-3 h-3 ml-1" />
                </a>
              ))}
            </div>
          </div>
        )}
      </Card>
    </div>
  );
};

export default AdditionalInfo;