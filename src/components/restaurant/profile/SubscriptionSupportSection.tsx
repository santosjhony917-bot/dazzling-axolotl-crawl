import React from 'react';
import { useNavigate } from 'react-router-dom';
import { HelpCircle, MessageSquare, Crown, LogOut } from 'lucide-react'; // CORRIGIDO: HelpCenter -> HelpCircle
import { createPageUrl } from '@/utils/url';
import NavCardItem from '@/components/NavCardItem';
import { useAuthData } from '@/context/AuthContext';

interface SubscriptionSupportSectionProps {
  navigate: ReturnType<typeof useNavigate>;
  isPremium: boolean;
}

const SubscriptionSupportSection: React.FC<SubscriptionSupportSectionProps> = ({ navigate, isPremium }) => {
  const { signOut } = useAuthData();
  
  const handleNavigate = (path: string) => {
    navigate(path);
  };
  
  const handleSignOut = async () => {
    await signOut();
    // Redireciona para a tela de boas-vindas após o logout
    navigate(createPageUrl('welcome'), { replace: true });
  };
  
  return (
    <div className="w-full space-y-3">
      <h2 className="text-xl font-bold text-[#022D68] px-1 mb-4">Suporte</h2>
      
      <NavCardItem 
        icon={HelpCircle} // CORRIGIDO
        title="Central de Ajuda"
        description="Encontre respostas rápidas e tutoriais."
        onClick={() => handleNavigate(createPageUrl('helpCenter'))}
      />
      
      <NavCardItem 
        icon={MessageSquare}
        title="Falar com Suporte"
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
        title="Gerenciar Assinatura"
        description="Veja detalhes do seu plano e faturas."
        onClick={() => handleNavigate(createPageUrl('restaurant-area/upgrade'))}
        isPremium={isPremium}
      />
      
      {/* NOVO: Botão de Sair */}
      <NavCardItem 
        icon={LogOut}
        title="Sair da Conta"
        description="Desconectar-se do painel do restaurante."
        onClick={handleSignOut} // Usando o novo handler
      />
    </div>
  );
};

export default SubscriptionSupportSection;