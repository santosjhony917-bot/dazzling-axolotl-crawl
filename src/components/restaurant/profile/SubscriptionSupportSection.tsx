import React from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import NavCardItem from '@/components/NavCardItem';
import { Crown, HelpCircle } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils/url';
import { showSuccess } from '@/utils/toast';
import { cn } from '@/lib/utils'; // Importando cn

interface SubscriptionSupportSectionProps {
  navigate: ReturnType<typeof useNavigate>;
  isPremium: boolean;
}

const SubscriptionSupportSection: React.FC<SubscriptionSupportSectionProps> = ({ navigate, isPremium }) => {
  return (
    <Card 
      className={cn(
        "w-full p-6 transition-all",
        "bg-[#f5f7f8] border border-gray-200 rounded-xl shadow-sm hover:shadow-md",
        "dark:bg-gray-800 dark:hover:bg-gray-700",
        "mb-6"
      )}
    >
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