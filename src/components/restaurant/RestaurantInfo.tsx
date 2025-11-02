import React, { memo } from 'react';
import { CreditCard, QrCode, DollarSign } from 'lucide-react';

interface PaymentMethod {
  icon: React.ElementType;
  label: string;
}

interface RestaurantData {
  address: string;
  mapLink?: string;
}

interface RestaurantInfoProps {
  restaurant: RestaurantData;
}

// Mock Payment Methods (extraído do arquivo original)
const mockPaymentMethods: PaymentMethod[] = [
  { icon: QrCode, label: 'PIX' },
  { icon: CreditCard, label: 'Crédito' },
  { icon: CreditCard, label: 'Débito' },
  { icon: DollarSign, label: 'Dinheiro' },
];

const RestaurantInfo: React.FC<RestaurantInfoProps> = memo(({ restaurant }) => {
  // Usamos o endereço do mock, mas o restante das informações (horário, localização)
  // já estão nos Quick Info Cards na página principal. Aqui focamos em informações adicionais.
  
  return (
    <div className="mt-8">
      <h2 className="text-lg font-bold text-[#022D68]">Informações Adicionais</h2>
      <div className="mt-4 space-y-4">
        
        {/* Payment Methods */}
        <div className="flex items-start gap-3">
          <CreditCard className="w-5 h-5 text-[#E47948] pt-1 shrink-0" />
          <div>
            <p className="text-sm font-bold text-[#022D68]">Formas de Pagamento</p>
            <div className="flex flex-wrap items-center gap-3 mt-2">
              {mockPaymentMethods.map((method, index) => {
                const Icon = method.icon;
                return (
                  <div key={index} className="flex items-center gap-2 rounded-full border border-gray-200 bg-white px-3 py-1 shadow-sm">
                    <Icon className="w-4 h-4 text-[#022D68]" />
                    <span className="text-xs font-medium text-gray-700">{method.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});

export default RestaurantInfo;