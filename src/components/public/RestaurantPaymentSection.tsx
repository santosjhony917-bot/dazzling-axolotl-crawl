import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CreditCard, QrCode, DollarSign } from 'lucide-react';
import { PublicRestaurantData } from '@/types/restaurant'; // Importar PublicRestaurantData
import { Json } from '@/types/supabase'; // Importar Json

interface RestaurantPaymentSectionProps {
  restaurant: PublicRestaurantData;
}

const DEFAULT_PAYMENT_METHODS = [
  { name: 'Cartão de Crédito', icon: CreditCard },
  { name: 'Cartão de Débito', icon: CreditCard },
  { name: 'Pix', icon: QrCode },
  { name: 'Dinheiro', icon: DollarSign },
];

const RestaurantPaymentSection: React.FC<RestaurantPaymentSectionProps> = ({ restaurant }) => {
  // Usa os métodos do restaurante ou um fallback se não houver dados
  const paymentMethods = (restaurant.payment_methods as string[] | null) || DEFAULT_PAYMENT_METHODS.map(m => m.name);

  if (!paymentMethods || paymentMethods.length === 0) {
    return null;
  }

  const getIconForPaymentMethod = (methodName: string) => {
    switch (methodName.toLowerCase()) {
      case 'cartão de crédito':
      case 'cartão de débito':
        return <CreditCard className="w-5 h-5 text-highlight" />;
      case 'pix':
        return <QrCode className="w-5 h-5 text-highlight" />;
      case 'dinheiro':
        return <DollarSign className="w-5 h-5 text-highlight" />;
      default:
        return <CreditCard className="w-5 h-5 text-highlight" />; // Ícone padrão
    }
  };

  return (
    <Card className="w-full shadow-soft-md rounded-xl">
      <CardHeader className="p-4 pb-0">
        <CardTitle className="text-2xl font-extrabold text-[#022D68] tracking-tight">Formas de Pagamento</CardTitle>
      </CardHeader>
      <CardContent className="p-4 space-y-3">
        {paymentMethods.map((method, index) => (
          <div key={index} className="flex items-center gap-3 text-gray-700">
            {getIconForPaymentMethod(method)}
            <p className="text-base">{method}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
};

export default RestaurantPaymentSection;