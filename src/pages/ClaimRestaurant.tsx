import React, { useState, useEffect } from 'react';
import { useNavigate, Link, useParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuthContext } from '@/context/AuthContext';
import { Loader2, Utensils, ArrowLeft, CheckCircle } from 'lucide-react';
import { createPageUrl } from '@/utils/url';
import { showError, showSuccess } from '@/utils/toast';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';

/**
 * Página para reivindicar um restaurante existente (se o usuário for o proprietário).
 * Mock: Assume que o restaurante é reivindicado se o usuário estiver logado.
 */
export default function ClaimRestaurant() {
  const navigate = useNavigate();
  const { restaurantId } = useParams<{ restaurantId: string }>();
  const { session, isLoading: isAuthLoading, refetchProfile } = useAuthContext();
  
  const [isClaiming, setIsClaiming] = useState(false);
  const [claimSuccess, setClaimSuccess] = useState(false);
  const [restaurantName, setRestaurantName] = useState('Restaurante XYZ (Mock)'); // Mock

  useEffect(() => {
    if (session && session.user.user_metadata.user_role !== 'restaurant') {
      // Se o usuário estiver logado, mas não for restaurante, redireciona para o hub
      navigate(createPageUrl('restaurantAreaHub'), { replace: true });
    }
  }, [session, navigate]);

  const handleClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user || !restaurantId) {
      showError("Você precisa estar logado para reivindicar um restaurante.");
      return;
    }

    setIsClaiming(true);

    try {
      // 1. Atualizar o registro do restaurante com o user_id atual
      const { error: updateError } = await supabase
        .from('restaurants')
        .update({ user_id: session.user.id })
        .eq('id', restaurantId);

      if (updateError) throw updateError;

      // 2. Atualizar o perfil do usuário para garantir que o role seja 'restaurant'
      await supabase.auth.updateUser({
        data: { user_role: 'restaurant' }
      });
      
      // 3. Refetch profile para atualizar o contexto
      refetchProfile();

      showSuccess(`Restaurante ${restaurantName} reivindicado com sucesso!`);
      setClaimSuccess(true);
      
      setTimeout(() => {
        navigate(createPageUrl('restaurant-area/dashboard')); // CORRIGIDO: Redireciona para o Dashboard
      }, 1000);

    } catch (error) {
      console.error('Claim error:', error);
      showError(`Falha ao reivindicar restaurante: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    } finally {
      setIsClaiming(false);
    }
  };

  if (isAuthLoading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="min-h-screen flex flex-col items-center bg-gray-50 p-4">
      
      {/* Header de Navegação */}
      <header className="flex items-center bg-white p-4 pb-2 justify-start sticky top-0 z-20 shadow-soft-md w-full max-w-md absolute top-0">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => navigate(createPageUrl('restaurantAreaHub'))}
          className="text-[#022D68] hover:bg-[#022D68]/5"
        >
          <ArrowLeft className="h-6 w-6" />
        </Button>
        <h2 className="text-[#022D68] text-xl font-bold ml-4">Reivindicar Restaurante</h2>
      </header>

      <main className="flex-1 flex flex-col justify-center w-full max-w-md pt-20">
        {/* Bloco de Conteúdo Superior (Ícone e Título) */}
        <div className="flex flex-col items-center justify-center pb-6 w-full max-w-sm mx-auto text-center">
          <div className="flex items-center justify-center size-16 bg-primary/10 rounded-xl mx-auto mb-4">
            <Utensils className="w-8 h-8 text-primary" />
          </div>
          <h1 className="text-primary tracking-tight text-3xl font-bold leading-tight">
            Reivindicar {restaurantName}
          </h1>
          <p className="text-gray-600 text-base mt-1">
            Confirme que você é o proprietário deste estabelecimento.
          </p>
        </div>

        {/* Card Principal */}
        <Card className="bg-white rounded-2xl shadow-soft-xl p-6">
          
          {claimSuccess ? (
            <div className="text-center py-8">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-xl font-bold text-primary">Reivindicação Concluída!</h2>
              <p className="text-gray-600 mt-2">Você será redirecionado para o painel de controle.</p>
            </div>
          ) : (
            <form onSubmit={handleClaim} className="space-y-4">
              <p className="text-sm text-gray-700">
                Ao clicar em "Reivindicar", você associa sua conta de usuário atual ({session?.user.email || 'Não Logado'}) ao restaurante {restaurantName}.
              </p>
              
              <Button 
                type="submit" 
                className="w-full h-12 rounded-xl bg-highlight hover:bg-highlight/90 shadow-highlight-glow"
                disabled={isClaiming || !session?.user}
              >
                {isClaiming ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  'Reivindicar Restaurante'
                )}
              </Button>
            </form>
          )}

          <Separator className="my-6" />

          <div className="text-center text-sm">
            <p className="text-gray-600">
              Não é o proprietário?
              <Link
                to={createPageUrl('restaurant-login')}
                className="font-bold text-[#E47948] hover:underline ml-1"
              >
                Voltar ao Login
              </Link>
            </p>
          </div>
        </Card>
      </main>
    </div>
  );
}