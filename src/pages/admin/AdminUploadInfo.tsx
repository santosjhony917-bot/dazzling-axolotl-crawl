import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, MapPin, UtensilsCrossed, Clock, History, Phone } from "lucide-react";
import UploadPhase1 from "@/components/admin/UploadPhase1";
import UploadPhase2 from "@/components/admin/UploadPhase2";
import UploadPhase3Contacts from "@/components/admin/UploadPhase3_Contacts"; // NOVO IMPORT
import UploadPhase4 from "@/components/admin/UploadPhase4"; // Antiga Fase 3
import UploadPhase5 from "@/components/admin/UploadPhase5"; // Antiga Fase 4
import UploadHistory from "@/components/admin/UploadHistory";
import IncompleteRestaurantAlerts from "@/components/admin/IncompleteRestaurantAlerts";
import { cn } from "@/lib/utils";

export default function AdminUploadInfo() {
  const [activeTab, setActiveTab] = useState("phase1");

  return (
    <div className="container mx-auto p-0 space-y-6">
      <Card className="shadow-soft-lg border-none rounded-2xl">
        <CardHeader>
          <CardTitle className="text-3xl text-[#022D68]">Upload de Informações Master</CardTitle>
          <CardDescription>
            Sistema modular de upload de dados de restaurantes em 5 fases.
          </CardDescription>
        </CardHeader>
      </Card>
      
      {/* Alertas de Incompletude (Sempre visível no topo da seção) */}
      <IncompleteRestaurantAlerts />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 h-auto p-1 bg-white shadow-soft-lg rounded-xl">
          <TabsTrigger 
            value="phase1" 
            className={cn(
              "flex flex-col h-auto py-2 px-1 rounded-lg transition-all",
              "data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-soft-md"
            )}
          >
            <Upload className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium text-center">Fase 1: Base</span>
          </TabsTrigger>
          <TabsTrigger 
            value="phase2" 
            className={cn(
              "flex flex-col h-auto py-2 px-1 rounded-lg transition-all",
              "data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-soft-md"
            )}
          >
            <MapPin className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium text-center">Fase 2: Endereços</span>
          </TabsTrigger>
          <TabsTrigger 
            value="phase3" 
            className={cn(
              "flex flex-col h-auto py-2 px-1 rounded-lg transition-all",
              "data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-soft-md"
            )}
          >
            <Phone className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium text-center">Fase 3: Links/Admin</span>
          </TabsTrigger>
          <TabsTrigger 
            value="phase4" 
            className={cn(
              "flex flex-col h-auto py-2 px-1 rounded-lg transition-all",
              "data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-soft-md"
            )}
          >
            <UtensilsCrossed className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium text-center">Fase 4: Cardápio</span>
          </TabsTrigger>
          <TabsTrigger 
            value="phase5" 
            className={cn(
              "flex flex-col h-auto py-2 px-1 rounded-lg transition-all",
              "data-[state=active]:bg-primary data-[state=active]:text-white data-[state=active]:shadow-soft-md"
            )}
          >
            <Clock className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium text-center">Fase 5: Horários</span>
          </TabsTrigger>
        </TabsList>

        <div className="mt-4">
          <Card className="p-0 shadow-none border-none bg-transparent">
            <TabsContent value="phase1">
              <UploadPhase1 />
            </TabsContent>
            <TabsContent value="phase2">
              <UploadPhase2 />
            </TabsContent>
            <TabsContent value="phase3">
              <UploadPhase3Contacts />
            </TabsContent>
            <TabsContent value="phase4">
              <UploadPhase4 />
            </TabsContent>
            <TabsContent value="phase5">
              <UploadPhase5 />
            </TabsContent>
            <TabsContent value="history">
              <UploadHistory />
            </TabsContent>
          </Card>
        </div>
      </Tabs>
    </div>
  );
}