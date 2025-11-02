import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard } from 'lucide-react';
import { PublicRestaurantData } from '@/types/restaurant';
import { Badge } from '@/components/ui/badge';

interface RestaurantPaymentSectionProps {
  id: string;
  restaurant: PublicRestaurantData;
}

const RestaurantPaymentSection: React.FC<RestaurantPaymentSectionProps> = ({ id, restaurant }) => {
  const { payment_methods, plan } = restaurant;

  // Só exibe a seção se for premium e houver métodos de pagamento
  if (plan !== 'premium' && plan !== 'premium_gift' || !payment_methods || payment_methods.length === 0) {
    return null;
  }

  return (
    <Card id={id} className="shadow-soft-md border-none rounded-xl p-0">
      <CardHeader className="flex flex-row items-center space-x-3 p-4 border-b border-gray-100">
        <CreditCard className="w-6 h-6 text-primary" />
        <CardTitle className="text-2xl font-extrabold text-primary">Formas de Pagamento</CardTitle>
      </CardHeader>
      <CardContent className="p-4">
        <div className="flex flex-wrap gap-2">
          {payment_methods.map((method, index) => (
            <Badge key={index} variant="secondary" className="px-3 py-1 text-sm font-medium bg-gray-100 text-gray-700 rounded-full">
              {method}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default RestaurantPaymentSection;