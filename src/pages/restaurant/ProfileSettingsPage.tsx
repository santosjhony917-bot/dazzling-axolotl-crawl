"use client";

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/integrations/supabase/auth/AuthContext";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Loader2, ChevronRight, Mail, Phone, Eye, Edit, MapPin } from "lucide-react";
import { EditAddressDialog } from "@/components/EditAddressDialog";
import { toast } from "sonner";

export default function ProfileSettingsPage() {
  const { user } = useAuth();
  const [restaurant, setRestaurant] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAddressDialogOpen, setIsAddressDialogOpen] = useState(false);

  const fetchRestaurant = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("restaurants")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error && error.code !== 'PGRST116') { // PGRST116: 'exact one row not found'
      console.error("Error fetching restaurant:", error);
      toast.error("Erro ao carregar os dados do restaurante.");
    } else {
      setRestaurant(data);
    }
    setLoading(false);
  }, [user]);

  useEffect(() => {
    fetchRestaurant();
  }, [fetchRestaurant]);

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-80px)] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="container mx-auto max-w-4xl py-8 px-4 text-center">
        <p>Restaurante não encontrado.</p>
        <Button asChild className="mt-4">
          <Link to="/restaurant-area/register">Cadastrar Restaurante</Link>
        </Button>
      </div>
    );
  }

  const { email, phone, address, number, neighborhood, city, state } = restaurant;
  const fullAddress = [address, number, neighborhood, city, state].filter(Boolean).join(', ');

  return (
    <>
      <div className="container mx-auto max-w-4xl py-8 px-4">
        <h1 className="text-2xl font-bold mb-6">Configurações do Perfil</h1>
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Informações de Contato</CardTitle>
              <CardDescription>Seus dados de contato principais.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Mail className="mr-3 h-5 w-5 text-muted-foreground" />
                  <span>{email || "Não informado"}</span>
                </div>
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Phone className="mr-3 h-5 w-5 text-muted-foreground" />
                  <span>{phone || "Não informado"}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Endereço</CardTitle>
                <CardDescription>Onde seu restaurante está localizado.</CardDescription>
              </div>
              <Button variant="outline" size="sm" onClick={() => setIsAddressDialogOpen(true)}>
                <Edit className="mr-2 h-4 w-4" />
                Editar
              </Button>
            </CardHeader>
            <CardContent>
              <div className="flex items-start">
                <MapPin className="mr-3 h-5 w-5 flex-shrink-0 text-muted-foreground mt-1" />
                <span>{fullAddress || "Endereço não cadastrado."}</span>
              </div>
            </CardContent>
          </Card>

          <Button asChild variant="outline" className="w-full">
            <Link to={`/restaurante/${restaurant.id}`}>
              <Eye className="mr-2 h-4 w-4" />
              Ver Perfil Público
              <ChevronRight className="ml-auto h-4 w-4" />
            </Link>
          </Button>
        </div>
      </div>

      <EditAddressDialog
        open={isAddressDialogOpen}
        onOpenChange={setIsAddressDialogOpen}
        restaurant={restaurant}
        onSuccess={fetchRestaurant}
      />
    </>
  );
}