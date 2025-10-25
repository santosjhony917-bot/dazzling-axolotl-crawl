import React, { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, MapPin, UtensilsCrossed, Clock, History } from "lucide-react";
import UploadPhase1 from "@/components/admin/UploadPhase1";
import UploadPhase2 from "@/components/admin/UploadPhase2";
import UploadPhase3 from "@/components/admin/UploadPhase3";
import UploadPhase4 from "@/components/admin/UploadPhase4";
import UploadHistory from "@/components/admin/UploadHistory"; // NOVO IMPORT

export default function AdminUploadInfo() {
  const [activeTab, setActiveTab] = useState("phase1");

  return (
    <div className="container mx-auto p-0 space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-3xl text-[#022D68]">Upload de Informações Master</CardTitle>
          <CardDescription>
            Sistema modular de upload de dados de restaurantes em 4 fases.
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5 h-auto p-1 bg-white shadow-md rounded-xl">
          <TabsTrigger value="phase1" className="flex flex-col h-auto py-2 px-1 data-[state=active]:bg-[#022D68] data-[state=active]:text-white">
            <Upload className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium text-center">Fase 1: Info Gerais</span>
          </TabsTrigger>
          <TabsTrigger value="phase2" className="flex flex-col h-auto py-2 px-1 data-[state=active]:bg-[#022D68] data-[state=active]:text-white">
            <MapPin className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium text-center">Fase 2: Endereços</span>
          </TabsTrigger>
          <TabsTrigger value="phase3" className="flex flex-col h-auto py-2 px-1 data-[state=active]:bg-[#022D68] data-[state=active]:text-white">
            <UtensilsCrossed className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium text-center">Fase 3: Cardápio</span>
          </TabsTrigger>
          <TabsTrigger value="phase4" className="flex flex-col h-auto py-2 px-1 data-[state=active]:bg-[#022D68] data-[state=active]:text-white">
            <Clock className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium text-center">Fase 4: Horários</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="flex flex-col h-auto py-2 px-1 data-[state=active]:bg-[#022D68] data-[state=active]:text-white">
            <History className="w-5 h-5 mb-1" />
            <span className="text-xs font-medium text-center">Histórico</span>
          </TabsTrigger>
        </TabsList>

        <div className="mt-4">
          <TabsContent value="phase1">
            <UploadPhase1 />
          </TabsContent>
          <TabsContent value="phase2">
            <UploadPhase2 />
          </TabsContent>
          <TabsContent value="phase3">
            <UploadPhase3 />
          </TabsContent>
          <TabsContent value="phase4">
            <UploadPhase4 />
          </TabsContent>
          <TabsContent value="history">
            <UploadHistory />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}