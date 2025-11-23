import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils/url';

const Login: React.FC = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    // Redireciona para a página de autenticação principal (Auth.tsx)
    navigate(createPageUrl('auth'), { replace: true });
  }, [navigate]);

  return (
    <div className="flex items-center justify-center h-screen">
      <p>Redirecionando para o Login...</p>
    </div>
  );
};

export default Login;