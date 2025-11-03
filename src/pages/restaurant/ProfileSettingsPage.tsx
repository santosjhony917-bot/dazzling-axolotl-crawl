"use client";

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { RestaurantForm } from '@/components/restaurant/RestaurantForm';
import { DeleteRestaurantDialog } from '@/components/restaurant/DeleteRestaurantDialog';
import { GalleryDialog } from '@/components/restaurant/GalleryDialog';
import { OpeningHoursDialog } from '@/components/restaurant/OpeningHoursDialog';
import PaymentMethodsDialog from '@/components/restaurant/PaymentMethodsDialog'; // Importação corrigida (default export)
import SocialNetworksDialog from '@/components/restaurant/SocialNetworksDialog';
import { SalesChannelsDialog } from '@/components/restaurant/SalesChannelsDialog';
import { WeekSchedule, Restaurant } from '@/types'; // Importando de '@/types'

interface ProfileSettingsPageProps {
  restaurant: Restaurant;
  onRestaurantUpdated: () => void;
}

export default function ProfileSettingsPage({ restaurant, onRestaurantUpdated }: ProfileSettingsPageProps) {
  const [isSalesChannelsDialogOpen, setIsSalesChannelsDialogOpen] = useState(false);
  const [isSocialNetworksDialogOpen, setIsSocialNetworksDialogOpen] = useState(false);
  const [isGalleryDialogOpen, setIsGalleryDialogOpen] = useState(false);
  const [isOpeningHoursDialogOpen, setIsOpeningHoursDialogOpen] = useState(false);
  const [isPaymentMethodsDialogOpen, setIsPaymentMethodsDialogOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium">Configurações do Perfil</h3>
        <p className="text-sm text-muted-foreground">
          Gerencie as informações básicas do seu restaurante.
        </p>
      </div>
      <Separator />
      <RestaurantForm restaurant={restaurant} onRestaurantUpdated={onRestaurantUpdated} />

      <Card>
        <CardHeader>
          <CardTitle>Canais de Venda</CardTitle>
          <CardDescription>
            Configure os links para seus canais de venda como WhatsApp, iFood e outros.
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
            Adicione links para suas redes sociais.
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
            Gerencie as imagens da galeria do seu restaurante.
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
            Defina os horários de funcionamento do seu restaurante para cada dia da semana.
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
            Gerencie os métodos de pagamento aceitos pelo seu restaurante.
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
            Esta ação é irreversível. Todos os dados do seu restaurante serão permanentemente removidos.
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
          restaurantId={restaurant.id} // Propriedade 'restaurantId' adicionada
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