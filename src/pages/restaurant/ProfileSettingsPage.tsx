"use client";

import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { ChevronLeft, Edit, Trash2 } from "lucide-react";
import SalesChannelsDialog from "@/components/restaurant/SalesChannelsDialog"; // Importe o componente

interface Restaurant {
  id: string;
  name: string;
  description?: string;
  image_url?: string;
  cover_image_url?: string;
  whatsapp_url?: string;
  ifood_url?: string;
  other_url?: string;
  other_url_label?: string; // Adicionado para o novo campo
  external_url?: string; // Mantido para outros usos, mas não no SalesChannelsDialog
  // ... outras propriedades do restaurante
}

const ProfileSettingsPage = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [user, setUser] = useState<any>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [isSalesChannelsDialogOpen, setIsSalesChannelsDialogOpen] = useState(false);
  const [isUpdatingSalesChannels, setIsUpdatingSalesChannels] = useState(false);

  useEffect(() => {
    const getSession = async () => {
      const { data, error } = await supabase.auth.getSession();
      if (error) {
        console.error("Error getting session:", error);
        navigate("/login");
      } else if (data?.session) {
        setUser(data.session.user);
      } else {
        navigate("/login");
      }
    };
    getSession();
  }, [navigate]);

  const { data: restaurantData, isLoading: isLoadingRestaurant } = useQuery<Restaurant>({
    queryKey: ["restaurant", user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from("restaurants")
        .select("*")
        .eq("user_id", user.id)
        .single();
      if (error) throw new Error(error.message);
      return data;
    },
    enabled: !!user,
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
      queryClient.invalidateQueries({ queryKey: ["restaurant", user?.id] }); // Invalida a query para refetch
      setIsSalesChannelsDialogOpen(false); // Fecha o modal após salvar
    }
    setIsUpdatingSalesChannels(false);
  };

  if (isLoadingRestaurant || !restaurant) {
    return <div>Carregando configurações do perfil...</div>;
  }

  return (
    <div className="container mx-auto p-4">
      <div className="flex items-center gap-4 mb-6">
        <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
          <ChevronLeft className="h-6 w-6" />
        </Button>
        <h1 className="text-2xl font-bold">Configurações do Perfil</h1>
      </div>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Ver Perfil Público</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">
            Veja como {restaurant.name} aparece para os clientes
          </p>
          <Button asChild>
            <Link to={`/restaurant/${restaurant.id}`}>Ver Perfil</Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Canais de Venda e Links</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500 mb-4">
            Gerencie os links para seus canais de venda e outras redes.
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

      {/* Outras seções de configuração aqui */}
    </div>
  );
};

export default ProfileSettingsPage;