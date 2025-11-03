"use client";

import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { RestaurantForm } from '@/components/restaurant/RestaurantForm';
import { DeleteRestaurantDialog } from '@/components/restaurant/DeleteRestaurantDialog';
import { GalleryDialog } from '@/components/restaurant/GalleryDialog';
import { OpeningHoursDialog } from '@/components/restaurant/OpeningHoursDialog';
import { PaymentMethodsDialog } from '@/components/restaurant/PaymentMethodsDialog';
import SocialNetworksDialog from '@/components/restaurant/SocialNetworksDialog';
import { SalesChannelsDialog } from '@/components/restaurant/SalesChannelsDialog'; // Importação corrigida
import { toast } from 'sonner';
import { supabase } from '@/integrations/supabase/client';
import { WeekSchedule, Restaurant } from '@/types'; // Importando tipos

export default function AdminEditRestaurant() {
  const { id } = useParams<{ id: string }>();
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [isSalesChannelsDialogOpen, setIsSalesChannelsDialogOpen] = useState(false);
  const [isSocialNetworksDialogOpen, setIsSocialNetworksDialogOpen] = useState(false);
  const [isGalleryDialogOpen, setIsGalleryDialogOpen] = useState(false);
  const [isOpeningHoursDialogOpen, setIsOpeningHoursDialogOpen] = useState(false);
  const [isPaymentMethodsDialogOpen, setIsPaymentMethodsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  const fetchRestaurant = async () => {
    if (!id) return;
    const { data, error } = await supabase
      .from('restaurants')
      .select('*')
      .eq('id', id)
      .single();

    if (error) {
      toast.error('Erro ao carregar restaurante.');
      console.error(error);
    } else {
      setRestaurant(data);
    }
  };

  useEffect(() => {
    fetchRestaurant();
  }, [id]);

  if (!restaurant) {
    return <div>Carregando...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Editar Restaurante: {restaurant.name}</h3>
        <p className="text-sm text-muted-foreground">
          Gerencie as informações detalhadas do restaurante.
        </p>
      </div>
      <Separator />
      <RestaurantForm restaurant={restaurant} onRestaurantUpdated={fetchRestaurant} />

      <Card>
        <CardHeader>
          <CardTitle>Canais de Venda</CardTitle>
          <CardDescription>
            Configure os links para os canais de venda do restaurante como WhatsApp, iFood e outros.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setIsSalesChannelsDialogOpen(true)}>Editar Canais de Venda</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Redes Sociais</CardTitle>
          <CardDescription>
            Adicione links para as redes sociais do restaurante.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setIsSocialNetworksDialogOpen(true)}>Editar Redes Sociais</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Galeria de Imagens</CardTitle>
          <CardDescription>
            Gerencie as imagens da galeria do restaurante.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setIsGalleryDialogOpen(true)}>Editar Galeria</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Horário de Funcionamento</CardTitle>
          <CardDescription>
            Defina os horários de funcionamento do restaurante para cada dia da semana.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setIsOpeningHoursDialogOpen(true)}>Editar Horário</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Métodos de Pagamento</CardTitle>
          <CardDescription>
            Gerencie os métodos de pagamento aceitos pelo restaurante.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={() => setIsPaymentMethodsDialogOpen(true)}>Editar Métodos de Pagamento</Button>
        </CardContent>
      </Card>

      <Card className="border-destructive">
        <CardHeader>
          <CardTitle className="text-destructive">Excluir Restaurante</CardTitle>
          <CardDescription>
            Esta ação é irreversível. Todos os dados do restaurante serão permanentemente removidos.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button variant="destructive" onClick={() => setIsDeleteDialogOpen(true)}>Excluir Restaurante</Button>
        </CardContent>
      </Card>

      <SalesChannelsDialog
        isOpen={isSalesChannelsDialogOpen}
        onClose={() => setIsSalesChannelsDialogOpen(false)}
        restaurantId={restaurant.id}
      />
      {isSocialNetworksDialogOpen && (
        <SocialNetworksDialog
          isOpen={isSocialNetworksDialogOpen}
          onClose={() => setIsSocialNetworksDialogOpen(false)}
          restaurantId={restaurant.id}
        />
      )}
      {isGalleryDialogOpen && (
        <GalleryDialog
          isOpen={isGalleryDialogOpen}
          onClose={() => setIsGalleryDialogOpen(false)}
          restaurantId={restaurant.id}
        />
      )}
      {isOpeningHoursDialogOpen && (
        <OpeningHoursDialog
          isOpen={isOpeningHoursDialogOpen}
          onClose={() => setIsOpeningHoursDialogOpen(false)}
          restaurantId={restaurant.id}
          initialOpeningHours={restaurant.opening_hours || {} as WeekSchedule}
        />
      )}
      {isPaymentMethodsDialogOpen && (
        <PaymentMethodsDialog
          isOpen={isPaymentMethodsDialogOpen}
          onClose={() => setIsPaymentMethodsDialogOpen(false)}
          restaurantId={restaurant.id}
          initialPaymentMethods={restaurant.payment_methods || []}
        />
      )}
      {isDeleteDialogOpen && (
        <DeleteRestaurantDialog
          isOpen={isDeleteDialogOpen}
          onClose={() => setIsDeleteDialogOpen(false)}
          restaurantId={restaurant.id}
        />
      )}
    </div>
  );
}