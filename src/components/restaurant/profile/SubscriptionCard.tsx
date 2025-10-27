import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Crown, Zap, Gem, Trophy, BarChart3, Bell, Pencil } from 'lucide-react';
import { useNavigate } from '@/utils/url';
import { createPageUrl } from '@/utils/url';
import { cn } from '@/lib/utils';

interface SubscriptionCardProps {
  isPremium: boolean;
}

const premiumFeatures = [
  { text: "Destaque na busca", icon: Gem },
  { text: "Aparência personalizada", icon: Trophy },
  { text: "Estatísticas detalhadas", icon: BarChart3 },
  { text: "Edição avançada de cardápio", icon: Pencil },
  { text: "Notificações para seguidores", icon: Bell },
];

const SubscriptionCard: React.FC<SubscriptionCardProps> = ({ isPremium }) => {
  const navigate = useNavigate();

  const handleUpgradeClick = () => {
    navigate(createPageUrl('restaurant-area/upgrade'));
  };

  const currentPlan = isPremium ? 'Premium' : 'Free';
  const planColor = isPremium ? 'text-amber-600' : 'text-gray-600';
  const iconBg = isPremium ? 'bg-amber-100' : 'bg-gray-100';

  return (
    <div className="w-full space-y-3">
      <h2 className="text-xl font-bold text-[#022D68] px-1 mb-4">Plano e Assinatura</h2>
      
      <Card className="shadow-xl border-none rounded-2xl p-6 bg-white dark:bg-gray-800">
        <CardContent className="p-0">
          {/* Status do Plano Atual */}
          <div className="flex items-center gap-4 pb-4 border-b border-gray-100 dark:border-gray-700">
            <div className={cn("w-12 h-12 rounded-full flex items-center justify-center", iconBg)}>
              <Crown className={cn("w-6 h-6 fill-amber-500", planColor)} />
            </div>
            <div>
              <p className="text-xl font-bold text-[#022D68]">Plano atual: {currentPlan}</p>
              <p className="text-sm text-gray-600">{isPremium ? 'Todos os recursos desbloqueados' : 'Recursos básicos'}</p>
            </div>
          </div>

          {/* Seção de Upgrade (Apenas se for Free) */}
          {!isPremium && (
            <div className="mt-4 space-y-4">
              <div className="bg-yellow-50/50 dark:bg-yellow-900/20 p-4 rounded-xl border border-yellow-200">
                <h3 className="text-base font-bold text-amber-700 dark:text-amber-400 flex items-center mb-3">
                  <Zap className="w-5 h-5 mr-2 fill-amber-500 text-amber-500" />
                  Desbloqueie com Premium:
                </h3>
                <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                  {premiumFeatures.map((feature, index) => {
                    const Icon = feature.icon;
                    return (
                      <li key={index} className="flex items-center gap-2">
                        <Icon className="w-4 h-4 text-amber-500 fill-amber-100 dark:fill-amber-900" />
                        {feature.text}
                      </li>
                    );
                  })}
                </ul>
              </div>

              <Button
                onClick={handleUpgradeClick}
                className="w-full h-12 rounded-xl text-lg font-bold text-white bg-highlight hover:bg-highlight/90 shadow-highlight-glow transition-all hover:shadow-soft-xl"
              >
                <Crown className="w-5 h-5 mr-2 fill-white" />
                Ativar Premium
              </Button>
            </div>
          )}
          
          {isPremium && (
            <div className="mt-4">
                <Button
                    onClick={handleUpgradeClick}
                    variant="outline"
                    className="w-full h-12 rounded-xl border-2 border-primary text-primary font-bold hover:bg-primary/5"
                >
                    Gerenciar Assinatura
                </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SubscriptionCard;