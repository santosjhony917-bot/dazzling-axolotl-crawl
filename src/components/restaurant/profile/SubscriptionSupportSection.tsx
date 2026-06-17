import React from 'react';
import { useNavigate } from 'react-router-dom';
import { HelpCircle, MessageSquare, Trash2 } from 'lucide-react';
import { createPageUrl } from '@/utils/url';
import NavCardItem from '@/components/NavCardItem';

interface SubscriptionSupportSectionProps {
  navigate: ReturnType<typeof useNavigate>;
  isPremium: boolean;
  onDeleteAccount: () => void;
}

const SubscriptionSupportSection: React.FC<SubscriptionSupportSectionProps> = ({ navigate, isPremium, onDeleteAccount }) => {
  
  const handleNavigate = (path: string) => {
    navigate(path);
  };
  
  return (
    <div className="w-full space-y-3">
      <NavCardItem 
        icon={HelpCircle}
        title="Central de Ajuda"
        description="Encontre respostas rápidas e tutoriais."
        onClick={() => handleNavigate(createPageUrl('helpCenter'))}
      />
      
      <NavCardItem 
        icon={MessageSquare}
        title="Falar com Suporte"
        description="Entre em contato direto com nossa equipe."
        onClick={() => {
          alert("Abrindo chat de suporte...");
        }}
        isPremium={isPremium}
        premiumDescription="Suporte prioritário 24h"
      />
      
      <NavCardItem 
        icon={Trash2}
        title="Excluir Conta"
        description="Excluir sua conta e dados permanentemente."
        onClick={onDeleteAccount}
      />
    </div>
  );
};

export default SubscriptionSupportSection;