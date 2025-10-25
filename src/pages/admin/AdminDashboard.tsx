import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Upload, DollarSign, Zap, Clock, BarChart } from 'lucide-react';
import AdminUploadInfo from './AdminUploadInfo'; // Importando o novo componente

// Placeholder components for tabs
const ImportCSVTab = () => <CardContent>Implementar Importação de CSV.</CardContent>;
const ManagePlansTab = () => <CardContent>Implementar Gerenciamento de Planos (Free/Premium).</CardContent>;
const InstantMetricsTab = () => <CardContent>Implementar Ajustes de Métricas Instantâneas.</CardContent>;
const ScheduledMetricsTab = () => <CardContent>Implementar Agendamento de Métricas.</CardContent>;

export default function AdminDashboard() {
  console.log("AdminDashboard is rendering.");
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl text-[#022D68]">Central de Gerenciamento</CardTitle>
          <CardDescription>Gerencie o conteúdo, usuários e métricas do FilterFood.</CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="upload-master" className="w-full">
        <TabsList className="grid w-full grid-cols-5 h-auto p-1 bg-white shadow-md rounded-xl">
          <TabsTrigger value="upload-master" className="flex flex-col h-auto py-2 px-1 data-[state=active]:bg-[#022D68] data-[state=active]:text-white">
            <Upload className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium text-center">Upload Master</span>
          </TabsTrigger>
          <TabsTrigger value="import-csv" className="flex flex-col h-auto py-2 px-1 data-[state=active]:bg-[#022D68] data-[state=active]:text-white">
            <BarChart className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium text-center">Importar CSV</span>
          </TabsTrigger>
          <TabsTrigger value="manage-plans" className="flex flex-col h-auto py-2 px-1 data-[state=active]:bg-[#022D68] data-[state=active]:text-white">
            <DollarSign className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium text-center">Gerenciar Planos</span>
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
              {/* Usando o novo componente de página para o Upload Master */}
              <AdminUploadInfo />
            </TabsContent>
            <TabsContent value="import-csv"><ImportCSVTab /></TabsContent>
            <TabsContent value="manage-plans"><ManagePlansTab /></TabsContent>
            <TabsContent value="instant-metrics"><InstantMetricsTab /></TabsContent>
            <TabsContent value="scheduled-metrics"><ScheduledMetricsTab /></TabsContent>
          </Card>
        </div>
      </Tabs>
    </div>
  );
}