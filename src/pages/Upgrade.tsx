import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, X, Crown, Zap, ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { createPageUrl } from '@/utils/url';
import RestaurantProfilePreviewFree from '@/components/upgrade/RestaurantProfilePreviewFree';
import RestaurantProfilePreviewPremium from '@/components/upgrade/RestaurantProfilePreviewPremium';
import { useUserRole } from '@/hooks/useUserRole';

type PlanType = 'free' | 'premium';

const Upgrade: React.FC = () => {
  const navigate = useNavigate();
  const { isPremium } = useUserRole();
  
  // Estado para controlar qual prévia está sendo exibida
  const [previewPlan, setPreviewPlan] = useState<PlanType>(isPremium ? 'premium' : 'free');

  const features = [
    { name: "Posicionamento no topo da busca", free: false, premium: true },
    { name: "Destaque visual no perfil", free: false, premium: true },
    { name: "Até 3 itens em Destaques", free: false, premium: true },
    { name: "Link para iFood/Delivery App", free: false, premium: true },
    { name: "Link para Site Próprio", free: false, premium: true },
    { name: "Estatísticas de visualização", free: false, premium: true },
    { name: "Suporte prioritário", free: false, premium: true },
    { name: "Link para WhatsApp", free: true, premium: true },
    { name: "1 item em Destaques", free: true, premium: false },
  ];

  const handleSelectPlan = (plan: PlanType) => {
    setPreviewPlan(plan);
  };

  return (
    <div className="min-h-screen bg-[#f5f7f8] p-4 pb-20 max-w-md mx-auto">
      
      <h1 className="text-2xl font-bold text-primary text-center mb-2">
        {isPremium ? "Seu Plano Atual: Premium" : "Faça Upgrade para Premium"}
      </h1>
      <p className="text-gray-600 text-center mb-6">
        Desbloqueie o potencial máximo do seu restaurante.
      </p>

      {/* Card de Comparação (Como você é visto?) */}
      <Card className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 mb-6">
        <h2 className="text-lg font-bold text-primary dark:text-white text-center mb-2">Como você é visto?</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-4">Escolha como quer ser encontrado.</p>
        
        {/* Botões de Seleção de Prévia */}
        <div className="flex justify-center gap-2 mb-6">
          <Button
            onClick={() => handleSelectPlan('free')}
            variant={previewPlan === 'free' ? 'default' : 'outline'}
            className={cn(
              "flex-1 rounded-full font-semibold",
              previewPlan === 'free' ? "bg-primary hover:bg-primary/90 text-white" : "border-gray-300 text-gray-700 hover:bg-gray-50"
            )}
          >
            <Zap className="w-4 h-4 mr-2" /> Visualização Free
          </Button>
          <Button
            onClick={() => handleSelectPlan('premium')}
            variant={previewPlan === 'premium' ? 'default' : 'outline'}
            className={cn(
              "flex-1 rounded-full font-semibold",
              previewPlan === 'premium' ? "bg-highlight hover:bg-highlight/90 text-white" : "border-highlight text-highlight hover:bg-highlight/10"
            )}
          >
            <Crown className="w-4 h-4 mr-2 fill-white" /> Visualização Premium
          </Button>
        </div>

        {/* Prévia do Perfil */}
        <div className="mt-4">
          {previewPlan === 'free' ? (
            <RestaurantProfilePreviewFree />
          ) : (
            <RestaurantProfilePreviewPremium />
          )}
        </div>
      </Card>

      {/* Tabela de Recursos */}
      <Card className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 mb-6">
        <h2 className="text-lg font-bold text-primary dark:text-white mb-4">Comparação de Recursos</h2>
        
        <div className="space-y-3">
          {features.sort((a, b) => (b.premium ? 1 : -1) - (a.premium ? 1 : -1)).map((feature, index) => (
            <div key={index} className="flex justify-between items-center border-b border-gray-100 dark:border-gray-700 pb-3 last:border-b-0 last:pb-0">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 flex-1">{feature.name}</span>
              
              <div className="flex w-24 justify-around">
                {/* Coluna Free */}
                <div className="w-1/2 text-center">
                  {feature.free ? (
                    <Check className="w-5 h-5 text-green-500 mx-auto" />
                  ) : (
                    <X className="w-5 h-5 text-red-500 mx-auto" />
                  )}
                </div>
                
                {/* Coluna Premium */}
                <div className="w-1/2 text-center">
                  {feature.premium ? (
                    <Check className="w-5 h-5 text-highlight mx-auto" />
                  ) : (
                    <X className="w-5 h-5 text-gray-400 mx-auto" />
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* CTA para Upgrade */}
      {!isPremium && (
        <div className="text-center mt-8">
          <Button 
            onClick={() => navigate(createPageUrl('checkout'))}
            className="bg-highlight hover:bg-highlight/90 text-white font-bold py-3 px-8 rounded-full shadow-lg transition-all duration-300 text-lg"
          >
            Assinar Plano Premium Agora <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      )}
    </div>
  );
};

export default Upgrade;