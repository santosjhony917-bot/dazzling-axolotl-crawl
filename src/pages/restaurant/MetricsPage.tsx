import React from 'react';
import { RestaurantAreaPageLayout } from '@/components/restaurant/RestaurantAreaPageLayout';
import { BarChart3, Loader2 } from 'lucide-react';
import { useRestaurantData } from '@/context/RestaurantContext'; // Named import
import ScheduledMetricsManagement from '@/components/restaurant/ScheduledMetricsManagement'; // Import as default

const MetricsPage: React.FC = () => {
  const { restaurant, isLoading } = useRestaurantData();

  if (isLoading) {
    return (
      <RestaurantAreaPageLayout title="Métricas do Restaurante">
        <div className="flex justify-center items-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </RestaurantAreaPageLayout>
    );
  }

  if (!restaurant) {
    return (
      <RestaurantAreaPageLayout title="Métricas do Restaurante">
        <div className="text-center py-10">
          <p className="text-lg text-gray-600 dark:text-gray-400">
            Nenhum restaurante encontrado para exibir métricas.
          </p>
        </div>
      </RestaurantAreaPageLayout>
    );
  }

  return (
    <RestaurantAreaPageLayout title="Métricas do Restaurante">
      <div className="space-y-8 pb-20">
        <section className="space-y-4">
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <BarChart3 className="h-6 w-6 text-primary" />
            Gerenciar Métricas Agendadas
          </h2>
          <ScheduledMetricsManagement restaurantId={restaurant.id} />
        </section>
      </div>
    </RestaurantAreaPageLayout>
  );
};

export default MetricsPage;