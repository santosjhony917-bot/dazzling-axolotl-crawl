import React from 'react';
import { useRestaurantPlan } from '@/hooks/useRestaurantPlan';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Crown, Lock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Link } from 'react-router-dom';

interface PremiumFeatureGuardProps {
  children: React.ReactNode;
  featureName: string;
}

/**
 * Componente que bloqueia o conteúdo se o plano do restaurante não for Premium.
 */
export const PremiumFeatureGuard: React.FC<PremiumFeatureGuardProps> = ({ children, featureName }) => {
  const { data: planData, isLoading } = useRestaurantPlan();

  if (isLoading) {
    return <div className="text-center py-4 text-gray-500">Verificando plano...</div>;
  }

  if (planData.isFree) {
    return (
      <Alert className="border-highlight bg-highlight/10 text-highlight">
        <Lock className="h-4 w-4" />
        <AlertTitle>Recurso Premium Bloqueado</AlertTitle>
        <AlertDescription className="space-y-3">
          <p>O recurso "{featureName}" está disponível apenas para planos Premium.</p>
          <Button asChild className="bg-highlight hover:bg-highlight/90">
            <Link to="/dashboard/plans">
              <Crown className="h-4 w-4 mr-2" />
              Fazer Upgrade Agora
            </Link>
          </Button>
        </AlertDescription>
      </Alert>
    );
  }

  return <>{children}</>;
};