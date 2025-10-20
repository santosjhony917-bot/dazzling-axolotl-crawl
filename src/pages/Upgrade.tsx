import React from 'react';
import { Crown, CheckCircle, ArrowRight, ArrowLeft, Users, Utensils, Trophy } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLocation, useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { createPageUrl } from '@/utils/url';

const Upgrade: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Verifica se estamos na rota aninhada do restaurante
  const isRestaurantArea = location.pathname.startsWith('/restaurant-area');
  
  const features = [
    "Posição #1 Garantida",
    "Branding Profissional",
    "Estatísticas de Lucro",
    "Cardápio Vendedor",
    "Controle de Engajamento",
    "Badge Premium",
    "Suporte Expresso",
    "Otimização de Pedidos",
  ];

  const handleGoBack = () => {
    // Se estiver na área do restaurante, volta para o perfil do restaurante
    if (isRestaurantArea) {
      navigate(createPageUrl('restaurant-area/profile-menu'));
    } else {
      // Fallback seguro, embora esta rota não deva ser acessível para clientes
      navigate(-1);
    }
  };
  
  const MOCK_COVER_URL = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=2070&auto=format&fit=crop';
  const MOCK_LOGO_URL = 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?q=80&w=2070&auto=format&fit=crop'; // Usando a mesma para mock de logo

  return (
    <div className={cn(
      "relative flex h-auto min-h-screen w-full flex-col overflow-x-hidden bg-background-light dark:bg-gray-900",
      isRestaurantArea ? "pb-20 max-w-md mx-auto" : "min-h-screen bg-[#f5f7f8] pb-20 max-w-md mx-auto"
    )}>
      
      {/* Header */}
      <div className="bg-primary dark:bg-primary text-white pt-6 pb-8">
        <div className="relative px-4 text-center">
          <button 
            onClick={handleGoBack}
            className="absolute left-4 top-1/2 -translate-y-1/2 text-white hover:text-gray-200"
          >
            <ArrowLeft className="w-6 h-6" />
          </button>
          <div className="flex flex-col items-center">
            <Crown className="w-10 h-10 text-highlight fill mb-2" />
            <h1 className="text-2xl font-bold">Seja Visto. Seja Premium</h1>
            <p className="text-base text-gray-300 mt-1">Transforme Visitas em Pedidos Recorrentes</p>
          </div>
        </div>
      </div>

      <div className="p-4 space-y-6">
        
        {/* Card de Métricas */}
        <Card className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4">
          <h2 className="text-lg font-bold text-primary dark:text-white text-center mb-4">As pessoas te procuram por aqui</h2>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-700/50 rounded-lg p-4 text-center">
              <Users className="w-8 h-8 text-primary dark:text-gray-300 mb-1" />
              <p className="text-2xl font-bold text-primary dark:text-white">0</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Seguidores</p>
            </div>
            <div className="flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-700/50 rounded-lg p-4 text-center">
              <Utensils className="w-8 h-8 text-primary dark:text-gray-300 mb-1" />
              <p className="text-2xl font-bold text-primary dark:text-white">0</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Vistos no campo</p>
            </div>
          </div>
        </Card>
        
        {/* Botão Ver Planos Premium */}
        <Button 
          onClick={() => alert("Navegar para Planos de Assinatura")}
          className="w-full flex items-center justify-center gap-2 min-w-[84px] cursor-pointer overflow-hidden rounded-xl h-14 px-4 bg-gradient-to-r from-orange-400 to-highlight text-white text-lg font-bold leading-normal tracking-[0.015em] shadow-lg shadow-highlight/40 hover:from-orange-500 hover:to-highlight/90"
        >
          Ver Planos Premium
        </Button>

        {/* Card de Benefícios */}
        <Card className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4">
          <h2 className="text-lg font-bold text-primary dark:text-white text-center mb-4">Mais de 80% dos restaurantes de João Pessoa já têm acesso:</h2>
          <div className="grid grid-cols-2 gap-x-4 gap-y-3">
            {features.map((feature, index) => (
              <div key={index} className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-500 fill-green-500/10" />
                <p className="text-sm text-gray-700 dark:text-gray-300">{feature}</p>
              </div>
            ))}
          </div>
        </Card>

        {/* Card de Comparação (Como você é visto?) */}
        <Card className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4">
          <h2 className="text-lg font-bold text-primary dark:text-white text-center mb-2">Como você é visto?</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 text-center mb-4">Escolha como quer ser encontrado.</p>
          
          {/* Toggle (Mocked for visual comparison) */}
          <div className="bg-gray-100 dark:bg-gray-700/50 p-1 rounded-full flex mb-4">
            <button className="w-1/2 py-2 text-center text-sm font-semibold rounded-full bg-primary text-white shadow">Free</button>
            <button className="w-1/2 py-2 text-center text-sm font-semibold rounded-full text-highlight">Premium</button>
          </div>
          
          <div className="space-y-4">
            {/* Free Card */}
            <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
              <div 
                className="relative h-24 bg-gray-300 dark:bg-gray-600 bg-center bg-cover" 
                style={{ backgroundImage: `url('${MOCK_COVER_URL}')`, filter: 'grayscale(100%)' }}
              >
                <div className="absolute inset-0 bg-black/40"></div>
                <div className="absolute top-2 right-2 bg-gray-500/80 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                  FREE
                </div>
              </div>
              <div className="p-3 bg-white dark:bg-gray-800">
                <div className="flex items-start gap-3">
                  <div 
                    className="w-16 h-16 rounded-full border-4 border-white dark:border-gray-800 -mt-8 bg-center bg-cover" 
                    style={{ backgroundImage: `url('${MOCK_LOGO_URL}')`, filter: 'grayscale(100%)' }}
                  ></div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-primary dark:text-white">Seu Restaurante</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Tipo de Comida • $</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Trophy className="w-4 h-4 text-gray-400" />
                      <p className="text-sm font-bold text-gray-500 dark:text-gray-400">--</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">(0 avaliações)</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <div className="text-center">
                    <p className="font-bold text-primary dark:text-white">0</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Seguidores</p>
                  </div>
                  <div className="flex gap-2">
                    <Button variant="secondary" disabled className="rounded-full text-sm font-semibold cursor-not-allowed">Seguir</Button>
                    <Button variant="outline" className="rounded-full text-sm font-semibold">Contato</Button>
                  </div>
                </div>
              </div>
            </div>
            
            {/* Premium Card */}
            <div className="rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
              <div 
                className="relative h-24 bg-cover bg-center" 
                style={{ backgroundImage: `url('${MOCK_COVER_URL}')` }}
              >
                <div className="absolute inset-0 bg-black/30"></div>
                <div className="absolute top-2 right-2 bg-highlight/80 text-white text-xs font-bold px-2 py-1 rounded-full flex items-center gap-1">
                  <Crown className="w-3 h-3 fill-white" />
                  PREMIUM
                </div>
              </div>
              <div className="p-3 bg-white dark:bg-gray-800">
                <div className="flex items-start gap-3">
                  <div 
                    className="w-16 h-16 rounded-full border-4 border-white dark:border-gray-800 -mt-8 bg-center bg-cover" 
                    style={{ backgroundImage: `url('${MOCK_LOGO_URL}')` }}
                  ></div>
                  <div className="flex-1">
                    <h3 className="font-bold text-lg text-primary dark:text-white">NAU - Frutos do Mar</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400">Frutos do Mar • $$</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Trophy className="w-4 h-4 text-yellow-500 fill-yellow-500/10" />
                      <p className="text-sm font-bold text-gray-700 dark:text-gray-300">4.8</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">(2.3k avaliações)</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between mt-3">
                  <div className="text-center">
                    <p className="font-bold text-primary dark:text-white">12.4k</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">Seguidores</p>
                  </div>
                  <div className="flex gap-2">
                    <Button className="rounded-full text-sm font-semibold bg-highlight hover:bg-highlight/90 text-white">Seguir</Button>
                    <Button variant="outline" className="rounded-full text-sm font-semibold">Contato</Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Card>
      </div>
      
      {/* O RestaurantBottomNav é renderizado pelo layout pai (RestaurantArea) */}
    </div>
  );
};

export default Upgrade;