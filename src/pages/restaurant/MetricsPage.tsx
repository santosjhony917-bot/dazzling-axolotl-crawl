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
      <RestaurantAreaPageLayout title="Métricas e Desempenho" icon={BarChart3} backPath="restaurant-area/profile-menu">
        <div className="flex min-h-[320px] items-center justify-center rounded-2xl border border-slate-100 bg-white shadow-soft">
          <Loader2 className="h-8 w-8 animate-spin text-[#df4b1c]" />
        </div>
      </RestaurantAreaPageLayout>
    );
  }
  
  const content = isPremium ? (
    <div>
      <h2 className="text-xl font-semibold mb-4 text-[#3C2F2F]">Métricas de Desempenho</h2>
      <Card className="rounded-2xl border border-slate-100 bg-white p-6 shadow-soft">
        <CardContent className="p-0 text-slate-500">
          <p>Gráficos e dados de visualizações, cliques no cardápio e taxa de conversão serão exibidos aqui.</p>
          <p className="mt-4 font-bold text-[#df4b1c]">Recurso Premium Ativo!</p>
        </CardContent>
      </Card>
    </div>
  ) : (
    <div>
      <Card className="rounded-2xl border border-slate-100 bg-white p-6 shadow-soft">
        <h2 className="text-xl font-semibold mb-4 text-[#3C2F2F]">Recurso Premium</h2>
        <p className="text-slate-500 mb-6">
          As métricas de desempenho e o acompanhamento de seguidores são exclusivos do plano Premium.
        </p>
        <Button 
          onClick={() => navigate(createPageUrl('restaurant-area/upgrade'))}
          className="rounded-2xl bg-[#df4b1c] hover:bg-[#bd3f17]"
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
