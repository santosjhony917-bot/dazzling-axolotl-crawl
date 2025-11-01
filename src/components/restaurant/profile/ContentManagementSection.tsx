import React from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Utensils, Image, CreditCard, Link, Eye, Camera } from 'lucide-react';
import NavCardItem from '@/components/NavCardItem';
import { useNavigate } from 'react-router-dom';
import { showError } from '@/utils/toast';
// import { createPageUrl } from '@/lib/router'; // Importação removida

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
  
  // Função auxiliar para navegação e verificação premium
  const handleNavigate = (path: string, requiresPremium: boolean) => {
    if (requiresPremium && !isPremium) {
      showError("Recurso Premium. Faça upgrade para desbloquear.");
      return;
    }
    navigate(path);
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
          title="Ver Perfil Público"
          description={`Veja como ${restaurantName} aparece para os clientes.`}
          icon={Eye} 
          // Usando caminho literal, pois createPageUrl não está disponível
          onClick={() => navigate(`/restaurant/${restaurantId}`)} 
        />
        
        <NavCardItem
          title="Menu Digital"
          description="Adicione, edite e organize pratos e categorias."
          icon={Utensils} 
          onClick={() => handleNavigate(`/restaurant-area/menu/${restaurantId}`, false)}
        />
        
        <NavCardItem
          title="Galeria de Fotos"
          description="Gerencie as imagens do seu restaurante."
          icon={Camera} 
          onClick={() => handleNavigate(`/restaurant-area/gallery/${restaurantId}`, true)}
          isLocked={!isPremium}
        />
        
        <NavCardItem
          title="Formas de Pagamento"
          description="Defina quais métodos de pagamento você aceita."
          icon={CreditCard} 
          onClick={() => {
            if (!isPremium) {
              showError("Recurso Premium. Faça upgrade para desbloquear a gestão de formas de pagamento.");
              return;
            }
            setIsPaymentMethodsDialogOpen(true);
          }}
          isLocked={!isPremium}
        />
        
        <NavCardItem
          title="Redes Sociais"
          description="Adicione links para Instagram, Facebook e outros."
          icon={Link} 
          onClick={() => handleNavigate(`/restaurant-area/settings/social-networks`, true)}
          isLocked={!isPremium}
        />
        
      </CardContent>
    </Card>
  );
};

export default ContentManagementSection;