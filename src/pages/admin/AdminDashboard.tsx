import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, ClipboardList } from 'lucide-react';
import GoogleMapsCollector from './GoogleMapsCollector';
import ExportedRestaurants from './ExportedRestaurants';

export default function AdminDashboard() {
  console.log("AdminDashboard is rendering.");
  const [searchParams, setSearchParams] = useSearchParams();
  
  // Se não estiver rodando no localhost, o padrão é mostrar a aba de restaurantes importados (do Supabase)
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const defaultTab = isLocalhost ? 'google-maps' : 'exported-restaurants';
  const currentTab = searchParams.get('tab') || defaultTab;

  const handleTabChange = (val: string) => {
    setSearchParams({ tab: val });
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-none border-none rounded-2xl">
        <CardHeader>
          <CardTitle className="text-3xl text-primary">Central de Gerenciamento</CardTitle>
          <CardDescription>Mapeie estabelecimentos via Google Maps e gerencie os restaurantes da plataforma.</CardDescription>
        </CardHeader>
      </Card>

      <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-2 h-auto p-1 bg-white shadow-none rounded-2xl">
          <TabsTrigger value="google-maps" className="flex flex-col h-auto py-2 px-1 data-[state=active]:bg-primary data-[state=active]:text-white">
            <MapPin className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium text-center">Coleta Google Maps</span>
          </TabsTrigger>
          <TabsTrigger value="exported-restaurants" className="flex flex-col h-auto py-2 px-1 data-[state=active]:bg-primary data-[state=active]:text-white">
            <ClipboardList className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium text-center">Restaurantes Importados</span>
          </TabsTrigger>
        </TabsList>

        <div className="mt-4">
          <Card className="p-0 border-none shadow-none bg-transparent">
            <TabsContent value="google-maps">
              <Card className="p-0">
                <GoogleMapsCollector />
              </Card>
            </TabsContent>
            <TabsContent value="exported-restaurants">
              <Card className="p-0">
                <ExportedRestaurants />
              </Card>
            </TabsContent>
          </Card>
        </div>
      </Tabs>
    </div>
  );
}