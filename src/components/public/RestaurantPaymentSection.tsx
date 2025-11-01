import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard } from 'lucide-react';
import { PublicRestaurantData } from '@/types/restaurant';

interface RestaurantPaymentSectionProps {
  id: string;
  restaurant: PublicRestaurantData; // Recebe o objeto restaurante
}

const DEFAULT_PAYMENT_METHODS = ['PIX', 'Crédito', 'Débito', 'Dinheiro'];

const RestaurantPaymentSection: React.FC<RestaurantPaymentSectionProps> = ({ id, restaurant }) => {
  // Usa os métodos do restaurante ou um fallback se não houver dados
  const paymentMethods = restaurant.payment_methods && restaurant.payment_methods.length > 0 
    ? restaurant.payment_methods 
    : DEFAULT_PAYMENT_METHODS;

  if (paymentMethods.length === 0) {
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
          {paymentMethods.map((method) => (
            <span 
              key={method} 
              className="text-sm font-medium text-gray-700 bg-gray-100 px-3 py-1 rounded-full border border-gray-200"
            >
              {method}
            </span>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default RestaurantPaymentSection;