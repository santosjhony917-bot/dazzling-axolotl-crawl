import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle, XCircle, Crown } from 'lucide-react';
import { Restaurant } from '@/types/supabase';

interface SubscriptionCardProps {
  restaurant: Restaurant;
}

const SubscriptionCard: React.FC<SubscriptionCardProps> = ({ restaurant }) => {
  const isPremium = restaurant.plan === 'premium';
  const planName = isPremium ? 'Premium' : 'Básico (Grátis)';
  const planDescription = isPremium
    ? 'Acesso total a todos os recursos, incluindo métricas avançadas e destaque.'
    : 'Recursos essenciais para começar a gerenciar seu cardápio online.';

  return (
    <Card className="shadow-soft-lg border-none rounded-xl bg-white">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xl font-bold text-[#022D68] flex items-center gap-2">
          <Crown className="w-5 h-5 text-highlight" />
          Plano Atual
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-3xl font-bold text-primary mt-2">{planName}</div>
        <p className="text-sm text-gray-500 mt-1">{planDescription}</p>

        <div className="mt-4 space-y-2">
          <div className="flex items-center text-sm">
            {isPremium ? <CheckCircle className="w-4 h-4 text-green-500 mr-2" /> : <XCircle className="w-4 h-4 text-gray-400 mr-2" />}
            <span>Destaque na busca</span>
          </div>
          <div className="flex items-center text-sm">
            {isPremium ? <CheckCircle className="w-4 h-4 text-green-500 mr-2" /> : <CheckCircle className="w-4 h-4 text-green-500 mr-2" />}
            <span>Gerenciamento de Cardápio</span>
          </div>
          <div className="flex items-center text-sm">
            {isPremium ? <CheckCircle className="w-4 h-4 text-green-500 mr-2" /> : <XCircle className="w-4 h-4 text-gray-400 mr-2" />}
            <span>Métricas de Engajamento</span>
          </div>
        </div>
        
      </CardContent>
    </Card>
  );
};

export default SubscriptionCard;