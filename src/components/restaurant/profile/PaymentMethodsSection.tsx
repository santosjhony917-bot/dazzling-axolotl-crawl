"use client";

import React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { CreditCard } from 'lucide-react';
import { Restaurant } from '@/types/supabase'; // Assuming Restaurant type is available

interface PaymentMethodsSectionProps {
  restaurant: Restaurant;
}

const PaymentMethodsSection: React.FC<PaymentMethodsSectionProps> = ({ restaurant }) => {
  // Placeholder for actual payment methods management
  const handleEditPaymentMethods = () => {
    alert('Funcionalidade de edição de métodos de pagamento em breve!');
  };

  const paymentMethods = restaurant.payment_methods as string[] || []; // Assuming payment_methods is an array of strings

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center"><CreditCard className="mr-2 h-5 w-5" /> Métodos de Pagamento</CardTitle>
        <CardDescription>Gerencie os métodos de pagamento aceitos.</CardDescription>
      </CardHeader>
      <CardContent>
        {paymentMethods.length > 0 ? (
          <ul className="list-disc list-inside space-y-1">
            {paymentMethods.map((method, index) => (
              <li key={index}>{method}</li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500">Nenhum método de pagamento definido.</p>
        )}
        <Button onClick={handleEditPaymentMethods} className="mt-4 w-full bg-[#E47948] hover:bg-[#C2653B]">
          Editar Métodos
        </Button>
      </CardContent>
    </Card>
  );
};

export default PaymentMethodsSection;