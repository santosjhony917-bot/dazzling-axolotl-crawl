import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import AdminAreaPageLayout from '@/components/admin/AdminAreaPageLayout';
import InstantMetrics from './InstantMetrics';
import ScheduledMetrics from './ScheduledMetrics';
import { useAuthData } from '@/context/AuthContext';

const AdminDashboard: React.FC = () => {
  const { restaurant } = useAuthData();

  const restaurantId = restaurant?.id || 'some-restaurant-id';

  return (
    <AdminAreaPageLayout title="Dashboard do Restaurante">
      <div className="p-4">
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Visão Geral</TabsTrigger>
            <TabsTrigger value="instant-metrics">Métricas Instantâneas</TabsTrigger>
            <TabsTrigger value="scheduled-metrics">Métricas Agendadas</TabsTrigger>
          </TabsList>
          <TabsContent value="overview">
            <h2 className="text-xl font-bold mb-4">Visão Geral</h2>
            <p>Conteúdo da visão geral do dashboard.</p>
          </TabsContent>
          <TabsContent value="instant-metrics">
            <InstantMetrics restaurantId={restaurantId} />
          </TabsContent>
          <TabsContent value="scheduled-metrics">
            <ScheduledMetrics restaurantId={restaurantId} />
          </TabsContent>
        </Tabs>
      </div>
    </AdminAreaPageLayout>
  );
};

export default AdminDashboard;