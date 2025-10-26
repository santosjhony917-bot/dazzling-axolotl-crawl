import React, { memo } from 'react';
import { CreditCard, QrCode, DollarSign } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Restaurant } from '@/types/supabase';

interface PaymentMethod {
  icon: React.ElementType;
  label: string;
}

interface AdditionalInfoProps {
  restaurant: Restaurant;
}

// Mock Payment Methods (extraído do arquivo original)
const mockPaymentMethods: PaymentMethod[] = [
  { icon: QrCode, label: 'PIX' },
  { icon: CreditCard, label: 'Crédito' },
  { icon: CreditCard, label: 'Débito' },
  { icon: DollarSign, label: 'Dinheiro' },
];

const AdditionalInfo: React.FC<AdditionalInfoProps> = memo(({ restaurant }) => {
  // Note: We are using mock payment methods as the DB schema doesn't explicitly list them yet.
  
  return (
    <div className="mt-8">
      <h2 className="text-lg font-bold text-[#022D68]">Informações Adicionais</h2>
      <Card className="mt-4 p-4 shadow-soft-md border-none rounded-xl bg-white dark:bg-gray-800">
        
        {/* Payment Methods */}
        <div className="flex items-start gap-3">
          <CreditCard className="w-5 h-5 text-[#E47948] pt-1 shrink-0" />
          <div>
            <p className="text-sm font-bold text-[#022D68]">Formas de Pagamento</p>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              {mockPaymentMethods.map((method, index) => {
                const Icon = method.icon;
                return (
                  <div key={index} className="flex items-center gap-2 rounded-full border border-gray-200 bg-gray-50 dark:bg-gray-700 px-3 py-1 shadow-soft-sm">
                    <Icon className="w-4 h-4 text-[#022D68] dark:text-white" />
                    <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{method.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
});

export default AdditionalInfo;