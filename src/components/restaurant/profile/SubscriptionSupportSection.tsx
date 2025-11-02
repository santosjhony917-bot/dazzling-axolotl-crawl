import React from 'react';
import { CreditCard, LifeBuoy } from 'lucide-react';
import NavCardItem from '@/components/NavCardItem';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils/url';

interface SubscriptionSupportSectionProps {
  isPremium: boolean;
}

const SubscriptionSupportSection: React.FC<SubscriptionSupportSectionProps> = ({ isPremium }) => {
  const navigate = useNavigate();

  const handleNavigate = (path: string, requiresPremium: boolean) => {
    if (requiresPremium && !isPremium) {
      // O tipo PageKey agora inclui 'restaurant-area-upgrade'
      navigate(createPageUrl('restaurant-area-upgrade')); 
    } else {
      // Para rotas que não são PageKey, o tipo 'string' é aceitável
      navigate(path);
    }
  };

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold text-primary">Assinatura e Suporte</h2>
      <NavCardItem
        icon={LifeBuoy}
        title="Suporte"
        description="Obtenha ajuda e suporte para seu restaurante."
        onClick={() => handleNavigate(createPageUrl('helpCenter'), false)}
      />
      {/* O item 'Meu Plano' foi removido conforme solicitado. */}
    </section>
  );
};

export default SubscriptionSupportSection;