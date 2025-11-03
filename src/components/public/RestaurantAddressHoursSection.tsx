import React from 'react';
import { MapPin, Clock, CreditCard } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { Restaurant } from '@/types';

interface RestaurantAddressHoursSectionProps {
  restaurant: Restaurant;
  fullAddress: string | null;
  paymentMethods: string[];
  id?: string;
}

const RestaurantAddressHoursSection: React.FC<RestaurantAddressHoursSectionProps> = ({
  restaurant,
  fullAddress,
  paymentMethods,
  id,
}) => {
  const renderOpeningHours = () => {
    if (!restaurant.opening_hours || Object.keys(restaurant.opening_hours).length === 0) {
      return <p className="text-gray-500">Não informado</p>;
    }

    const daysOrder = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
    const dayNames = {
      monday: 'Segunda-feira',
      tuesday: 'Terça-feira',
      wednesday: 'Quarta-feira',
      thursday: 'Quinta-feira',
      friday: 'Sexta-feira',
      saturday: 'Sábado',
      sunday: 'Domingo',
    };

    return (
      <div className="space-y-1">
        {daysOrder.map(dayKey => {
          const hours = restaurant.opening_hours[dayKey];
          if (hours && hours.length > 0) {
            return (
              <p key={dayKey} className="text-gray-700">
                <span className="font-medium">{dayNames[dayKey]}:</span> {hours.map(h => `${h.open} - ${h.close}`).join(', ')}
              </p>
            );
          }
          return null;
        })}
      </div>
    );
  };

  const sections = [];

  if (fullAddress) {
    sections.push({
      icon: <MapPin className="w-5 h-5 text-gray-500 flex-shrink-0" />,
      label: "Localização",
      value: fullAddress,
      link: fullAddress ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(fullAddress)}` : undefined,
      isExternal: true,
    });
  }

  if (restaurant.opening_hours && Object.keys(restaurant.opening_hours).length > 0) {
    sections.push({
      icon: <Clock className="w-5 h-5 text-gray-500 flex-shrink-0" />,
      label: "Horário de Funcionamento",
      value: renderOpeningHours(),
      isHtml: true, // Flag para indicar que o valor é JSX
    });
  }

  if (paymentMethods && paymentMethods.length > 0) {
    sections.push({
      icon: <CreditCard className="w-5 h-5 text-gray-500 flex-shrink-0" />,
      label: "Formas de Pagamento",
      value: paymentMethods.join(', '),
    });
  }

  return (
    <Card id={id} className="p-4 shadow-soft-md rounded-xl bg-white border border-gray-300">
      <h2 className="text-2xl font-bold text-primary mb-3">Informações</h2>
      <div className="space-y-3">
        {sections.map((section, index) => (
          <div key={index} className="flex items-start text-gray-700">
            {section.icon}
            <div className="ml-2">
              <p className="font-semibold">{section.label}</p>
              {section.link ? (
                <a href={section.link} target={section.isExternal ? "_blank" : "_self"} rel="noopener noreferrer" className="text-blue-600 hover:underline">
                  {section.value}
                </a>
              ) : (
                section.isHtml ? section.value : <p>{section.value}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
};

export default RestaurantAddressHoursSection;