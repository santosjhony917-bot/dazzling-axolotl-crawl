import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils/url';

const Index: React.FC = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    // Redireciona a rota raiz para a página Home principal do cliente
    navigate(createPageUrl('home'), { replace: true });
  }, [navigate]);

  return (
    <div className="flex items-center justify-center h-screen">
      <p>Carregando...</p>
    </div>
  );
};

export default Index;