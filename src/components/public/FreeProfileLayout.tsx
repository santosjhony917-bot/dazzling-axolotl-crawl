import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Clock, Phone, Lock, Menu, Utensils, ArrowLeft } from 'lucide-react';
import { Restaurant } from '@/types/supabase';
import { createPageUrl, PageUrl } from '@/utils/url';
import { formatSchedule } from '@/utils/schedule';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { showError } from '@/utils/toast';
import { cn } from '@/lib/utils';

interface FreeProfileLayoutProps {
  restaurant: Restaurant;
}

// Componente auxiliar para um item de informação (Localização, Horário, Telefone)
const InfoItem: React.FC<{ icon: React.ElementType, label: string, value: string | React.ReactNode, isLink?: boolean, linkHref?: string }> = ({ icon: Icon, label, value, isLink, linkHref }) => {
  const content = (
    <div className="flex items-start gap-3 text-gray-700 dark:text-gray-300">
      <Icon className="w-5 h-5 flex-shrink-0 mt-1 text-highlight" />
      <div className="flex flex-col text-base">
        <p className="text-gray-700 dark:text-gray-300 leading-snug">{label}</p>
        {typeof value === 'string' ? (
          <p className="text-gray-900 dark:text-white font-medium leading-snug">{value}</p>
        ) : (
          value
        )}
      </div>
    </div>
  );

  if (isLink && linkHref) {
    return (
      <a href={linkHref} className="hover:text-highlight transition-colors">
        {content}
      </a>
    );
  }
  return content;
};

// Componente auxiliar para um item de Ação/Recurso
const ActionItem: React.FC<{ icon: React.ElementType, label: string, actionText?: string, isLocked?: boolean, onClick: () => void }> = ({ icon: Icon, label, actionText, isLocked = false, onClick }) => (
  <div 
    className={cn(
      "p-4 flex justify-between items-center font-semibold transition-colors border-b border-gray-100 dark:border-gray-700 last:border-b-0",
      isLocked 
        ? "text-highlight/80 cursor-not-allowed" 
        : "text-primary dark:text-white cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-700"
    )}
    onClick={onClick}
  >
    <span className="flex items-center gap-3 text-base">
      <Icon className="w-5 h-5 text-highlight" /> {label}
    </span>
    {actionText && (
      <span className="text-sm text-gray-500 dark:text-gray-400 font-normal">{actionText}</span>
    )}
  </div>
);


export default function FreeProfileLayout({ restaurant }: FreeProfileLayoutProps) {
  const navigate = useNavigate();
  const formattedSchedule = formatSchedule(restaurant.opening_hours);

  const handleNavigate = (route: PageUrl) => {
    navigate(createPageUrl(route, { restaurantId: restaurant.id }));
  };
  
  const handleLockedFeature = (featureName: string) => {
    showError(`Recurso Premium: ${featureName}. Faça upgrade para desbloquear.`);
  };
  
  const fullAddress = restaurant.address && restaurant.number 
    ? `${restaurant.address}, ${restaurant.number} - ${restaurant.neighborhood}, ${restaurant.city} - ${restaurant.state}, ${restaurant.cep}`
    : `${restaurant.address || restaurant.city || 'Endereço não informado'}`;

  return (
    <div className="min-h-screen bg-white dark:bg-gray-900">
      
      <main className="max-w-md mx-auto pb-16">
        
        {/* Capa (Fundo Cinza) */}
        <div className="relative h-48 w-full overflow-hidden bg-gray-100 dark:bg-gray-800">
          {/* Logo do Restaurante (Placeholder) */}
          <div
            className="absolute -bottom-10 left-4 w-20 h-20 rounded-full border-4 border-white dark:border-gray-900 object-cover shadow-lg z-20 
                       bg-highlight flex items-center justify-center"
          >
            <Utensils className="w-10 h-10 text-white" />
          </div>
        </div>

        {/* Conteúdo Principal */}
        <div className="p-4 pt-14 space-y-6">
          
          {/* Nome e Categoria */}
          <div className="space-y-1">
            <h2 className="text-3xl font-bold text-primary dark:text-white">{restaurant.name}</h2>
            {restaurant.category && (
              <p className="text-base font-medium text-highlight dark:text-highlight-light">{restaurant.category}</p>
            )}
          </div>

          {/* Informações Essenciais */}
          <div className="space-y-4">
            
            {/* Localização */}
            <InfoItem 
              icon={MapPin} 
              label="Localização"
              value={fullAddress}
            />
            
            {/* Horário */}
            <InfoItem 
              icon={Clock} 
              label="Horário"
              value={
                <>
                  <span className={cn("font-medium", formattedSchedule.status.includes('Aberto') ? 'text-green-600' : 'text-red-600')}>
                    {formattedSchedule.status.split('.')[0]}
                  </span>
                  {formattedSchedule.nextOpenTime && (
                    <span className="block text-sm text-gray-500 dark:text-gray-400 font-normal">
                      {formattedSchedule.nextOpenTime}
                    </span>
                  )}
                </>
              }
            />

            {/* Telefone */}
            {restaurant.phone && (
              <InfoItem 
                icon={Phone} 
                label="Telefone"
                value={restaurant.phone}
                isLink
                linkHref={`tel:${restaurant.phone.replace(/\D/g, '')}`}
              />
            )}
          </div>

          <Separator className="dark:bg-gray-700" />

          {/* Ações e Recursos (Card) */}
          <div className="bg-white dark:bg-gray-800 rounded-xl overflow-hidden shadow-md border border-gray-100 dark:border-gray-700">
            
            {/* Cardápio Completo (Funcional para Free) */}
            <ActionItem
              icon={Menu}
              label="Cardápio Completo"
              actionText="Ver todos"
              onClick={() => handleNavigate('restaurantMenu')}
            />
            
            {/* Galeria de Fotos (Bloqueado) */}
            <ActionItem
              icon={Lock}
              label="Premium: Galeria de Fotos"
              isLocked={true}
              onClick={() => handleLockedFeature("Galeria de Fotos")}
            />
            
            {/* Links de Venda (Bloqueado) */}
            <ActionItem
              icon={Lock}
              label="Premium: Links de Venda"
              isLocked={true}
              onClick={() => handleLockedFeature("Links de Venda")}
            />
            
          </div>
          
        </div>
      </main>
    </div>
  );
}