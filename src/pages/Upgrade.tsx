import React, { useState } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, X, Crown, ArrowRight } from 'lucide-react';
import PlanPreviewToggle from '@/components/upgrade/PlanPreviewToggle';
import RestaurantProfilePreviewFree from '@/components/upgrade/RestaurantProfilePreviewFree';
import RestaurantProfilePreviewPremium from '@/components/upgrade/RestaurantProfilePreviewPremium';

// Dados mockados para a tabela de comparação
const features = [
  { name: "Galeria de Fotos", free: true, premium: true },
  { name: "Cardápio Digital", free: true, premium: true },
  { name: "Avaliações de Clientes", free: true, premium: true },
  { name: "Múltiplos Contatos (WhatsApp, Telefone)", free: false, premium: true },
  { name: "Destaque no Cardápio (Prato do Dia)", free: false, premium: true },
  { name: "Remoção de Anúncios", free: false, premium: true },
  { name: "Análise de Desempenho", free: false, premium: true },
  { name: "Suporte Prioritário", free: false, premium: true },
];

const UpgradePage: React.FC = () => {
  const [activePlan, setActivePlan] = useState<'free' | 'premium'>('free');

  const handleToggle = (plan: 'free' | 'premium') => {
    setActivePlan(plan);
  };

  return (
    <div className="container mx-auto p-4 max-w-4xl">
      <h1 className="text-3xl font-bold text-primary mb-2 text-center">Impulsione seu Negócio</h1>
      <p className="text-center text-gray-600 mb-8">Compare os planos e escolha o que melhor se adapta ao seu restaurante.</p>

      {/* Toggle de Prévia */}
      <div className="mb-8">
        <PlanPreviewToggle activePlan={activePlan} handleToggle={handleToggle} />
      </div>

      {/* Prévia do Perfil */}
      <div className="flex justify-center mb-10">
        {activePlan === 'free' ? (
          <RestaurantProfilePreviewFree />
        ) : (
          <RestaurantProfilePreviewPremium />
        )}
      </div>

      {/* Tabela de Comparação */}
      <Card className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 mb-6">
        <h2 className="text-xl font-bold text-primary mb-4">Recursos do Plano</h2>
        
        {/* Cabeçalho da Tabela */}
        <div className="grid grid-cols-3 gap-4 border-b pb-2 mb-2 font-bold text-center text-sm text-gray-700 dark:text-gray-300">
          <div>Recurso</div>
          <div>Grátis</div>
          <div className="text-highlight flex items-center justify-center gap-1">
            <Crown className="w-4 h-4 fill-highlight" /> Premium
          </div>
        </div>

        {/* Linhas de Recursos */}
        {features.map((feature) => (
          <div key={feature.name} className="grid grid-cols-3 gap-4 py-3 border-b last:border-b-0 items-center text-sm">
            <div className="text-gray-800 dark:text-gray-200">{feature.name}</div>
            <div className="text-center">
              {feature.free ? <Check className="w-5 h-5 text-green-500 mx-auto" /> : <X className="w-5 h-5 text-red-500 mx-auto" />}
            </div>
            <div className="text-center">
              {feature.premium ? <Check className="w-5 h-5 text-green-500 mx-auto" /> : <X className="w-5 h-5 text-red-500 mx-auto" />}
            </div>
          </div>
        ))}
      </Card>

      {/* Chamada para Ação */}
      <div className="text-center mt-8">
        <h2 className="text-2xl font-bold text-primary mb-4">Pronto para o Premium?</h2>
        <Button className="bg-highlight hover:bg-highlight/90 text-white font-bold py-3 px-8 rounded-lg text-lg shadow-lg transition duration-300">
          Assinar Plano Premium <ArrowRight className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </div>
  );
};

export default UpgradePage;