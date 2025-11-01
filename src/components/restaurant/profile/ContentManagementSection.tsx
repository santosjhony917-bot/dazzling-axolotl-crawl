import React from 'react';
import { Card, CardHeader, CardTitle } from '@/components/ui/card';
import NavCardItem from '@/components/NavCardItem';
import { Utensils, Camera, Eye, CreditCard, Link } from 'lucide-react'; // Adicionado Link
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils/url';
import { showError } from '@/utils/toast';

interface ContentManagementSectionProps {
  navigate: ReturnType<typeof useNavigate>;
  isPremium: boolean;
  restaurantId: string; // Adicionado
  restaurantName: string; // Adicionado
  setIsPaymentMethodsDialogOpen: (open: boolean) => void;
  setIsSocialNetworksDialogOpen: (open: boolean) => void; // NOVO PROP
}

const ContentManagementSection: React.FC<ContentManagementSectionProps> = ({ navigate, isPremium, restaurantId, restaurantName, setIsPaymentMethodsDialogOpen, setIsSocialNetworksDialogOpen }) => {
  
  const handleNavigate = (path: string, isFeaturePremium: boolean) => {
    if (isFeaturePremium && !isPremium) {
      showError("Recurso Premium. Faça upgrade para desbloquear.");
      return;
    }
    navigate(path);
  };
  
  return (
    <div className="w-full space-y-3">
      <h2 className="text-xl font-bold text-[#022D68] px-1 mb-4">Gestão de Conteúdo</h2> {/* Título da Seção */}
      
      {/* NOVO: Ver Perfil Público */}
      <NavCardItem 
        title="Ver Perfil Público" 
        description={`Veja como ${restaurantName} aparece para os clientes.`}
        icon={Eye} 
        onClick={() => navigate(createPageUrl('restaurantProfile', { restaurantId: restaurantId }))}
        isPremium={isPremium}
      />
      
      <NavCardItem 
        title="Cardápio e Categorias" 
        description="Adicione, edite e organize pratos e categorias."
        icon={Utensils} 
        onClick={() => handleNavigate(createPageUrl('restaurantAreaMenu'), false)}
        isPremium={isPremium}
      />
      <NavCardItem 
        title="Galeria de Fotos" 
        description="Gerencie as imagens do seu restaurante."
        icon={Camera} 
        isPremiumFeature={true}
        isPremium={isPremium}
        onClick={() => handleNavigate(createPageUrl('restaurantAreaGallery'), true)}
        premiumDescription="Exclusivo Premium"
      />
      
      {/* Formas de Pagamento */}
      <NavCardItem 
        title="Formas de Pagamento" 
        description="Defina quais métodos de pagamento você aceita."
        icon={CreditCard} 
        onClick={() => setIsPaymentMethodsDialogOpen(true)}
        isPremium={isPremium}
      />
      
      {/* NOVO: Outras Redes */}
      <NavCardItem 
        title="Outras Redes" 
        description="Adicione links para Instagram, Facebook e site."
        icon={Link} 
        onClick={() => setIsSocialNetworksDialogOpen(true)}
        isPremium={isPremium}
      />
    </div>
  );
};

export default ContentManagementSection;