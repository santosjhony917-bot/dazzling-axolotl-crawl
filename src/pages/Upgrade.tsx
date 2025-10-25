import React, { useState, useRef } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Check, X, ArrowRight, Crown, Zap, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import RestaurantProfilePreviewFree from '@/components/upgrade/RestaurantProfilePreviewFree';
import RestaurantProfilePreviewPremium from '@/components/upgrade/RestaurantProfilePreviewPremium';
import PlanPreviewToggle from '@/components/upgrade/PlanPreviewToggle';
import { RestaurantPlan } from '@/types/restaurant';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils/url';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

// Mock data for comparison table
const features = [
  { name: 'Destaque na Busca', free: 'Não aparece', premium: 'Aparece no Topo' },
  { name: 'Visualização Pública', free: 'Básica (Apenas Logo e Endereço)', premium: 'Completa (Capa, Galeria)' },
  { name: 'Cardápio Detalhado', free: 'Simples', premium: 'Premium (Categorias, Destaques)' },
  { name: 'Links de Contato', free: '1 (WhatsApp)', premium: 'Ilimitados (iFood, Site, etc.)' },
  { name: 'Galeria de Fotos', free: <X className="w-5 h-5 text-red-500" />, premium: <Check className="w-5 h-5 text-green-500" /> },
  { name: 'Avaliações e Notas', free: <X className="w-5 h-5 text-red-500" />, premium: <X className="w-5 h-5 text-red-500" /> }, // Removido do Premium
];

const UpgradePage: React.FC = () => {
  const navigate = useNavigate();
  const [previewPlan, setPreviewPlan] = useState<RestaurantPlan>('free');
  const previewRef = useRef<HTMLDivElement>(null);

  const handleSelectPlan = (plan: RestaurantPlan) => {
    setPreviewPlan(plan);
    // Simulating scroll behavior if needed
    if (previewRef.current) {
      previewRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };
  
  const handleSubscribe = () => {
    // Simulação de navegação para checkout/assinatura (App Store/Play Store)
    alert("Iniciando processo de assinatura Premium via App Store/Play Store!");
    // Em um app real, isso iniciaria o fluxo de compra in-app.
  };

  return (
    <div className="p-4 max-w-4xl mx-auto">
      {/* Título Principal */}
      <h1 className="text-3xl font-bold text-primary dark:text-white mb-2">Seu restaurante merece o mesmo destaque dos grandes.</h1>
      
      {/* Subtítulo */}
      <p className="text-gray-600 dark:text-gray-400 mb-4">O Filter Food foi criado para dar visibilidade a quem se destaca. Agora é a sua vez de aparecer entre os mais procurados.</p>
      
      {/* Prova Social / Alerta de Padrão */}
      <Alert className="mb-8 bg-yellow-50 border-yellow-300 text-yellow-800 dark:bg-yellow-900/20 dark:border-yellow-700 dark:text-yellow-400">
        <Info className="h-4 w-4 text-yellow-600 dark:text-yellow-400" />
        <AlertTitle className="font-bold text-yellow-800 dark:text-yellow-400">Padrão de Mercado</AlertTitle>
        <AlertDescription>
          📍 Mais de 70% dos restaurantes da cidade já são Premium. Não fique para trás!
        </AlertDescription>
      </Alert>

      {/* 1. Prévia do Perfil (Visualização Central) */}
      <Card className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 mb-12">
        <h2 className="text-lg font-bold text-primary dark:text-white text-center mb-2">Como você está sendo visto?</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-4">Compare a diferença entre ser básico e ser o destaque da cidade.</p>
        
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

      {/* 2. Seção de Preços (Comparação) */}
      <h2 className="text-2xl font-bold text-primary dark:text-white mb-6 text-center">Escolha seu Plano</h2>
      <div className="grid md:grid-cols-2 gap-6 mb-12">
        {/* Plano Free */}
        <Card className="p-6 border-2 border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-primary mb-2">Plano Free</h2>
          <p className="text-4xl font-extrabold text-primary mb-4">R$ 0<span className="text-lg font-normal text-gray-500">/mês</span></p>
          <p className="text-gray-600 dark:text-gray-400 mb-4">Ideal para começar, mas limita sua visibilidade e recursos de atração de clientes.</p>
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
            Manter Plano Free (Invisível)
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
          <p className="text-gray-600 dark:text-gray-400 mb-4">Maximize sua visibilidade, apareça no topo das buscas e converta visitantes em clientes fiéis.</p>
          <ul className="space-y-2 text-sm text-gray-700 dark:text-gray-300 mb-6">
            <li className="flex items-center"><Check className="w-4 h-4 text-green-500 mr-2" /> Destaque nas buscas</li>
            <li className="flex items-center"><Check className="w-4 h-4 text-green-500 mr-2" /> Galeria de fotos</li>
            <li className="flex items-center"><Check className="w-4 h-4 text-green-500 mr-2" /> Múltiplos links de contato</li>
            <li className="flex items-center"><Check className="w-4 h-4 text-green-500 mr-2" /> Cardápio Premium detalhado</li>
          </ul>
          <Button 
            className="w-full bg-highlight text-white hover:bg-highlight/90"
            onClick={handleSubscribe}
          >
            Assinar Premium <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        </Card>
      </div>


      {/* 3. Tabela de Comparação */}
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