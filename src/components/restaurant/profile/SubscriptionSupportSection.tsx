import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Crown, HelpCircle, MessageSquare, LogOut } from 'lucide-react';
import NavCardItem from '@/components/NavCardItem';
import { useNavigate } from 'react-router-dom';
import { useAuthData } from '@/context/AuthContext';
import { showError } from '@/utils/toast';

interface SubscriptionSupportSectionProps {
  navigate: ReturnType<typeof useNavigate>;
  isPremium: boolean;
}

const SubscriptionSupportSection: React.FC<SubscriptionSupportSectionProps> = ({ navigate, isPremium }) => {
  const { signOut } = useAuthData();

  const handleSubscriptionClick = () => {
    if (!isPremium) {
      showError("Faça upgrade para o plano Premium para gerenciar sua assinatura.");
      return;
    }
    // Lógica de navegação para gerenciar assinatura
    navigate('/restaurant-area/subscription');
  };

  return (
    <Card className="shadow-soft-lg border-none rounded-xl bg-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl text-[#022D68]">
          <Crown className="w-6 h-6" /> Assinatura e Suporte
        </CardTitle>
        <CardDescription>Gerencie seu plano e encontre ajuda.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        
        <NavCardItem 
          icon={HelpCircle} 
          title="Central de Ajuda"
          description="Encontre respostas para perguntas frequentes."
          onClick={() => navigate('/help')}
        />
        
        <NavCardItem 
          icon={MessageSquare}
          title="Falar com Suporte"
          description="Entre em contato direto com nossa equipe."
          onClick={() => navigate('/support')}
        />
        
        <NavCardItem 
          icon={Crown}
          title="Gerenciar Assinatura"
          description={isPremium ? "Seu plano atual é Premium." : "Faça upgrade para desbloquear recursos exclusivos."}
          onClick={handleSubscriptionClick}
          isLocked={!isPremium}
        />
        
        <NavCardItem 
          icon={LogOut}
          title="Sair da Conta"
          description="Desconectar-se do painel de controle."
          onClick={signOut}
        />
        
      </CardContent>
    </Card>
  );
};

export default SubscriptionSupportSection;