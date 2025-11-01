"use client";

import React from 'react';
import { PublicRestaurantData } from '@/types/restaurant';
import { CreditCard } from 'lucide-react';

interface RestaurantPaymentSectionProps {
  restaurant: PublicRestaurantData;
}

const RestaurantPaymentSection: React.FC<RestaurantPaymentSectionProps> = ({ restaurant }) => {
  // Assuming payment_methods is stored as JSONB array of strings in the DB, 
  // and fetched as string[] | null in PublicRestaurantData
  const paymentMethods = (restaurant.payment_methods as string[] | null) || [];

  if (paymentMethods.length === 0) {
    return null;
  }

  return (
    <div className="space-y-3 p-4 border-t border-gray-200">
      <h3 className="text-lg font-semibold text-gray-800 flex items-center">
        <CreditCard className="w-5 h-5 mr-2 text-gray-500" />
        Formas de Pagamento
      </h3>
      <div className="flex flex-wrap gap-2">
        {paymentMethods.map((method, index) => (
          <span
            key={index}
            className="px-3 py-1 text-sm font-medium bg-gray-100 text-gray-700 rounded-full border border-gray-200"
          >
            {method}
          </span>
        ))}
      </div>
    </div>
  );
};

export default RestaurantPaymentSection;