import React from 'react';
import { HelpCircle, MessageSquare, LogOut } from 'lucide-react';
import NavCardItem from '@/components/NavCardItem';
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils/createPageUrl';

interface SubscriptionSupportSectionProps {
  restaurantId: string;
}

const SubscriptionSupportSection: React.FC<SubscriptionSupportSectionProps> = ({ restaurantId }) => {
  const { signOut } = useAuth();
  const navigate = useNavigate();

  const handleSignOut = async () => {
    await signOut();
    navigate(createPageUrl('login'));
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Assinatura e Suporte</h2>

      <NavCardItem
        icon={<HelpCircle className="w-6 h-6 text-primary" />}
        title="Central de Ajuda"
        description="Encontre respostas para suas perguntas frequentes."
        href={createPageUrl('help-center')}
      />

      <NavCardItem
        icon={<MessageSquare className="w-6 h-6 text-primary" />}
        title="Falar com Suporte"
        description="Entre em contato com nossa equipe de suporte."
        href={createPageUrl('contact-support')}
      />

      <NavCardItem
        icon={<LogOut className="w-6 h-6 text-primary" />}
        title="Sair da Conta"
        description="Desconectar-se da sua conta."
        href="#"
        onClick={handleSignOut}
      />
    </div>
  );
};

export default SubscriptionSupportSection;