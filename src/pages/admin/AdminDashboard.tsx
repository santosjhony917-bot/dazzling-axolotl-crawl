import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, DollarSign, Zap, Clock, BarChart, Crown } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import AdminUploadInfo from './AdminUploadInfo';
import ManagePlans from './ManagePlans';
import InstantMetrics from './InstantMetrics';
import ScheduledMetrics from './ScheduledMetrics'; // Importando o novo componente

// Placeholder components for tabs
const ImportCSVTab = () => <CardContent>Implementar Importação de CSV.</CardContent>;
const ScheduledMetricsTab = () => <CardContent>Implementar Agendamento de Métricas.</CardContent>;

export default function AdminDashboard() {
  const { toast } = useToast();
  console.log("AdminDashboard is rendering.");
  return (
    <div className="space-y-6">
      <Card className="shadow-soft-lg border-none rounded-xl">
        <CardHeader>
          <CardTitle className="text-3xl text-[#022D68]">Central de Gerenciamento</CardTitle>
          <CardDescription>Gerencie o conteúdo, usuários e métricas do FilterFood.</CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="upload-master" className="w-full">
        <TabsList className="grid w-full grid-cols-5 h-auto p-1 bg-white shadow-soft-lg rounded-xl">
          <TabsTrigger 
            value="upload-master" 
            className="flex flex-col h-auto py-2 px-1 data-[state=active]:bg-[#022D68] data-[state=active]:text-white"
          >
            <Upload className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium text-center">Upload Master</span>
          </TabsTrigger>
          <TabsTrigger value="manage-plans" className="flex flex-col h-auto py-2 px-1 data-[state=active]:bg-[#022D68] data-[state=active]:text-white">
            <Crown className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium text-center">Gerenciar Planos</span>
          </TabsTrigger>
          <TabsTrigger value="import-csv" className="flex flex-col h-auto py-2 px-1 data-[state=active]:bg-[#022D68] data-[state=active]:text-white">
            <BarChart className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium text-center">Importar CSV</span>
          </TabsTrigger>
          <TabsTrigger value="instant-metrics" className="flex flex-col h-auto py-2 px-1 data-[state=active]:bg-[#022D68] data-[state=active]:text-white">
            <Zap className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium text-center">Métricas Instantâneas</span>
          </TabsTrigger>
          <TabsTrigger value="scheduled-metrics" className="flex flex-col h-auto py-2 px-1 data-[state=active]:bg-[#022D68] data-[state=active]:text-white">
            <Clock className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium text-center">Métricas Agendadas</span>
          </TabsTrigger>
        </TabsList>

        <div className="mt-4">
          <Card className="p-0">
            <TabsContent value="upload-master">
              <AdminUploadInfo />
            </TabsContent>
            <TabsContent value="manage-plans">
              <ManagePlans />
            </TabsContent>
            <TabsContent value="import-csv"><ImportCSVTab /></TabsContent>
            <TabsContent value="instant-metrics"><InstantMetrics /></TabsContent>
            <TabsContent value="scheduled-metrics"><ScheduledMetrics /></TabsContent>
          </Card>
        </div>
      </Tabs>
    </div>
  );
}