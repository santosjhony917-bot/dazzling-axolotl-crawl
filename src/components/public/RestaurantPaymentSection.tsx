"use client";

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, DollarSign } from 'lucide-react';
import { PublicRestaurantData } from '@/types/restaurant'; // Assuming PublicRestaurantData type is available

interface RestaurantPaymentSectionProps {
  restaurant: PublicRestaurantData;
}

const DEFAULT_PAYMENT_METHODS = ['Dinheiro', 'Cartão de Crédito', 'Cartão de Débito'];

const RestaurantPaymentSection: React.FC<RestaurantPaymentSectionProps> = ({ restaurant }) => {
  // Usa os métodos do restaurante ou um fallback se não houver dados
  const paymentMethods = (restaurant.payment_methods as string[] || []).length > 0
    ? (restaurant.payment_methods as string[])
    : DEFAULT_PAYMENT_METHODS;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center"><CreditCard className="mr-2 h-5 w-5" /> Métodos de Pagamento</CardTitle>
      </CardHeader>
      <CardContent>
        <ul className="list-disc list-inside space-y-1">
          {paymentMethods.map((method, index) => (
            <li key={index} className="flex items-center">
              <DollarSign className="h-4 w-4 mr-2 text-green-600" /> {method}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
};

export default RestaurantPaymentSection;