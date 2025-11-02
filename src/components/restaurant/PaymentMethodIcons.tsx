"use client";

import React from 'react';
import { CreditCard, Banknote, QrCode, DollarSign } from 'lucide-react';

interface PaymentMethodIconsProps {
  paymentMethods: string[];
}

const paymentIconMap: { [key: string]: React.ElementType } = {
  credit_card: CreditCard,
  debit_card: CreditCard,
  cash: Banknote,
  pix: QrCode,
  meal_voucher: DollarSign, // Assuming a generic icon for meal voucher
  // Add more as needed
};

export const PaymentMethodIcons: React.FC<PaymentMethodIconsProps> = ({ paymentMethods }) => {
  if (!paymentMethods || paymentMethods.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-wrap gap-3">
      {paymentMethods.map((method, index) => {
        const Icon = paymentIconMap[method.toLowerCase()];
        if (Icon) {
          return (
            <div key={index} className="flex items-center space-x-1 text-gray-600">
              <Icon className="w-5 h-5" />
              <span className="capitalize">{method.replace(/_/g, ' ')}</span>
            </div>
          );
        }
        return null;
      })}
    </div>
  );
};