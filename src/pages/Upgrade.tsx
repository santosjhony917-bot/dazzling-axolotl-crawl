import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Check, Crown, ArrowRight, Zap, DollarSign, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { createPageUrl } from '@/utils/url';
import { useRestaurantContext } from '@/context/RestaurantContext';
import { cn } from '@/lib/utils';
import RestaurantAreaPageLayout from '@/components/restaurant/RestaurantAreaPageLayout';
import { Separator } from '@/components/ui/separator';
import { showError, showSuccess } from '@/utils/toast';

// --- Componente de Conteúdo da Página de Upgrade ---

interface FeatureItemProps {
  children: React.ReactNode;
  isAvailable: boolean;
}

const FeatureItem: React.FC<FeatureItemProps> = ({ children, isAvailable }) => (
  <li className="flex items-start space-x-3">
    {isAvailable ? (
      <Check className="h-5 w-5 text-green-500 mt-1 shrink-0" />
    ) : (
      <X className="h-5 w-5 text-red-400 mt-1 shrink-0" />
    )}
    <span className={cn("text-gray-700", !isAvailable && "line-through text-gray-400")}>{children}</span>
  </li>
);

const UpgradePageContent = () => {
  const navigate = useNavigate();
  const { restaurant, isLoading: isRestaurantLoading } = useRestaurantContext();
  const [selectedPlan, setSelectedPlan] = useState<'basic' | 'premium'>('premium');

  const isPremium = restaurant?.plan === 'premium';

  const handleUpgrade = () => {
    if (isPremium) {
      showSuccess('Você já é Premium! Aproveite todos os recursos.');
      return;
    }
    
    // Simula o processo de pagamento/upgrade
    showSuccess(`Iniciando processo de pagamento para o Plano ${selectedPlan === 'premium' ? 'Premium' : 'Básico'}...`);
    
    // Simula a navegação para a lista de restaurantes Premium (ou busca)
    navigate(createPageUrl('search-restaurants'));
  };

  const plans = [
    {
      id: 'basic',
      name: 'Plano Básico (Grátis)',
      price: 'R$ 0 / mês',
      features: [
        { text: 'Cadastro de 1 restaurante', available: true },
        { text: 'Gerenciamento de cardápio', available: true },
        { text: 'Limite de 5 fotos na galeria', available: true },
        { text: 'Destaque na busca', available: false },
        { text: 'Análise de desempenho', available: false },
        { text: 'Suporte prioritário', available: false },
      ],
      isCurrent: restaurant?.plan === 'free',
    },
    {
      id: 'premium',
      name: 'Plano Premium',
      price: 'R$ 49,90 / mês',
      features: [
        { text: 'Cadastro de 1 restaurante', available: true },
        { text: 'Gerenciamento de cardápio', available: true },
        { text: 'Limite de 20 fotos na galeria', available: true },
        { text: 'Destaque na busca (Prioridade)', available: true },
        { text: 'Análise de desempenho completa', available: true },
        { text: 'Suporte prioritário 24/7', available: true },
      ],
      isCurrent: restaurant?.plan === 'premium',
    },
  ];

  if (isRestaurantLoading) {
    return <div className="p-4 text-center text-gray-500">Carregando planos...</div>;
  }

  return (
    <div className="p-4 space-y-6">
      <h1 className="text-3xl font-bold text-primary">Escolha seu Plano</h1>
      <p className="text-gray-600">
        Faça upgrade para o Plano Premium e desbloqueie recursos que farão seu restaurante se destacar.
      </p>

      {plans.map((plan) => (
        <Card 
          key={plan.id} 
          className={cn(
            "shadow-soft-xl transition-all cursor-pointer",
            plan.id === selectedPlan && !plan.isCurrent ? "border-2 border-highlight ring-4 ring-highlight/20" : "border border-gray-200",
            plan.isCurrent && "border-2 border-green-500 ring-4 ring-green-500/20"
          )}
          onClick={() => setSelectedPlan(plan.id as 'basic' | 'premium')}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className={cn("text-xl font-bold", plan.id === 'premium' ? 'text-highlight' : 'text-primary')}>
              {plan.name}
            </CardTitle>
            {plan.isCurrent && (
              <span className="text-xs font-semibold text-white bg-green-500 px-3 py-1 rounded-full">
                Plano Atual
              </span>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-3xl font-extrabold text-primary">{plan.price}</p>
            
            <Separator />

            <ul className="space-y-2">
              {plan.features.map((feature, index) => (
                <FeatureItem key={index} isAvailable={feature.available}>
                  {feature.text}
                </FeatureItem>
              ))}
            </ul>
          </CardContent>
        </Card>
      ))}

      <div className="pt-4">
        <Button 
          onClick={handleUpgrade}
          disabled={isPremium || selectedPlan === 'basic'}
          className="w-full h-12 bg-highlight hover:bg-highlight/90 shadow-highlight-glow"
        >
          {isPremium ? (
            <>
              <Check className="w-5 h-5 mr-2" />
              Premium Ativo
            </>
          ) : selectedPlan === 'premium' ? (
            <>
              <Crown className="w-5 h-5 mr-2 fill-white" />
              Fazer Upgrade para Premium
            </>
          ) : (
            'Manter Plano Básico'
          )}
        </Button>
      </div>
    </div>
  );
};

// --- Página Principal ---

export default function UpgradePage() {
  return (
    <RestaurantAreaPageLayout title="Upgrade Premium" icon={Crown} backPath="restaurant-area/profile-menu">
        <UpgradePageContent />
    </RestaurantAreaPageLayout>
  );
}