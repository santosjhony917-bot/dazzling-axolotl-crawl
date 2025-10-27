import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2, Utensils } from 'lucide-react';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';

const Splash: React.FC = () => {
  const navigate = useNavigate();
  const { isComplete, isLoading } = useOnboardingStatus();

  useEffect(() => {
    if (!isLoading) {
      // Redireciona após um pequeno delay para mostrar a tela de splash
      const timer = setTimeout(() => {
        if (isComplete) {
          // Se o onboarding estiver completo, vai para a Home
          navigate('/home', { replace: true });
        } else {
          // Se o onboarding não estiver completo, vai para a tela de Onboarding
          navigate('/onboarding', { replace: true });
        }
      }, 1500); // 1.5 segundos de splash

      return () => clearTimeout(timer);
    }
  }, [isLoading, isComplete, navigate]);

  return (
    <div className="flex flex-col items-center justify-center h-screen bg-primary text-white">
      <div className="flex items-center mb-4">
        <Utensils className="w-12 h-12 mr-2" />
        <h1 className="text-4xl font-bold">FoodApp</h1>
      </div>
      <p className="text-lg mb-8">Seu guia gastronômico.</p>
      
      {/* Loader */}
      <Loader2 className="w-6 h-6 animate-spin text-white" />
    </div>
  );
};

export default Splash;