import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Utensils, MapPin, Menu, Image, CheckCircle } from 'lucide-react';
import UploadPhase1 from '@/components/admin/UploadPhase1';
import UploadPhase2 from '@/components/admin/UploadPhase2';
import UploadPhase3 from '@/components/admin/UploadPhase3';
import UploadPhase4 from '@/components/admin/UploadPhase4';
import UploadPhase5 from '@/components/admin/UploadPhase5';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';

// Tipos de dados para o processo de upload
interface RestaurantData {
  name: string;
  category: string;
  external_url: string;
  description: string;
  // Phase 2
  address: string;
  latitude: number | null;
  longitude: number | null;
  // Phase 3
  menu_items: any[];
  // Phase 4
  gallery_images: any[];
  // Phase 5
  restaurant_id: string | null;
}

const initialRestaurantData: RestaurantData = {
  name: '',
  category: '',
  external_url: '',
  description: '',
  address: '',
  latitude: null,
  longitude: null,
  menu_items: [],
  gallery_images: [],
  restaurant_id: null,
};

const AdminUploadInfo: React.FC = () => {
  const [activeTab, setActiveTab] = useState('phase1');
  const [restaurantData, setRestaurantData] = useState<RestaurantData>(initialRestaurantData);

  const handleNextPhase = (phase: number, data: Partial<RestaurantData>) => {
    setRestaurantData(prev => ({ ...prev, ...data }));
    
    if (phase === 1) setActiveTab('phase2');
    if (phase === 2) setActiveTab('phase3');
    if (phase === 3) setActiveTab('phase4');
    if (phase === 4) setActiveTab('phase5');
    if (phase === 5) setActiveTab('complete');
  };

  const handleReset = () => {
    setRestaurantData(initialRestaurantData);
    setActiveTab('phase1');
  };

  const getTabStatus = (phase: number) => {
    const currentPhase = parseInt(activeTab.replace('phase', '')) || 6;
    if (phase < currentPhase) return 'completed';
    if (phase === currentPhase) return 'active';
    return 'pending';
  };

  const renderTabIcon = (phase: number, Icon: React.ElementType) => {
    const status = getTabStatus(phase);
    if (status === 'completed') {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    }
    return <Icon className={`w-5 h-5 ${status === 'active' ? 'text-white' : 'text-gray-500'}`} />;
  };

  return (
    <CardContent className="p-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-5 h-auto p-1 bg-gray-100 rounded-xl mb-6">
          <TabsTrigger value="phase1" className="flex flex-col h-auto py-2 px-1 data-[state=active]:bg-[#022D68] data-[state=active]:text-white">
            {renderTabIcon(1, Utensils)}
            <span className="text-xs font-medium text-center mt-1">Dados Básicos</span>
          </TabsTrigger>
          <TabsTrigger value="phase2" disabled={getTabStatus(1) === 'pending'} className="flex flex-col h-auto py-2 px-1 data-[state=active]:bg-[#022D68] data-[state=active]:text-white">
            {renderTabIcon(2, MapPin)}
            <span className="text-xs font-medium text-center mt-1">Localização</span>
          </TabsTrigger>
          <TabsTrigger value="phase3" disabled={getTabStatus(2) === 'pending'} className="flex flex-col h-auto py-2 px-1 data-[state=active]:bg-[#022D68] data-[state=active]:text-white">
            {renderTabIcon(3, Menu)}
            <span className="text-xs font-medium text-center mt-1">Cardápio</span>
          </TabsTrigger>
          <TabsTrigger value="phase4" disabled={getTabStatus(3) === 'pending'} className="flex flex-col h-auto py-2 px-1 data-[state=active]:bg-[#022D68] data-[state=active]:text-white">
            {renderTabIcon(4, Image)}
            <span className="text-xs font-medium text-center mt-1">Galeria</span>
          </TabsTrigger>
          <TabsTrigger value="phase5" disabled={getTabStatus(4) === 'pending'} className="flex flex-col h-auto py-2 px-1 data-[state=active]:bg-[#022D68] data-[state=active]:text-white">
            {renderTabIcon(5, CheckCircle)}
            <span className="text-xs font-medium text-center mt-1">Finalizar</span>
          </TabsTrigger>
        </TabsList>

        <div className="p-4 border rounded-xl shadow-soft-sm bg-white">
          <TabsContent value="phase1">
            <UploadPhase1 
              onNext={(data) => handleNextPhase(1, data)} 
              initialData={restaurantData} 
            />
          </TabsContent>
          <TabsContent value="phase2">
            <UploadPhase2 
              onNext={(data) => handleNextPhase(2, data)} 
              initialData={restaurantData} 
            />
          </TabsContent>
          <TabsContent value="phase3">
            <UploadPhase3 
              onNext={(data) => handleNextPhase(3, data)} 
              initialData={restaurantData} 
            />
          </TabsContent>
          <TabsContent value="phase4">
            <UploadPhase4 
              onNext={(data) => handleNextPhase(4, data)} 
              initialData={restaurantData} 
            />
          </TabsContent>
          <TabsContent value="phase5">
            <UploadPhase5 
              onNext={(data) => handleNextPhase(5, data)} 
              initialData={restaurantData} 
              onReset={handleReset}
            />
          </TabsContent>
          <TabsContent value="complete">
            <div className="text-center py-12">
              <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-[#022D68]">Processo de Upload Concluído!</h2>
              <p className="text-gray-600 mt-2">O restaurante foi criado com sucesso.</p>
              <Separator className="my-6" />
              <Button onClick={handleReset} className="bg-highlight hover:bg-highlight/90">
                Iniciar Novo Upload
              </Button>
            </div>
          </TabsContent>
        </div>
      </Tabs>
    </CardContent>
  );
};

export default AdminUploadInfo;