import React from 'react';
import { useAuthContext } from '@/context/AuthContext';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Loader2, Check, X, ArrowRight, User, Utensils, Crown } from 'lucide-react';
import { createPageUrl } from '@/utils/url';
import { useNavigate } from 'react-router-dom';

const DebugFlowPanel: React.FC = () => {
  const { 
    user, 
    isLoading: isAuthLoading, 
    restaurant, 
    isAdmin, 
    isPremium, 
    signOut,
    refetchProfile
  } = useAuthContext();
  const { 
    isComplete: isOnboardingComplete, 
    isLoading: isStatusLoading, 
    resetOnboarding 
  } = useOnboardingStatus();
  const navigate = useNavigate();

  const isLoading = isAuthLoading || isStatusLoading;
  const isAuthenticated = !!user;
  const isRestaurantOwner = !!restaurant;

  // 1. Determinar o Próximo Destino Esperado
  let nextExpectedDestination = 'N/A';
  
  if (isLoading) {
    nextExpectedDestination = 'Aguardando carregamento...';
  } else if (!isOnboardingComplete) {
    nextExpectedDestination = createPageUrl('onboarding');
  } else if (!isAuthenticated) {
    nextExpectedDestination = createPageUrl('welcome');
  } else if (isAdmin) {
    nextExpectedDestination = createPageUrl('adminDashboard');
  } else if (isRestaurantOwner) {
    nextExpectedDestination = createPageUrl('restaurant-area/dashboard');
  } else {
    nextExpectedDestination = createPageUrl('home');
  }
  
  const handleReset = () => {
    resetOnboarding();
    signOut();
    navigate(createPageUrl('index'), { replace: true });
  };

  return (
    <div className="p-4 space-y-6 max-w-md mx-auto">
      <Card className="shadow-soft-xl border-2 border-red-500/50 bg-red-50">
        <CardHeader>
          <CardTitle className="text-2xl text-red-600 flex items-center gap-2">
            <ArrowRight className="w-6 h-6" /> Diagnóstico de Fluxo
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          
          <div className="space-y-2">
            <h3 className="font-bold text-primary">Status de Carregamento</h3>
            <p className="text-sm flex items-center">
              Auth/Profile: {isAuthLoading ? <Loader2 className="w-4 h-4 ml-2 animate-spin text-primary" /> : <Check className="w-4 h-4 ml-2 text-green-500" />}
            </p>
            <p className="text-sm flex items-center">
              Onboarding Status: {isStatusLoading ? <Loader2 className="w-4 h-4 ml-2 animate-spin text-primary" /> : <Check className="w-4 h-4 ml-2 text-green-500" />}
            </p>
          </div>

          <div className="space-y-2 border-t pt-4">
            <h3 className="font-bold text-primary">Status do Usuário</h3>
            <p className="text-sm flex items-center">
              Autenticado: {isAuthenticated ? <Check className="w-4 h-4 ml-2 text-green-500" /> : <X className="w-4 h-4 ml-2 text-red-500" />}
            </p>
            <p className="text-sm flex items-center">
              ID: <span className="ml-2 text-xs truncate">{user?.id || 'N/A'}</span>
            </p>
            <p className="text-sm flex items-center">
              Role Admin: {isAdmin ? <Check className="w-4 h-4 ml-2 text-green-500" /> : <X className="w-4 h-4 ml-2 text-red-500" />}
            </p>
            <p className="text-sm flex items-center">
              Role Restaurante: {isRestaurantOwner ? <Check className="w-4 h-4 ml-2 text-green-500" /> : <X className="w-4 h-4 ml-2 text-red-500" />}
            </p>
            <p className="text-sm flex items-center">
              Plano Premium: {isPremium ? <Crown className="w-4 h-4 ml-2 text-amber-500 fill-amber-500" /> : <X className="w-4 h-4 ml-2 text-red-500" />}
            </p>
          </div>
          
          <div className="space-y-2 border-t pt-4">
            <h3 className="font-bold text-primary">Status Onboarding</h3>
            <p className="text-sm flex items-center">
              Completo: {isOnboardingComplete ? <Check className="w-4 h-4 ml-2 text-green-500" /> : <X className="w-4 h-4 ml-2 text-red-500" />}
            </p>
          </div>

          <div className="space-y-2 border-t pt-4">
            <h3 className="font-bold text-red-600">Próximo Destino Esperado</h3>
            <p className="text-base font-semibold text-red-700 break-words">{nextExpectedDestination}</p>
          </div>
          
          <div className="flex flex-col gap-2 pt-4 border-t">
            <Button onClick={() => navigate(nextExpectedDestination)} disabled={isLoading} className="bg-green-600 hover:bg-green-700">
                Tentar Navegar para Destino Esperado
            </Button>
            <Button onClick={handleReset} variant="destructive">
                Resetar Onboarding & Logout
            </Button>
            <Button onClick={() => navigate(createPageUrl('index'))} variant="outline">
                Voltar para Splash (/)
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DebugFlowPanel;