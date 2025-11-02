import React, { useState } from 'react';
import { Utensils, Camera, Link, CreditCard, Share2, Clock } from 'lucide-react';
import NavCardItem from '@/components/NavCardItem';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils/url';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface ContentManagementSectionProps {
  restaurantId: string;
  isPremium: boolean;
}

const ContentManagementSection: React.FC<ContentManagementSectionProps> = ({ restaurantId, isPremium }) => {
  const navigate = useNavigate();
  const [isPaymentMethodsDialogOpen, setIsPaymentMethodsDialogOpen] = useState(false);
  const [isSocialNetworksDialogOpen, setIsSocialNetworksDialogOpen] = useState(false);

  const handleNavigate = (path: string, requiresPremium: boolean) => {
    if (requiresPremium && !isPremium) {
      navigate(createPageUrl('restaurant-area-upgrade'));
    } else {
      navigate(path);
    }
  };

  return (
    <section className="space-y-4">
      <h2 className="text-xl font-bold text-primary">Gerenciamento de Conteúdo</h2>
      <NavCardItem
        icon={Utensils}
        title="Ver Perfil Público"
        description="Veja como seu restaurante aparece para os clientes."
        onClick={() => navigate(createPageUrl('restaurantProfile', { restaurantId: restaurantId }))}
      />
      <NavCardItem
        icon={Utensils}
        title="Cardápio"
        description="Gerencie categorias e itens do seu menu."
        onClick={() => handleNavigate(createPageUrl('restaurant-area-menu'), false)}
      />
      <NavCardItem
        icon={Camera}
        title="Galeria de Fotos"
        description="Adicione e organize as fotos do seu restaurante."
        isLocked={!isPremium}
        onClick={() => handleNavigate(createPageUrl('restaurant-area-gallery'), true)}
      />
      <NavCardItem
        icon={CreditCard}
        title="Métodos de Pagamento"
        description="Configure as formas de pagamento aceitas."
        onClick={() => setIsPaymentMethodsDialogOpen(true)}
      />
      <NavCardItem
        icon={Share2}
        title="Redes Sociais"
        description="Conecte suas redes sociais e outras plataformas."
        isLocked={!isPremium}
        onClick={() => handleNavigate(createPageUrl('restaurant-area-social-media'), true)}
      />
      <NavCardItem
        icon={Clock}
        title="Horário de Funcionamento"
        description="Defina os horários de abertura e fechamento."
        onClick={() => handleNavigate(createPageUrl('restaurant-area-opening-hours'), false)}
      />

      {/* Payment Methods Dialog */}
      <Dialog open={isPaymentMethodsDialogOpen} onOpenChange={setIsPaymentMethodsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Métodos de Pagamento</DialogTitle>
            <DialogDescription>
              Gerencie os métodos de pagamento aceitos pelo seu restaurante.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="card" className="text-right">
                Cartão
              </Label>
              <Input id="card" value="Crédito, Débito" className="col-span-3" readOnly />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="cash" className="text-right">
                Dinheiro
              </Label>
              <Input id="cash" value="Sim" className="col-span-3" readOnly />
            </div>
          </div>
          <Button onClick={() => setIsPaymentMethodsDialogOpen(false)}>Salvar</Button>
        </DialogContent>
      </Dialog>

      {/* Social Networks Dialog */}
      <Dialog open={isSocialNetworksDialogOpen} onOpenChange={setIsSocialNetworksDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Redes Sociais</DialogTitle>
            <DialogDescription>
              Conecte suas redes sociais e outras plataformas.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="whatsapp" className="text-right">
                WhatsApp
              </Label>
              <Input id="whatsapp" value="link-do-whatsapp" className="col-span-3" />
            </div>
            <div className="grid grid-cols-4 items-center gap-4">
              <Label htmlFor="instagram" className="text-right">
                Instagram
              </Label>
              <Input id="instagram" value="link-do-instagram" className="col-span-3" />
            </div>
          </div>
          <Button onClick={() => setIsSocialNetworksDialogOpen(false)}>Salvar</Button>
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default ContentManagementSection;