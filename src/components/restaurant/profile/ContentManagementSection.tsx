import React from 'react';
import { Eye, Utensils, Camera, CreditCard, Link as LinkIcon } from 'lucide-react'; // Renomeado Link para LinkIcon
import NavCardItem from '@/components/NavCardItem';
import { useNavigate, Link } from 'react-router-dom'; // Importa Link do react-router-dom
import { createPageUrl } from '@/utils/createPageUrl';
import { Restaurant } from '@/types';

interface ContentManagementSectionProps {
  restaurant: Restaurant;
  setIsPaymentMethodsDialogOpen: (isOpen: boolean) => void;
  setIsSocialNetworksDialogOpen: (isOpen: boolean) => void;
}

const ContentManagementSection: React.FC<ContentManagementSectionProps> = ({
  restaurant,
  setIsPaymentMethodsDialogOpen,
  setIsSocialNetworksDialogOpen,
}) => {
  const navigate = useNavigate();
  const { id: restaurantId, name: restaurantName, plan } = restaurant;
  const isPremium = plan === 'premium';

  const handleNavigate = (path: string, requiresPremium: boolean) => {
    if (requiresPremium && !isPremium) {
      // Implementar lógica para notificar o usuário sobre o recurso premium
      console.log('Recurso Premium! Faça upgrade para acessar.');
      // Poderíamos usar um toast aqui: toast.info('Este é um recurso Premium!');
    } else {
      navigate(path);
    }
  };

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-semibold text-gray-800 dark:text-white">Gerenciamento de Conteúdo</h2>

      <NavCardItem
        title="Ver Perfil Público"
        description={`Veja como ${restaurantName} aparece para os clientes.`}
        icon={<Eye className="w-6 h-6 text-primary" />}
        onClick={() => navigate(createPageUrl('restaurantProfile', { restaurantId: restaurantId }))}
        href={createPageUrl('restaurantProfile', { restaurantId: restaurantId })}
      />

      <NavCardItem
        title="Cardápio"
        description="Adicione, edite e organize pratos e categorias."
        icon={<Utensils className="w-6 h-6 text-primary" />}
        onClick={() => handleNavigate(createPageUrl('restaurant-area/menu'), false)}
        href={createPageUrl('restaurant-area/menu')}
      />

      <NavCardItem
        title="Galeria de Fotos"
        description="Gerencie as imagens do seu restaurante."
        icon={<Camera className="w-6 h-6 text-primary" />}
        isLocked={!isPremium}
        onClick={() => handleNavigate(createPageUrl('restaurant-area/gallery'), true)}
        href={createPageUrl('restaurant-area/gallery')}
      />

      <NavCardItem
        title="Métodos de Pagamento"
        description="Defina quais métodos de pagamento você aceita."
        icon={<CreditCard className="w-6 h-6 text-primary" />}
        onClick={() => setIsPaymentMethodsDialogOpen(true)}
        href="#"
      />

      <NavCardItem
        title="Redes Sociais"
        description="Adicione links para Instagram, Facebook e site."
        icon={<LinkIcon className="w-6 h-6 text-primary" />}
        onClick={() => setIsSocialNetworksDialogOpen(true)}
        href="#"
      />

      <NavCardItem
        title="Links Externos"
        description="Gerencie seus links de WhatsApp, iFood e site próprio."
        icon={<LinkIcon className="w-6 h-6 text-primary" />} // Reutilizando o ícone Link, ou podemos adicionar um novo se preferir
        isLocked={!isPremium} // Marcado como Premium, pois os links são Premium
        onClick={() => handleNavigate(createPageUrl('restaurant-area/external-links'), true)}
        href={createPageUrl('restaurant-area/external-links')}
      />
    </div>
  );
};

export default ContentManagementSection;