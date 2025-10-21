import React from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import NavCardItem from '@/components/NavCardItem';
import { Crown, HelpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils/url';
import { showSuccess } from '@/utils/toast';

interface SubscriptionSupportSectionProps {
  navigate: ReturnType<typeof useNavigate>;
  isPremium: boolean;
}

const SubscriptionSupportSection: React.FC<SubscriptionSupportSectionProps> = ({ navigate, isPremium }) => {
  return (
    <Card className="w-full shadow-xl border-none rounded-xl p-6 bg-white dark:bg-gray-800 mb-6">
      <CardHeader className="p-0 mb-4">
        <CardTitle className="text-lg font-bold text-[#022D68]">Assinatura e Suporte</CardTitle>
      </CardHeader>
      <div className="space-y-3">
        <NavCardItem 
          label="Plano Premium" 
          description={isPremium ? "Ativo. Gerencie sua assinatura." : "Seja visto por mais clientes!"}
          icon={Crown} 
          onClick={() => navigate(createPageUrl('restaurant-area/upgrade'))}
        />
        <NavCardItem 
          label="Central de Ajuda" 
          description="Tutoriais e FAQ"
          icon={HelpCircle} 
          onClick={() => showSuccess("Funcionalidade em desenvolvimento")}
        />
      </div>
    </Card>
  );
};

export default SubscriptionSupportSection;