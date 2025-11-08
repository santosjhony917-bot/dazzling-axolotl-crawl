"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuthData as useAuth } from "@/context/AuthContext";
import { Restaurant } from "@/types";
import { toast } from "sonner";
import { Loader2, MapPin, Edit } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EditAddressDialog } from "@/components/EditAddressDialog";
import { Skeleton } from "@/components/ui/skeleton";

export default function ProfileSettingsPage() {
  const { user } = useAuth();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAddressDialogOpen, setIsAddressDialogOpen] = useState(false);

  const fetchRestaurant = async () => {
    if (!user) return;

    setLoading(true);
    const { data, error } = await supabase
      .from("restaurants")
      .select("*")
      .eq("user_id", user.id)
      .single();

    if (error && error.code !== "PGRST116") {
      toast.error("Erro ao carregar os dados do restaurante.");
      console.error(error);
    } else {
      setRestaurant(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchRestaurant();
  }, [user]);

  if (loading) {
    return (
      <div className="container mx-auto p-4 md:p-8">
        <div className="space-y-6">
          <Skeleton className="h-8 w-1/3" />
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-1/4" />
              <Skeleton className="h-4 w-1/2" />
            </CardHeader>
            <CardContent className="space-y-4">
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-2/3" />
              <Skeleton className="h-10 w-32" />
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (!restaurant) {
    return (
      <div className="container mx-auto p-4 md:p-8 text-center">
        <p>Nenhum restaurante encontrado para este usuário.</p>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 md:p-8">
      <h1 className="text-3xl font-bold mb-6">Configurações do Perfil</h1>

      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="flex items-center gap-2">
                <MapPin className="h-5 w-5" />
                Endereço
              </CardTitle>
              <CardDescription>
                O endereço onde seu restaurante está localizado.
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" onClick={() => setIsAddressDialogOpen(true)}>
              <Edit className="h-4 w-4 mr-2" />
              Editar
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {restaurant.address ? (
            <div className="text-sm text-muted-foreground">
              <p>{`${restaurant.address}, ${restaurant.number}`}</p>
              <p>{`${restaurant.neighborhood}, ${restaurant.city} - ${restaurant.state}`}</p>
              <p>{`CEP: ${restaurant.cep}`}</p>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              Nenhum endereço cadastrado.
            </p>
          )}
        </CardContent>
      </Card>

      {/* Other settings cards can go here */}

      {restaurant && (
        <EditAddressDialog
          open={isAddressDialogOpen}
          onOpenChange={setIsAddressDialogOpen}
          restaurant={restaurant}
          onSuccess={fetchRestaurant}
        />
      )}
    </div>
  );
}