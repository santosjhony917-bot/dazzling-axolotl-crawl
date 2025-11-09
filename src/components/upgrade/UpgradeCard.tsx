"use client";

import React, { useState } from 'react';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { useAuthData } from '@/context/AuthContext';

interface Restaurant {
  id: string;
  plan: 'free' | 'basic' | 'premium';
}

interface UpgradeCardProps {
  restaurant: Restaurant;
}

const FeatureItem: React.FC<{ text: string; included: boolean }> = ({ text, included }) => (
  <li className="flex items-center space-x-2">
    {included ? (
      <CheckCircle className="h-5 w-5 text-green-500" />
    ) : (
      <XCircle className="h-5 w-5 text-red-500" />
    )}
    <span className="text-gray-700 dark:text-gray-300">{text}</span>
  </li>
);

const UpgradeCard: React.FC<UpgradeCardProps> = ({ restaurant }) => {
  const { refetchRestaurant } = useAuthData();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleUpgrade = async (plan: 'free' | 'basic' | 'premium') => {
    setIsSubmitting(true);
    const { error } = await supabase
      .from('restaurants')
      .update({ plan })
      .eq('id', restaurant.id);

    if (error) {
      console.error('Error upgrading plan:', error);
      toast.error('Erro ao atualizar o plano.');
    } else {
      toast.success(`Plano atualizado para ${plan.toUpperCase()} com sucesso!`);
      refetchRestaurant();
    }
    setIsSubmitting(false);
  };

  const currentPlan = restaurant.plan;

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
      {/* Free Plan Card */}
      <Card className={`flex flex-col ${currentPlan === 'free' ? 'border-primary shadow-lg' : ''}`}>
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center">Grátis</CardTitle>
          <CardDescription className="text-center text-gray-600 dark:text-gray-400">
            Comece a divulgar seu restaurante sem custo.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-grow">
          <div className="text-center mb-6">
            <span className="text-5xl font-extrabold text-gray-900 dark:text-white">R$0</span>
            <span className="text-xl text-gray-500 dark:text-gray-400">/mês</span>
          </div>
          <ul className="space-y-3">
            <FeatureItem text="Perfil do restaurante básico" included />
            <FeatureItem text="Cardápio digital simples" included />
            <FeatureItem text="Até 5 itens no cardápio" included />
            <FeatureItem text="Informações de contato" included />
            <FeatureItem text="Localização no mapa" included />
            <FeatureItem text="Galeria de fotos limitada (até 3 fotos)" included />
            <FeatureItem text="Sem destaque na busca" included={false} />
            <FeatureItem text="Sem agendamento de métricas" included={false} />
            <FeatureItem text="Sem banners promocionais" included={false} />
          </ul>
        </CardContent>
        <CardFooter className="mt-auto">
          {currentPlan === 'free' ? (
            <Button className="w-full" disabled>Plano Atual</Button>
          ) : (
            <Button className="w-full" onClick={() => handleUpgrade('free')} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Mudar para Grátis
            </Button>
          )}
        </CardFooter>
      </Card>

      {/* Basic Plan Card */}
      <Card className={`flex flex-col ${currentPlan === 'basic' ? 'border-primary shadow-lg' : ''}`}>
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center">Básico</CardTitle>
          <CardDescription className="text-center text-gray-600 dark:text-gray-400">
            Aumente sua presença e gerencie seu cardápio.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-grow">
          <div className="text-center mb-6">
            <span className="text-5xl font-extrabold text-gray-900 dark:text-white">R$49</span>
            <span className="text-xl text-gray-500 dark:text-gray-400">/mês</span>
          </div>
          <ul className="space-y-3">
            <FeatureItem text="Tudo do Plano Grátis" included />
            <FeatureItem text="Cardápio digital completo" included />
            <FeatureItem text="Itens ilimitados no cardápio" included />
            <FeatureItem text="Galeria de fotos ilimitada" included />
            <FeatureItem text="Destaque moderado na busca" included />
            <FeatureItem text="Agendamento de métricas (básico)" included />
            <FeatureItem text="Banners promocionais (limitado)" included />
          </ul>
        </CardContent>
        <CardFooter className="mt-auto">
          {currentPlan === 'basic' ? (
            <Button className="w-full" disabled>Plano Atual</Button>
          ) : (
            <Button className="w-full" onClick={() => handleUpgrade('basic')} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Mudar para Básico
            </Button>
          )}
        </CardFooter>
      </Card>

      {/* Premium Plan Card */}
      <Card className={`flex flex-col ${currentPlan === 'premium' ? 'border-primary shadow-lg' : ''}`}>
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center">Premium</CardTitle>
          <CardDescription className="text-center text-gray-600 dark:text-gray-400">
            Máxima visibilidade e ferramentas avançadas.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-grow">
          <div className="text-center mb-6">
            <span className="text-5xl font-extrabold text-gray-900 dark:text-white">R$99</span>
            <span className="text-xl text-gray-500 dark:text-gray-400">/mês</span>
          </div>
          <ul className="space-y-3">
            <FeatureItem text="Tudo do Plano Básico" included />
            <FeatureItem text="Destaque prioritário na busca" included />
            <FeatureItem text="Agendamento de métricas (avançado)" included />
            <FeatureItem text="Banners promocionais (ilimitado)" included />
            <FeatureItem text="Suporte prioritário" included />
            <FeatureItem text="Análises de desempenho detalhadas" included />
            <FeatureItem text="Integração com redes sociais" included />
          </ul>
        </CardContent>
        <CardFooter className="mt-auto">
          {currentPlan === 'premium' ? (
            <Button className="w-full" disabled>Plano Atual</Button>
          ) : (
            <Button className="w-full" onClick={() => handleUpgrade('premium')} disabled={isSubmitting}>
              {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Mudar para Premium
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  );
};

export default UpgradeCard;