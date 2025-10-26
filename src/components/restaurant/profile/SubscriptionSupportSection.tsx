import React from 'react';
import { HelpCircle, MessageSquare, Crown } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils/url';
import NavCardItem from '@/components/NavCardItem';

interface SubscriptionSupportSectionProps {
  navigate: ReturnType<typeof useNavigate>;
  isPremium: boolean;
}

const SubscriptionSupportSection: React.FC<SubscriptionSupportSectionProps> = ({ navigate, isPremium }) => {
  
  const handleNavigate = (path: string) => {
    navigate(path);
  };
  
  return (
    <div className="w-full space-y-3">
      <h2 className="text-xl font-bold text-[#022D68] px-1 mb-4">Suporte</h2>
      
      <NavCardItem 
        icon={HelpCircle}
        title="Central de Ajuda" // Corrigido de 'label' para 'title'
        description="Encontre respostas rápidas e tutoriais."
        onClick={() => handleNavigate(createPageUrl('help-center'))}
      />
      
      <NavCardItem 
        icon={MessageSquare}
        title="Falar com Suporte" // Corrigido de 'label' para 'title'
        description="Entre em contato direto com nossa equipe."
        onClick={() => {
          // Ação para abrir chat ou link de contato (ex: WhatsApp)
          alert("Abrindo chat de suporte...");
        }}
        isPremium={isPremium}
        premiumDescription="Suporte prioritário 24h"
      />
      
      <NavCardItem 
        icon={Crown}
        title="Gerenciar Assinatura" // Corrigido de 'label' para 'title'
        description="Veja detalhes do seu plano e faturas."
        onClick={() => handleNavigate(createPageUrl('restaurant-area/upgrade'))}
        isPremium={isPremium}
      />
    </div>
  );
};

export default SubscriptionSupportSection;