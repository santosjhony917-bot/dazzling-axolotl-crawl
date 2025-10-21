import React, { useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, X, ArrowRight, Crown, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import RestaurantProfilePreviewFree from '@/components/upgrade/RestaurantProfilePreviewFree';
import RestaurantProfilePreviewPremium from '@/components/upgrade/RestaurantProfilePreviewPremium';
import PlanPreviewToggle from '@/components/upgrade/PlanPreviewToggle';
import { RestaurantPlan } from '@/types/restaurant';

// Mock data for comparison table
const features = [
  { name: 'Visualização Pública', free: 'Básica', premium: 'Completa (Capa, Galeria, Avaliações)' },
  { name: 'Destaque na Busca', free: <X className="w-5 h-5 text-red-500" />, premium: <Check className="w-5 h-5 text-green-500" /> },
  { name: 'Cardápio Detalhado', free: 'Simples', premium: 'Premium (Categorias, Destaques)' },
  { name: 'Links de Contato', free: '1 (WhatsApp)', premium: 'Ilimitados (iFood, Site, etc.)' },
  { name: 'Galeria de Fotos', free: <X className="w-5 h-5 text-red-500" />, premium: <Check className="w-5 h-5 text-green-500" /> },
  { name: 'Avaliações e Notas', free: <X className="w-5 h-5 text-red-500" />, premium: <Check className="w-5 h-5 text-green-500" /> },
];

const UpgradePage: React.FC = () => {
  const [previewPlan, setPreviewPlan] = useState<RestaurantPlan>('free');
  const previewRef = useRef<HTMLDivElement>(null);

  const handleSelectPlan = (plan: RestaurantPlan) => {
    setPreviewPlan(plan);
    // Simulating scroll behavior if needed, though not strictly necessary for the preview component itself
    if (previewRef.current) {
      previewRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      <h1 className="text-3xl font-bold text-primary dark:text-white mb-2">Impulsione seu Restaurante</h1>
      <p className="text-gray-600 dark:text-gray-400 mb-8">Escolha o plano que melhor se adapta ao seu negócio e comece a atrair mais clientes.</p>

      {/* Seção de Preços */}
      <div className="grid md:grid-cols-2 gap-6 mb-12">
        {/* Plano Free */}
        <Card className="p-6 border-2 border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-primary mb-2">Plano Free</h2>
          <p className="text-4xl font-extrabold text-primary mb-4">R$ 0<span className="text-lg font-normal text-gray-500">/mês</span></p>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Ideal para começar e ter uma presença digital básica.</p>
          <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300 mb-6">
            <li className="flex items-center"><Check className="w-4 h-4 text-green-500 mr-2" /> Perfil básico</li>
            <li className="flex items-center"><Check className="w-4 h-4 text-green-500 mr-2" /> 1 Link de contato</li>
            <li className="flex items-center"><Check className="w-4 h-4 text-green-500 mr-2" /> Cardápio simples</li>
          </ul>
          <Button 
            variant="outline" 
            className="w-full border-primary text-primary hover:bg-primary/10"
            onClick={() => handleSelectPlan('free')}
          >
            Manter Plano Free
          </Button>
        </Card>

        {/* Plano Premium */}
        <Card className="p-6 border-2 border-highlight shadow-xl relative bg-white dark:bg-gray-800">
          <div className="absolute top-0 right-0 bg-highlight text-white text-xs font-bold px-3 py-1 rounded-bl-lg flex items-center">
            MAIS POPULAR
          </div>
          <h2 className="text-2xl font-bold text-highlight mb-2 flex items-center">
            <Crown className="w-6 h-6 mr-2 fill-highlight" /> Plano Premium
          </h2>
          <p className="text-4xl font-extrabold text-highlight mb-4">R$ 49,90<span className="text-lg font-normal text-gray-500">/mês</span></p>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Maximize sua visibilidade e atraia clientes com recursos exclusivos.</p>
          <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300 mb-6">
            <li className="flex items-center"><Check className="w-4 h-4 text-green-500 mr-2" /> Destaque nas buscas</li>
            <li className="flex items-center"><Check className="w-4 h-4 text-green-500 mr-2" /> Galeria de fotos e avaliações</li>
            <li className="flex items-center"><Check className="w-4 h-4 text-green-500 mr-2" /> Múltiplos links de contato</li>
            <li className="flex items-center"><Check className="w-4 h-4 text-green-500 mr-2" /> Cardápio Premium detalhado</li>
          </ul>
          <Button 
            className="w-full bg-highlight text-white hover:bg-highlight/90"
            onClick={() => handleSelectPlan('premium')}
          >
            Assinar Premium <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Card>
      </div>
      
      {/* Prévia do Perfil (MOVIDA PARA CÁ) */}
      <Card className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 mb-12">
        <h2 className="text-lg font-bold text-primary dark:text-white text-center mb-2">Como você é visto?</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-4">Escolha como quer ser encontrado.</p>
        
        {/* Toggle Switch para Visualização */}
        <PlanPreviewToggle previewPlan={previewPlan} setPreviewPlan={handleSelectPlan} />

        <div ref={previewRef} className="mt-4">
          <h3 className="text-lg font-bold text-primary dark:text-white mb-2 text-center">Prévia do Perfil ({previewPlan === 'free' ? 'Free' : 'Premium'})</h3>
          {previewPlan === 'free' ? (
            <RestaurantProfilePreviewFree />
          ) : (
            <RestaurantProfilePreviewPremium />
          )}
        </div>
      </Card>


      {/* Tabela de Comparação */}
      <Card className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 mb-6">
        <h2 className="text-lg font-bold text-primary dark:text-white text-center mb-4">Comparação de Recursos</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead>
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Recurso</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Free</th>
                <th className="px-4 py-3 text-center text-xs font-medium text-highlight uppercase tracking-wider">Premium</th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {features.map((feature) => (
                <tr key={feature.name}>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{feature.name}</td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-center text-gray-500 dark:text-gray-400">
                    {typeof feature.free === 'string' ? feature.free : feature.free}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-center text-highlight font-semibold">
                    {typeof feature.premium === 'string' ? feature.premium : feature.premium}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};

export default UpgradePage;