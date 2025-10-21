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
    <div className="w-full space-y-3">
      <h2 className="text-lg font-bold text-[#022D68] px-1">Suporte</h2>
      
      <NavCardItem 
        label="Central de Ajuda" 
        description="Tutoriais e FAQ"
        icon={HelpCircle} 
        onClick={() => showSuccess("Funcionalidade em desenvolvimento")}
      />
    </div>
  );
};

export default SubscriptionSupportSection;