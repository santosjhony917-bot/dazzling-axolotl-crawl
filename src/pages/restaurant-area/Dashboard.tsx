import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils/url';

const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  
  useEffect(() => {
    // Redireciona para o dashboard principal do restaurante
    navigate(createPageUrl('restaurantDashboard'), { replace: true });
  }, [navigate]);

  return (
    <div className="flex items-center justify-center h-screen">
      <p>Carregando Dashboard do Restaurante...</p>
    </div>
  );
};

export default Dashboard;