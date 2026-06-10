import React from 'react';
import RestaurantAreaPageLayout from '@/components/restaurant/RestaurantAreaPageLayout';
import { BarChart3, Loader2 } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useAuthData } from '@/context/AuthContext';
import { Button } from '@/components/ui/button';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils/url';

const MetricsPage: React.FC = () => {
  const { isPremium, isLoading } = useAuthData();
  const navigate = useNavigate();
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  const content = isPremium ? (
    <div className="p-4">
      <h2 className="text-xl font-semibold mb-4 text-primary">Métricas de Desempenho</h2>
      <Card className="shadow-none border-none rounded-2xl p-6">
        <CardContent className="p-0 text-gray-600">
          <p>Gráficos e dados de visualizações, cliques no cardápio e taxa de conversão serão exibidos aqui.</p>
          <p className="mt-4 font-bold text-green-600">Recurso Premium Ativo!</p>
        </CardContent>
      </Card>
    </div>
  ) : (
    <div className="p-4">
      <Card className="shadow-none border-none rounded-2xl p-6 bg-yellow-50 border-yellow-300">
        <h2 className="text-xl font-semibold mb-4 text-yellow-800">Recurso Premium</h2>
        <p className="text-gray-700 mb-6">
          As métricas de desempenho e o acompanhamento de seguidores são exclusivos do plano Premium.
        </p>
        <Button 
          onClick={() => navigate(createPageUrl('restaurant-area/upgrade'))}
          className="bg-highlight hover:bg-highlight/90"
        >
          Fazer Upgrade
        </Button>
      </Card>
    </div>
  );

  return (
    <RestaurantAreaPageLayout 
      title="Métricas e Desempenho" 
      icon={BarChart3} 
      backPath="restaurant-area/profile-menu"
    >
      {content}
    </RestaurantAreaPageLayout>
  );
};

export default MetricsPage;