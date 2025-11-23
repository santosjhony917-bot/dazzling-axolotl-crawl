import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Crown, Loader2, CheckCircle, XCircle } from 'lucide-react';
import { Restaurant } from '@/types/supabase';
import { format } from 'date-fns';

interface SubscriptionCardProps {
  restaurant: Restaurant;
}

const SubscriptionCard: React.FC<SubscriptionCardProps> = ({ restaurant }) => {
  const plan = restaurant.plan || 'free';
  const isPremium = plan === 'premium';

  const handleUpgradeClick = () => {
    // Lógica para redirecionar ou abrir modal de upgrade
    console.log('Iniciando processo de upgrade...');
    // Aqui você pode adicionar a navegação para a página de planos
  };

  const getPlanDetails = () => {
    switch (plan) {
      case 'premium':
        return {
          title: 'Plano Premium',
          description: 'Acesso total a todos os recursos, incluindo localização avançada e destaque.',
          color: 'text-yellow-600',
          icon: <CheckCircle className="w-5 h-5 text-green-500" />,
        };
      case 'basic':
        return {
          title: 'Plano Básico',
          description: 'Recursos essenciais para gerenciar seu menu e perfil.',
          color: 'text-blue-600',
          icon: <CheckCircle className="w-5 h-5 text-green-500" />,
        };
      case 'free':
      default:
        return {
          title: 'Plano Gratuito',
          description: 'Funcionalidades limitadas. Considere fazer upgrade para mais visibilidade.',
          color: 'text-gray-600',
          icon: <XCircle className="w-5 h-5 text-red-500" />,
        };
    }
  };

  const details = getPlanDetails();

  return (
    <Card className="shadow-soft-lg border-none rounded-xl bg-white">
      <CardHeader>
        <CardTitle className="text-xl text-[#022D68] flex items-center gap-2">
          <Crown className="w-5 h-5 text-yellow-500" /> Assinatura
        </CardTitle>
        <CardDescription>Gerencie seu plano de assinatura e benefícios.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              {details.icon}
              <div>
                <p className="font-semibold text-lg">{details.title}</p>
                <p className="text-sm text-gray-500">{details.description}</p>
              </div>
            </div>
          </div>

          {isPremium && (
            <div className="text-sm text-gray-600">
              <p>Início da Assinatura: {format(new Date(restaurant.created_at), 'dd/MM/yyyy')}</p>
              {/* Se houvesse um campo de expiração, ele seria exibido aqui */}
            </div>
          )}

          {/* Botão de upgrade removido conforme solicitado */}
        </div>
      </CardContent>
    </Card>
  );
};

export default SubscriptionCard;