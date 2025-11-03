"use client";

import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ChevronLeft, Save, Trash2, Upload, PlusCircle, Edit } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import SalesChannelsDialog from "@/components/restaurant/SalesChannelsDialog"; // Importe o componente

interface Restaurant {
  id: string;
  user_id: string;
  name: string;
  description?: string;
  image_url?: string;
  cover_image_url?: string;
  plan: "free" | "basic" | "premium";
  phone?: string;
  email?: string;
  cnpj?: string;
  category?: string;
  whatsapp_url?: string;
  ifood_url?: string;
  other_url?: string;
  other_url_label?: string; // Adicionado para o novo campo
  external_url?: string;
  address?: string;
  number?: string;
  neighborhood?: string;
  city?: string;
  state?: string;
  cep?: string;
  latitude?: number;
  longitude?: number;
  opening_hours?: any; // Considerar um tipo mais específico
  followers_override?: number;
  payment_methods?: any; // Considerar um tipo mais específico
  social_networks?: any[]; // Considerar um tipo mais específico
  other_url_label?: string;
}

const AdminEditRestaurant = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [isSalesChannelsDialogOpen, setIsSalesChannelsDialogOpen] = useState(false);
  const [isUpdatingSalesChannels, setIsUpdatingSalesChannels] = useState(false);

  const { data: restaurantData, isLoading: isLoadingRestaurant } = useQuery<Restaurant>({
    queryKey: ["restaurant", id],
    queryFn: async () => {
      if (!id) throw new Error("Restaurant ID is missing.");
      const { data, error } = await supabase
        .from("restaurants")
        .select("*")
        .eq("id", id)
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!id,
  });

  useEffect(() => {
    if (restaurantData) {
      setRestaurant(restaurantData);
    }
  }, [restaurantData]);

  const handleSaveSalesChannels = async (updatedChannels: Partial<Restaurant>) => {
    if (!restaurant?.id) return;

    setIsUpdatingSalesChannels(true);
    const { error } = await supabase
      .from("restaurants")
      .update(updatedChannels)
      .eq("id", restaurant.id);

    if (error) {
      toast.error("Erro ao atualizar canais de venda.");
      console.error("Error updating sales channels:", error);
    } else {
      toast.success("Canais de venda atualizados com sucesso!");
      queryClient.invalidateQueries({ queryKey: ["restaurant", id] }); // Invalida a query para refetch
      setIsSalesChannelsDialogOpen(false); // Fecha o modal após salvar
    }
    setIsUpdatingSalesChannels(false);
  };

  if (isLoadingRestaurant || !restaurant) {
    return <div>Carregando dados do restaurante...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-2xl font-bold">Editar Restaurante: {restaurant.name}</h1>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Canais de Venda e Links</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">
            Gerencie os links para os canais de venda e outras redes do restaurante.
          </p>
          <Button onClick={() => setIsSalesChannelsDialogOpen(true)}>
            <Edit className="mr-2 h-4 w-4" /> Editar Canais
          </Button>
        </CardContent>
      </Card>

      {isSalesChannelsDialogOpen && restaurant && (
        <SalesChannelsDialog
          isOpen={isSalesChannelsDialogOpen}
          onClose={() => setIsSalesChannelsDialogOpen(false)}
          restaurant={restaurant} // Passa o objeto restaurant completo
          onSave={handleSaveSalesChannels}
          // isLoading={isUpdatingSalesChannels} // Removido, pois não é uma prop do componente
        />
      )}

      {/* Outras seções de edição do restaurante aqui */}
    </div>
  );
};

export default AdminEditRestaurant;