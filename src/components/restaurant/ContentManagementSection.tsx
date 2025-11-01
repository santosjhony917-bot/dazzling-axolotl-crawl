import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Utensils, Image, CreditCard, Link } from 'lucide-react';
import NavCardItem from '@/components/NavCardItem';
import { useNavigate } from 'react-router-dom';
import { showError } from '@/utils/toast';

interface ContentManagementSectionProps {
  navigate: ReturnType<typeof useNavigate>;
  isPremium: boolean;
  restaurantId: string;
  restaurantName: string;
  setIsPaymentMethodsDialogOpen: (open: boolean) => void;
}

const ContentManagementSection: React.FC<ContentManagementSectionProps> = ({
  navigate,
  isPremium,
  restaurantId,
  restaurantName,
  setIsPaymentMethodsDialogOpen,
}) => {
  
  const handlePaymentMethodsClick = () => {
    if (!isPremium) {
      showError("Recurso Premium. Faça upgrade para desbloquear a gestão de formas de pagamento.");
      return;
    }
    setIsPaymentMethodsDialogOpen(true);
  };
  
  const handleSocialNetworksClick = () => {
    if (!isPremium) {
      showError("Recurso Premium. Faça upgrade para desbloquear a gestão de redes sociais.");
      return;
    }
    navigate(`/restaurant-area/settings/social-networks`);
  };

  return (
    <Card className="shadow-soft-lg border-none rounded-xl bg-white">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl text-[#022D68]">
          <Utensils className="w-6 h-6" /> Gestão de Conteúdo
        </CardTitle>
        <CardDescription>Gerencie o menu, galeria de fotos e outras informações públicas do seu restaurante.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        
        <NavCardItem
          title="Menu Digital"
          description="Organize categorias e itens do seu cardápio."
          icon={Utensils} // Corrigido: Passando o componente
          onClick={() => navigate(`/restaurant-area/menu/${restaurantId}`)}
        />
        
        <NavCardItem
          title="Galeria de Fotos"
          description="Adicione fotos de pratos e do ambiente."
          icon={Image} // Corrigido: Passando o componente
          onClick={() => navigate(`/restaurant-area/gallery/${restaurantId}`)}
        />
        
        <NavCardItem
          title="Formas de Pagamento"
          description="Defina as formas de pagamento aceitas."
          icon={CreditCard} // Corrigido: Passando o componente
          onClick={handlePaymentMethodsClick}
          isLocked={!isPremium}
        />
        
        <NavCardItem
          title="Redes Sociais"
          description="Adicione links para Instagram, Facebook, etc."
          icon={Link} // Corrigido: Passando o componente
          onClick={handleSocialNetworksClick}
          isLocked={!isPremium}
        />
        
      </CardContent>
    </Card>
  );
};

export default ContentManagementSection;