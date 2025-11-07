"use client";

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CheckCircle2, XCircle, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/hooks/useAuth';
import RestaurantProfilePublic from './RestaurantProfilePublic'; // Importação corrigida

const Upgrade = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'basic' | 'premium'>('free');
  const [previewPlan, setPreviewPlan] = useState<'free' | 'basic' | 'premium'>('free');

  const { data: restaurant, isLoading, error } = useQuery({
    queryKey: ['myRestaurant', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('user_id', user.id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  const updatePlanMutation = useMutation({
    mutationFn: async (plan: 'free' | 'basic' | 'premium') => {
      if (!restaurant?.id) throw new Error('Restaurant not found.');
      const { data, error } = await supabase
        .from('restaurants')
        .update({ plan })
        .eq('id', restaurant.id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['myRestaurant', user?.id] });
      toast.success(`Plano atualizado para ${selectedPlan} com sucesso!`);
      navigate('/dashboard');
    },
    onError: (err) => {
      toast.error('Erro ao atualizar plano: ' + err.message);
    },
  });

  if (isLoading) {
    return <div className="flex justify-center items-center min-h-screen">Carregando...</div>;
  }

  if (error) {
    return <div className="flex justify-center items-center min-h-screen text-red-500">Erro: {error.message}</div>;
  }

  if (!restaurant) {
    return <div className="flex justify-center items-center min-h-screen">Nenhum restaurante encontrado para o seu usuário.</div>;
  }

  const plans = [
    {
      id: 'free',
      name: 'Grátis',
      price: 'R$0/mês',
      features: [
        'Perfil básico do restaurante',
        'Cardápio simples',
        'Informações de contato',
        'Até 5 itens de cardápio',
        'Sem galeria de fotos',
        'Sem capa personalizada',
      ],
    },
    {
      id: 'basic',
      name: 'Básico',
      price: 'R$29/mês',
      features: [
        'Todas as funcionalidades do plano Grátis',
        'Cardápio completo',
        'Até 50 itens de cardápio',
        'Galeria de fotos (até 10 fotos)',
        'Capa personalizada',
        'Suporte prioritário',
      ],
    },
    {
      id: 'premium',
      name: 'Premium',
      price: 'R$99/mês',
      features: [
        'Todas as funcionalidades do plano Básico',
        'Itens de cardápio ilimitados',
        'Galeria de fotos ilimitada',
        'Integração com redes sociais',
        'Análises de desempenho',
        'Recursos de marketing avançados',
        'Suporte 24/7',
      ],
    },
  ];

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-4xl font-bold text-center mb-8">Escolha o Plano Ideal para o seu Restaurante</h1>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-12">
        {plans.map((plan) => (
          <Card
            key={plan.id}
            className={`flex flex-col justify-between ${selectedPlan === plan.id ? 'border-2 border-primary' : ''}`}
            onClick={() => setSelectedPlan(plan.id as 'free' | 'basic' | 'premium')}
          >
            <CardHeader>
              <CardTitle className="text-2xl">{plan.name}</CardTitle>
              <CardDescription className="text-3xl font-bold">{plan.price}</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2">
                {plan.features.map((feature, index) => (
                  <li key={index} className="flex items-center">
                    <CheckCircle2 className="text-green-500 mr-2" size={18} />
                    {feature}
                  </li>
                ))}
              </ul>
            </CardContent>
            <CardFooter>
              <Button
                className="w-full"
                onClick={() => updatePlanMutation.mutate(selectedPlan)}
                disabled={updatePlanMutation.isPending || restaurant.plan === plan.id}
              >
                {restaurant.plan === plan.id ? 'Plano Atual' : 'Selecionar Plano'}
              </Button>
            </CardFooter>
          </Card>
        ))}
      </div>

      <h2 className="text-3xl font-bold text-center mb-6">Pré-visualização do seu Perfil</h2>
      <div className="flex justify-center gap-4 mb-8">
        {plans.map((plan) => (
          <Button
            key={`preview-${plan.id}`}
            variant={previewPlan === plan.id ? 'default' : 'outline'}
            onClick={() => setPreviewPlan(plan.id as 'free' | 'basic' | 'premium')}
          >
            Pré-visualizar {plan.name}
          </Button>
        ))}
      </div>

      <div className="border rounded-lg overflow-hidden shadow-xl">
        {previewPlan === 'free' ? (
                  <RestaurantProfilePublic initialRestaurantId={restaurant.id} simulatedPlan="free" isCompact={true} />
                ) : (
                  <RestaurantProfilePublic initialRestaurantId={restaurant.id} simulatedPlan="premium" isCompact={true} />
                )}
      </div>
    </div>
  );
};

export default Upgrade;