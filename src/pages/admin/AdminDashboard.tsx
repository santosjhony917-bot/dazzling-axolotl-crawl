import React from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MapPin, Users, ClipboardList } from 'lucide-react';
import GoogleMapsCollector from './GoogleMapsCollector';
import FreelancerMonitor from './FreelancerMonitor';
import ExportedRestaurants from './ExportedRestaurants';

export default function AdminDashboard() {
  console.log("AdminDashboard is rendering.");
  const [searchParams, setSearchParams] = useSearchParams();
  const currentTab = searchParams.get('tab') || 'google-maps';

  const handleTabChange = (val: string) => {
    setSearchParams({ tab: val });
  };

  return (
    <div className="space-y-6">
      <Card className="shadow-soft-lg border-none rounded-xl">
        <CardHeader>
          <CardTitle className="text-3xl text-[#022D68]">Central de Gerenciamento</CardTitle>
          <CardDescription>Mapeie estabelecimentos via Google Places API, acompanhe a fila de missões e monitore os freelancers.</CardDescription>
        </CardHeader>
      </Card>

      <Tabs value={currentTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-3 h-auto p-1 bg-white shadow-soft-lg rounded-xl">
          <TabsTrigger value="google-maps" className="flex flex-col h-auto py-2 px-1 data-[state=active]:bg-[#022D68] data-[state=active]:text-white">
            <MapPin className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium text-center">Coleta Google Maps</span>
          </TabsTrigger>
          <TabsTrigger value="exported-restaurants" className="flex flex-col h-auto py-2 px-1 data-[state=active]:bg-[#022D68] data-[state=active]:text-white">
            <ClipboardList className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium text-center">Restaurantes Exportados</span>
          </TabsTrigger>
          <TabsTrigger value="freelancer-monitor" className="flex flex-col h-auto py-2 px-1 data-[state=active]:bg-[#022D68] data-[state=active]:text-white">
            <Users className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium text-center">Monitor Freelancer</span>
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
            <TabsContent value="freelancer-monitor">
              <Card className="p-0">
                <FreelancerMonitor />
              </Card>
            </TabsContent>
          </Card>
        </div>
      </Tabs>
    </div>
  );
}