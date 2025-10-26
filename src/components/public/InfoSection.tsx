import React from 'react';
import { RestaurantProfile } from '@/types/supabase';
import { Phone, Mail, Tag, Clock } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

interface InfoSectionProps {
  restaurant: RestaurantProfile;
}

const InfoSection: React.FC<InfoSectionProps> = ({ restaurant }) => {
  const contactItems = [
    { icon: Phone, label: 'Telefone', value: restaurant.phone, href: `tel:${restaurant.phone}` },
    { icon: Mail, label: 'Email', value: restaurant.email, href: `mailto:${restaurant.email}` },
    { icon: Tag, label: 'Categoria', value: restaurant.category },
  ].filter(item => item.value);

  // Placeholder para horário de funcionamento
  const openingHours = restaurant.opening_hours ? 'Ver horários' : 'Horário não cadastrado';

  return (
    <section id="info" className="p-4 -mt-16 relative z-20">
      <Card className="shadow-xl border-none rounded-xl">
        <CardContent className="p-4 space-y-3">
          {contactItems.map((item, index) => (
            <div key={index} className="flex items-center space-x-3">
              <item.icon className="w-5 h-5 text-primary shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-500 dark:text-gray-400">{item.label}</p>
                {item.href ? (
                  <a href={item.href} target="_blank" rel="noopener noreferrer" className="text-base font-semibold text-gray-900 dark:text-white hover:underline truncate block">
                    {item.value}
                  </a>
                ) : (
                  <p className="text-base font-semibold text-gray-900 dark:text-white truncate">{item.value}</p>
                )}
              </div>
            </div>
          ))}
          
          <div className="flex items-center space-x-3 pt-2 border-t border-gray-100 dark:border-gray-700">
            <Clock className="w-5 h-5 text-primary shrink-0" />
            <p className="text-base font-semibold text-gray-900 dark:text-white">{openingHours}</p>
          </div>
        </CardContent>
      </Card>
    </section>
  );
};

export default InfoSection;