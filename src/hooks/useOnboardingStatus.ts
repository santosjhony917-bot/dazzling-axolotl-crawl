import { useState, useEffect, useCallback } from 'react';

const ONBOARDING_KEY = 'onboarding_complete';

/**
 * Hook para gerenciar o status de conclusão do onboarding.
 * O status é persistido no localStorage.
 */
export const useOnboardingStatus = () => {
  const [isComplete, setIsComplete] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Verifica o status inicial no localStorage
    const status = localStorage.getItem(ONBOARDING_KEY) === 'true';
    setIsComplete(status);
    setIsLoading(false);
  }, []);

  const completeOnboarding = useCallback(() => {
    localStorage.setItem(ONBOARDING_KEY, 'true');
    setIsComplete(true);
  }, []);

  const resetOnboarding = useCallback(() => {
    localStorage.removeItem(ONBOARDING_KEY);
    setIsComplete(false);
  }, []);

  return {
    isComplete,
    isLoading,
    completeOnboarding,
    resetOnboarding,
  };
};