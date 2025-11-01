import React from 'react';
import { MapPin, Clock, CreditCard, Phone, Mail, Globe, Instagram, Facebook, Twitter, Link } from 'lucide-react';
import { WeekSchedule, SocialNetworkLink } from '@/types/restaurant';

interface RestaurantInfoProps {
  category?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  phone?: string | null;
  email?: string | null;
  openingHours?: WeekSchedule | null;
  paymentMethods?: string[] | null;
  socialNetworks?: SocialNetworkLink[] | null;
}

const getSocialIcon = (type: string) => {
  switch (type) {
    case 'instagram':
      return <Instagram className="w-5 h-5 text-pink-600" />;
    case 'facebook':
      return <Facebook className="w-5 h-5 text-blue-600" />;
    case 'twitter':
      return <Twitter className="w-5 h-5 text-blue-400" />;
    default:
      return <Link className="w-5 h-5 text-gray-600" />;
  }
};

const RestaurantInfo: React.FC<RestaurantInfoProps> = ({
  category,
  address,
  city,
  state,
  phone,
  email,
  openingHours,
  paymentMethods,
  socialNetworks,
}) => {
  const location = [address, city, state].filter(Boolean).join(', ');

  return (
    <div className="space-y-4 text-gray-700">
      {category && (
        <p className="text-sm font-medium text-primary">{category}</p>
      )}

      {location && (
        <div className="flex items-center space-x-2">
          <MapPin className="w-5 h-5 text-gray-500 flex-shrink-0" />
          <p className="text-base">{location}</p>
        </div>
      )}

      {phone && (
        <div className="flex items-center space-x-2">
          <Phone className="w-5 h-5 text-gray-500 flex-shrink-0" />
          <a href={`tel:${phone}`} className="text-base hover:underline">{phone}</a>
        </div>
      )}

      {email && (
        <div className="flex items-center space-x-2">
          <Mail className="w-5 h-5 text-gray-500 flex-shrink-0" />
          <a href={`mailto:${email}`} className="text-base hover:underline">{email}</a>
        </div>
      )}

      {/* Horários de Funcionamento (Simplificado) */}
      {openingHours && Object.values(openingHours).some(slots => slots && slots.length > 0) && (
        <div className="flex items-start space-x-2">
          <Clock className="w-5 h-5 text-gray-500 flex-shrink-0 mt-1" />
          <div>
            <p className="font-semibold">Horário de Funcionamento</p>
            {/* Exibição simplificada: apenas o primeiro horário de hoje */}
            <p className="text-sm text-gray-600">
              Verifique os horários completos na seção de informações.
            </p>
          </div>
        </div>
      )}

      {/* Métodos de Pagamento */}
      {paymentMethods && paymentMethods.length > 0 && (
        <div className="flex items-start space-x-2">
          <CreditCard className="w-5 h-5 text-gray-500 flex-shrink-0 mt-1" />
          <div>
            <p className="font-semibold">Pagamentos</p>
            <p className="text-sm text-gray-600">{paymentMethods.join(', ')}</p>
          </div>
        </div>
      )}

      {/* Redes Sociais */}
      {socialNetworks && socialNetworks.length > 0 && (
        <div className="flex items-center space-x-4 pt-2">
          {socialNetworks.map((social, index) => (
            <a
              key={index}
              href={social.url}
              target="_blank"
              rel="noopener noreferrer"
              className="transition-opacity hover:opacity-75"
              aria-label={social.type}
            >
              {getSocialIcon(social.type)}
            </a>
          ))}
        </div>
      )}
    </div>
  );
};

export default RestaurantInfo;