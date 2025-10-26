import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils/url';

const Index: React.FC = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Redireciona para o fluxo de inicialização
    navigate(createPageUrl('onboarding'), { replace: true });
  }, [navigate]);

  return (
    <div className="flex items-center justify-center h-screen">
      <p>Iniciando aplicação...</p>
    </div>
  );
};

export default Index;