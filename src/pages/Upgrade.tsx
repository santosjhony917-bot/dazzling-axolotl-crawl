import React from 'react';
import { Crown, Check, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useLocation } from 'react-router-dom'; // Importando useLocation

const Upgrade: React.FC = () => {
  const location = useLocation();
  
  // Verifica se estamos na rota de cliente (nível superior) ou na rota aninhada do restaurante
  const isRestaurantArea = location.pathname.startsWith('/restaurant-area');
  
  const features = [
    "Busca prioritária",
    "Promoções exclusivas",
    "Suporte 24/7",
    "Sem anúncios",
  ];

  return (
    // Ajustando o padding inferior para ser consistente com o layout pai
    <div className={isRestaurantArea ? "pb-20 max-w-md mx-auto" : "min-h-screen bg-[#f5f7f8] pb-20 max-w-md mx-auto"}>
      <header className="pt-8 pb-6 text-center bg-white shadow-sm">
        <Crown className="w-10 h-10 text-[#E47948] mx-auto mb-2" />
        <h1 className="text-3xl font-bold text-[#022D68]">Faça Upgrade</h1>
        <p className="text-gray-600 mt-1 px-4">Desbloqueie recursos premium e encontre os melhores restaurantes.</p>
      </header>

      <main className="p-4 space-y-6">
        <Card className="border-2 border-[#E47948] shadow-xl">
          <CardHeader className="bg-[#E47948] text-white rounded-t-xl p-6">
            <CardTitle className="text-2xl font-extrabold flex items-center justify-center gap-2">
              <Crown className="w-6 h-6" /> Premium
            </CardTitle>
            <p className="text-center text-sm mt-1">A melhor experiência FilterFood.</p>
          </CardHeader>
          <CardContent className="p-6 space-y-4">
            <div className="text-center">
              <span className="text-4xl font-bold text-[#022D68]">R$ 19,90</span>
              <span className="text-gray-500"> / mês</span>
            </div>
            
            <ul className="space-y-2">
              {features.map((feature, index) => (
                <li key={index} className="flex items-center text-gray-700">
                  <Check className="w-5 h-5 text-green-500 mr-3" />
                  {feature}
                </li>
              ))}
            </ul>

            <Button className="w-full h-12 rounded-full bg-[#022D68] hover:bg-[#022D68]/90 text-white font-bold text-base mt-4">
              Assinar Agora <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
          </CardContent>
        </Card>
      </main>
      
      {/* O CustomerBottomNav foi removido daqui. Ele será renderizado apenas se a rota for /upgrade (cliente) */}
      {/* Se estivermos na área do restaurante, o RestaurantArea.tsx renderiza o nav correto. */}
    </div>
  );
};

export default Upgrade;