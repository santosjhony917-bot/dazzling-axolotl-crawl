"use client";

import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { PublicRestaurantData } from '@/types/restaurant';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

import PremiumProfileLayout from '@/components/public/PremiumProfileLayout';
import FreeProfileLayout from '@/components/public/FreeProfileLayout';
import RestaurantPageHeader from '@/components/public/RestaurantPageHeader';

// 1. Definir interface para as props do componente
interface RestaurantProfilePublicProps {
  initialRestaurantId?: string;
  simulatedPlan?: string;
  isCompact?: boolean;
}

// 2. Ajustar a assinatura do componente para aceitar as props
const RestaurantProfilePublic = ({
  initialRestaurantId,
  simulatedPlan,
  isCompact: propIsCompact, // Renomear para evitar conflito com o estado interno
}: RestaurantProfilePublicProps) => {
  const { restaurantId: paramRestaurantId } = useParams<{ restaurantId: string }>();
  // Usar initialRestaurantId se fornecido, caso contrário, usar o ID da URL
  const currentRestaurantId = initialRestaurantId || paramRestaurantId;

  const [internalIsCompact, setInternalIsCompact] = useState(false);
  // Usar propIsCompact se fornecido, caso contrário, usar o estado interno
  const effectiveIsCompact = propIsCompact !== undefined ? propIsCompact : internalIsCompact;

  // 3. Formatar useQuery como um objeto de opções
  const { data: restaurant, isLoading, error } = useQuery<PublicRestaurantData>({
    queryKey: ['restaurantPublic', currentRestaurantId],
    queryFn: async () => {
      if (!currentRestaurantId) {
        throw new Error("Restaurant ID is missing.");
      }
      const { data, error } = await supabase
        .from('restaurants')
        .select('*')
        .eq('id', currentRestaurantId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!currentRestaurantId, // Apenas executa a query se o ID estiver disponível
  });

  // Placeholder for follow/unfollow logic
  const [isToggling, setIsToggling] = useState(false);
  const toggleFollow = async () => {
    setIsToggling(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 500));
    console.log('Toggle follow for restaurant:', currentRestaurantId); // Usar currentRestaurantId
    setIsToggling(false);
  };

  useEffect(() => {
    if (propIsCompact === undefined) { // Apenas adiciona o listener de scroll se propIsCompact não for fornecido
      const handleScroll = () => {
        if (window.scrollY > 100) { // Ajustar o limite de scroll conforme necessário
          setInternalIsCompact(true);
        } else {
          setInternalIsCompact(false);
        }
      };

      window.addEventListener('scroll', handleScroll);
      return () => window.removeEventListener('scroll', handleScroll);
    }
  }, [propIsCompact]); // Re-executar se propIsCompact mudar

  if (!currentRestaurantId) return <div>ID do restaurante não fornecido.</div>;
  if (isLoading) return <div>Carregando...</div>;
  if (error) return <div>Erro ao carregar restaurante: {error.message}</div>;
  if (!restaurant) return <div>Restaurante não encontrado.</div>;

  // 4. Determinar o plano a ser usado para o layout, priorizando simulatedPlan
  const planForLayout = simulatedPlan || restaurant.plan;

  return (
    <div className="relative min-h-screen bg-background-light">
      {/* Novo cabeçalho fixo no topo */}
      <RestaurantPageHeader />

      <div className={cn("max-w-md mx-auto")}>
        {/* O conteúdo principal do perfil (PremiumProfileLayout ou FreeProfileLayout) */}
        {planForLayout === 'premium' || planForLayout === 'premium_gift' ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5 }}
          >
            <PremiumProfileLayout
              restaurant={restaurant as PublicRestaurantData}
              toggleFavorite={toggleFollow}
              isFavoriteMutating={isToggling}
              isCompact={effectiveIsCompact}
            />
          </motion.div>
        ) : (
          <motion.div>
            <FreeProfileLayout
              restaurant={restaurant as PublicRestaurantData}
              toggleFavorite={toggleFollow}
              isFavoriteMutating={isToggling}
              isCompact={effectiveIsCompact}
            />
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default RestaurantProfilePublic;