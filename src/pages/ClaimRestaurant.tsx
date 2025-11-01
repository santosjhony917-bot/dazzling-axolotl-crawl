"use client";

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthData } from '@/context/AuthContext';
import { useMutation } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Loader2, UtensilsCrossed } from 'lucide-react';
import { showError, showSuccess } from '@/utils/toast';

const ClaimRestaurant: React.FC = () => {
  const navigate = useNavigate();
  const { user, refetchProfile } = useAuthData(); // Adicionado refetchProfile
  const [accessCode, setAccessCode] = useState('');
  const [restaurantName, setRestaurantName] = useState('');
  const [isCreatingNew, setIsCreatingNew] = useState(false);

  const claimRestaurantMutation = useMutation<void, Error, string>({
    mutationFn: async (code) => {
      if (!user) throw new Error('Usuário não autenticado.');

      // In a real scenario, you'd have a more robust way to claim a restaurant
      // For now, let's assume the access code directly links to a restaurant ID
      // or a pre-registered restaurant entry.
      // This is a placeholder for actual claiming logic.
      const { data, error } = await supabase
        .from('restaurants')
        .update({ user_id: user.id })
        .eq('id', code) // Assuming code is the restaurant ID
        .is('user_id', null) // Only claim if not already claimed
        .select()
        .single();

      if (error) {
        console.error('Error claiming restaurant:', error);
        throw new Error('Código de acesso inválido ou restaurante já reivindicado.');
      }
      if (!data) {
        throw new Error('Nenhum restaurante encontrado com este código ou já reivindicado.');
      }
    },
    onSuccess: async () => {
      showSuccess('Restaurante reivindicado com sucesso!');
      await refetchProfile(); // Atualiza o contexto para carregar o restaurante
      navigate('/restaurant/dashboard');
    },
    onError: (err) => {
      showError(err.message);
    },
  });

  const createRestaurantMutation = useMutation<void, Error, string>({
    mutationFn: async (name) => {
      if (!user) throw new Error('Usuário não autenticado.');

      const { data, error } = await supabase
        .from('restaurants')
        .insert({ name: name, user_id: user.id, plan: 'free' })
        .select()
        .single();

      if (error) {
        console.error('Error creating restaurant:', error);
        throw new Error('Erro ao criar restaurante. Tente novamente.');
      }
    },
    onSuccess: async () => {
      showSuccess('Restaurante criado com sucesso!');
      await refetchProfile(); // Atualiza o contexto para carregar o restaurante
      navigate('/restaurant/dashboard');
    },
    onError: (err) => {
      showError(err.message);
    },
  });

  const handleClaim = () => {
    claimRestaurantMutation.mutate(accessCode);
  };

  const handleCreate = () => {
    createRestaurantMutation.mutate(restaurantName);
  };

  if (!user) {
    return (
      <div className="flex justify-center items-center h-screen">
        <p>Você precisa estar logado para reivindicar ou criar um restaurante.</p>
        <Button onClick={() => navigate('/auth')}>Fazer Login</Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 flex flex-col items-center justify-center min-h-[calc(100vh-100px)]">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <UtensilsCrossed className="h-12 w-12 text-[#022D68] mx-auto mb-4" />
          <CardTitle className="text-2xl font-bold text-[#022D68]">Gerenciar Restaurante</CardTitle>
          <CardDescription>Reivindique um restaurante existente ou crie um novo.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {!isCreatingNew ? (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-[#022D68]">Reivindicar Restaurante Existente</h3>
              <div>
                <Label htmlFor="accessCode">Código de Acesso do Restaurante</Label>
                <Input
                  id="accessCode"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  placeholder="Digite o código de acesso"
                />
              </div>
              <Button
                onClick={handleClaim}
                className="w-full bg-[#E47948] hover:bg-[#C2653B]"
                disabled={claimRestaurantMutation.isPending}
              >
                {claimRestaurantMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  'Reivindicar Restaurante'
                )}
              </Button>
              <Button variant="link" className="w-full text-[#022D68]" onClick={() => setIsCreatingNew(true)}>
                Ou criar um novo restaurante
              </Button>
            </div>
          ) : (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-[#022D68]">Criar Novo Restaurante</h3>
              <div>
                <Label htmlFor="restaurantName">Nome do Restaurante</Label>
                <Input
                  id="restaurantName"
                  value={restaurantName}
                  onChange={(e) => setRestaurantName(e.target.value)}
                  placeholder="Nome do seu novo restaurante"
                />
              </div>
              <Button
                onClick={handleCreate}
                className="w-full bg-[#E47948] hover:bg-[#C2653B]"
                disabled={createRestaurantMutation.isPending}
              >
                {createRestaurantMutation.isPending ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  'Criar Restaurante'
                )}
              </Button>
              <Button variant="link" className="w-full text-[#022D68]" onClick={() => setIsCreatingNew(false)}>
                Ou reivindicar um restaurante existente
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ClaimRestaurant;